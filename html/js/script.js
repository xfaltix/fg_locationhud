(() => {
    const POS_KEY = 'locationHudPosition';
    const STYLE_KEY = 'locationHudStyle';

    const hud1 = document.querySelector('.location_container');
    const hud2 = document.getElementById('hud_style2');
    const panel = document.getElementById('style_panel');
    const seg = panel.querySelector('.seg');
    const segButtons = panel.querySelectorAll('.seg_btn');
    const doneButton = document.getElementById('style_done');

    const s1 = {
        direction: hud1.querySelector('.location_direction'),
        street: hud1.querySelector('.location_street'),
        postal: hud1.querySelector('.location_postal'),
        place: hud1.querySelector('.location_place')
    };

    const s2 = {
        place: hud2.querySelector('.ls2_place_text'),
        street: hud2.querySelector('.ls2_street'),
        postal: hud2.querySelector('.ls2_postal'),
        dir: hud2.querySelector('.ls2_dir'),
        arrow: hud2.querySelector('.ls2_arrow')
    };

    let currentStyle = 1;
    let vehicleVisible = false;
    let dragMode = false;
    let dragging = false;
    let dragTarget = null;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    let arrowAngle = 0;
    let hasWaypoint = false;
    let pillActive = false;
    let pillTimer = null;
    let lastStreet = '';
    const PILL_MS = 4000;

    function readStorage(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function writeStorage(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    }

    function removeStorage(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }

    function applyPosition(pos) {
        [hud1, hud2].forEach((el) => {
            if (pos) {
                el.style.position = 'absolute';
                el.style.top = pos.top;
                el.style.left = pos.left;
            } else {
                ['position', 'top', 'left', 'right', 'bottom'].forEach((p) => el.style.removeProperty(p));
            }
        });
    }

    function refresh(animate) {
        const show = vehicleVisible || dragMode;
        const showFirst = show && currentStyle === 1;

        hud1.style.display = showFirst ? 'block' : 'none';

        if (showFirst && animate) {
            hud1.classList.remove('enter');
            void hud1.offsetWidth;
            hud1.classList.add('enter');
        }

        hud2.classList.toggle('show', show && currentStyle === 2);
        hud2.classList.toggle('has_pill', pillActive || dragMode);
        hud2.classList.toggle('has_card', hasWaypoint || dragMode);
    }

    function flashPill() {
        pillActive = true;
        clearTimeout(pillTimer);
        pillTimer = setTimeout(() => {
            pillActive = false;
            refresh(false);
        }, PILL_MS);
        refresh(false);
    }

    function setStyle(value, persist) {
        const next = Number(value) === 2 ? 2 : 1;
        const changed = next !== currentStyle;

        currentStyle = next;
        seg.dataset.active = String(next);
        segButtons.forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.style) === next));

        if (persist) writeStorage(STYLE_KEY, String(next));

        refresh(changed);
    }

    function swapText(el, value) {
        const text = value == null ? '' : String(value).trim();
        if (!text || text.toUpperCase() === 'NULL' || el.textContent === text) return;

        el.textContent = text;
        el.animate(
            [
                { opacity: 0, transform: 'translateY(7px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 320, easing: 'cubic-bezier(0.2, 0.9, 0.25, 1)' }
        );
    }

    function setArrow(heading) {
        const target = -heading;
        const diff = ((((target - arrowAngle) % 360) + 540) % 360) - 180;
        arrowAngle += diff;
        s2.arrow.style.transform = `rotate(${arrowAngle}deg)`;
    }

    function enterDrag() {
        dragMode = true;
        document.body.classList.add('drag_mode');
        panel.classList.add('show');
        refresh(false);
    }

    function exitDrag() {
        dragMode = false;
        dragging = false;
        document.body.classList.remove('drag_mode');
        document.body.style.cursor = 'default';
        panel.classList.remove('show');
        refresh(false);
    }

    function finishDrag() {
        if (!dragMode) return;
        exitDrag();

        fetch(`https://${GetParentResourceName()}/closeUI`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({})
        }).catch(() => {});
    }

    [hud1, hud2].forEach((el) => {
        el.addEventListener('mousedown', (e) => {
            if (!dragMode) return;
            dragging = true;
            dragTarget = el;
            el.style.position = 'absolute';
            startX = e.clientX;
            startY = e.clientY;
            initialX = el.offsetLeft;
            initialY = el.offsetTop;
            e.preventDefault();
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging || !dragTarget) return;
        dragTarget.style.top = `${initialY + (e.clientY - startY)}px`;
        dragTarget.style.left = `${initialX + (e.clientX - startX)}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!dragging || !dragTarget) return;
        dragging = false;

        const pos = { top: dragTarget.style.top, left: dragTarget.style.left };
        dragTarget = null;
        writeStorage(POS_KEY, JSON.stringify(pos));
        applyPosition(pos);
    });

    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === 'Escape') && dragMode) finishDrag();
    });

    segButtons.forEach((btn) => {
        btn.addEventListener('click', () => setStyle(btn.dataset.style, true));
    });

    doneButton.addEventListener('click', finishDrag);

    window.addEventListener('message', (event) => {
        const data = event.data;

        if (data.type === 'toggleHud') {
            vehicleVisible = !!data.show;
            if (!vehicleVisible) {
                lastStreet = '';
                pillActive = false;
                clearTimeout(pillTimer);
            }
            refresh(false);
        }

        if (data.type === 'updateLocation') {
            s1.direction.textContent = data.direction;
            s1.street.textContent = data.street;
            s1.postal.textContent = data.postal;
            s1.place.textContent = data.place;

            swapText(s2.place, data.street);
            swapText(s2.street, data.place);
            swapText(s2.postal, data.postal);
            swapText(s2.dir, data.direction);

            if (typeof data.heading === 'number') setArrow(data.heading);

            const street = data.street || '';
            if (street && street !== lastStreet) {
                lastStreet = street;
                flashPill();
            }

            const waypoint = !!data.waypoint;
            if (waypoint !== hasWaypoint) {
                hasWaypoint = waypoint;
                refresh(false);
            }
        }

        if (data.action === 'enableDrag') {
            enterDrag();
            document.body.style.cursor = 'move';
        } else if (data.action === 'disableDrag') {
            exitDrag();
        } else if (data.action === 'resetHUD') {
            applyPosition(null);
            removeStorage(POS_KEY);
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        let savedPosition = null;
        try { savedPosition = JSON.parse(readStorage(POS_KEY)); } catch (e) {}
        if (savedPosition) applyPosition(savedPosition);

        const savedStyle = readStorage(STYLE_KEY);
        if (savedStyle) setStyle(savedStyle, false);

        fetch(`https://${GetParentResourceName()}/nuiReady`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({})
        })
            .then((res) => res.json())
            .then((res) => {
                if (!readStorage(STYLE_KEY) && res && res.defaultStyle) setStyle(res.defaultStyle, false);
            })
            .catch(() => {});
    });
})();
