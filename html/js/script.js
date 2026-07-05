window.addEventListener('message', function(event) {
    var data = event.data;

    if (data.type === "toggleHud") {
        document.querySelector(".location_container").style.display = data.show ? "block" : "none";
    }

    if (data.type === "updateLocation") {
        document.querySelector(".location_direction").textContent = data.direction;
        document.querySelector(".location_street").textContent = data.street;
        document.querySelector(".location_postal").textContent = data.postal; // Korrekte PLZ
        document.querySelector(".location_place").textContent = data.place; // Vollständiger Ortsname
    }
});



document.addEventListener('DOMContentLoaded', () => {
    const locationHud = document.querySelector('.location_container'); // Das Location-HUD
    let isDragging = false;
    let isDragModeEnabled = false;
    let startX, startY, initialX, initialY;

    // Gespeicherte Position laden
    const savedPosition = JSON.parse(localStorage.getItem('locationHudPosition'));
    if (savedPosition) {
        locationHud.style.top = savedPosition.top;
        locationHud.style.left = savedPosition.left;
        locationHud.style.position = 'absolute';
    }

    // Drag starten
    locationHud.addEventListener('mousedown', (e) => {
        if (isDragModeEnabled) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = locationHud.offsetLeft;
            initialY = locationHud.offsetTop;
            e.preventDefault();
        }
    });

    // Mausbewegung verfolgen
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            locationHud.style.top = `${initialY + dy}px`;
            locationHud.style.left = `${initialX + dx}px`;
        }
    });

    // Drag beenden und Position speichern
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            localStorage.setItem('locationHudPosition', JSON.stringify({
                top: locationHud.style.top,
                left: locationHud.style.left
            }));
        }
    });

    // Nachrichten von Lua empfangen
    window.addEventListener('message', (event) => {
        const data = event.data;

        if (data.type === "toggleHud") {
            locationHud.style.display = data.show ? "block" : "none";
        }

        if (data.type === "updateLocation") {
            document.querySelector(".location_direction").textContent = data.direction;
            document.querySelector(".location_street").textContent = data.street;
            document.querySelector(".location_postal").textContent = data.postal;
            document.querySelector(".location_place").textContent = data.place;
        }

        if (data.action === 'enableDrag') {
            isDragModeEnabled = true;
            document.body.style.cursor = 'move';
        } else if (data.action === 'disableDrag') {
            isDragModeEnabled = false;
            document.body.style.cursor = 'default';
        } else if (data.action === 'resetHUD') {
            locationHud.style.top = '42vw';
            locationHud.style.left = '1vw';
            locationHud.style.right = 'unset';
            locationHud.style.bottom = 'unset';

            localStorage.removeItem('locationHudPosition');
        }
    });

    // Enter drücken, um den Drag-Modus zu beenden
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && isDragModeEnabled) {
            isDragModeEnabled = false;
            document.body.style.cursor = 'default';

            fetch(`https://${GetParentResourceName()}/closeUI`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8'
                },
                body: JSON.stringify({})
            }).then(() => {
                console.log('Location-HUD Position gespeichert');
                window.postMessage({ action: 'disableDrag' }, '*');
            }).catch(err => {
                console.error('Fehler beim Schließen der NUI:', err);
            });
        }
    });
});
