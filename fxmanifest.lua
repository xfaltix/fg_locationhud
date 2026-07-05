fx_version 'cerulean'
game 'gta5'

author 'Faltix'
description 'Location HUD'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/main.css',
    'html/images/*.png',
    'html/js/script.js'
}

client_scripts {
    'client.lua'
}

shared_scripts {
	'config.lua'
}
local postalFile = 'postals.json'
file(postalFile)
postal_file(postalFile)