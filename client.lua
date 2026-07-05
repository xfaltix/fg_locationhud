if Config.Framework == 'esxnew' then
    ESX = exports['es_extended']:getSharedObject()
elseif Config.Framework == 'esx' then
    TriggerEvent('esx:getSharedObject', function(obj) 
        ESX = obj 
    end)
end


local isHudVisible = false
local postalCode = "N/A"

-- Fängt die PLZ von nearest-postal ab
RegisterNetEvent('nearest_postal_hud')
AddEventHandler('nearest_postal_hud', function(postal)
    postalCode = postal -- Speichert die PLZ
end)

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(1000) -- Überprüfung alle Sekunde

        local playerPed = PlayerPedId()
        local inVehicle = IsPedInAnyVehicle(playerPed, false)

        if inVehicle and not isHudVisible then
            isHudVisible = true
            SendNUIMessage({ type = "toggleHud", show = true })
        elseif not inVehicle and isHudVisible then
            isHudVisible = false
            SendNUIMessage({ type = "toggleHud", show = false })
        end

        if inVehicle then
            local coords = GetEntityCoords(playerPed)
            local heading = GetEntityHeading(playerPed)
            local street, crossing = GetStreetNameAtCoord(coords.x, coords.y, coords.z)
            local streetName = GetStreetNameFromHashKey(street)
            
            -- 🏠 Holt den vollständigen Ortsnamen
            local zone = GetNameOfZone(coords.x, coords.y, coords.z)
            local placeName = GetLabelText(zone)

            -- 📤 Senden der Daten an NUI
            SendNUIMessage({
                type = "updateLocation",
                direction = GetDirection(heading),
                street = streetName,
                postal = postalCode, -- Holt die PLZ vom Event
                place = placeName
            })
        end
    end
end)

function GetDirection(heading)
    local directions = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"}
    local index = math.floor((heading + 22.5) / 45.0) + 1
    return directions[index] or "N"
end


RegisterCommand(Config.HudMoveCommand, function()
    SendNUIMessage({ action = "enableDrag" })
    SetNuiFocus(true, true)
end, false)

RegisterCommand(Config.HudStopMoveCommand, function()
    SendNUIMessage({ action = "disableDrag" })
    SetNuiFocus(false, false)
end, false)

RegisterCommand(Config.HudResetCommand, function()
    SendNUIMessage({ action = "resetHUD" })
end, false)


TriggerEvent('chat:addSuggestion', '/'..Config.HudMoveCommand, 'Verschiebt das HUD an die gewünschte Position')
TriggerEvent('chat:addSuggestion', '/'..Config.HudStopMoveCommand, 'Bricht das Verschieben der HUD ab')
TriggerEvent('chat:addSuggestion', '/'..Config.HudResetCommand, 'Setzte die Position von dem HUD Auf normaleinstellungen Zurück')


local rawPostalData = LoadResourceFile(GetCurrentResourceName(), GetResourceMetadata(GetCurrentResourceName(), 'postal_file'))
local postalList = json.decode(rawPostalData)

local closestPostal = nil
local postalBlip = nil

Citizen.CreateThread(function()
    while true do
        local xPos, yPos = table.unpack(GetEntityCoords(GetPlayerPed(-1)))

        local closestDistance = -1
        local closestIndex = -1
        for i, postal in ipairs(postalList) do
            local distance = (xPos - postal.x) ^ 2 + (yPos - postal.y) ^ 2
            if closestDistance == -1 or distance < closestDistance then
                closestIndex = i
                closestDistance = distance
            end
        end

        if closestIndex ~= -1 then
            local distance = math.sqrt(closestDistance)
            closestPostal = {i = closestIndex, d = distance}
        end

        if postalBlip then
            local blipCoords = {x = postalBlip.p.x, y = postalBlip.p.y}
            local distance = (blipCoords.x - xPos) ^ 2 + (blipCoords.y - yPos) ^ 2
            if distance < Config.blip.distToDelete ^ 2 then
                RemoveBlip(postalBlip.hndl)
                postalBlip = nil
            end
        end

        Wait(100)
    end
end)

Citizen.CreateThread(function()
    while true do
        if closestPostal and not IsHudHidden() then
            local postalText = Config.text.format:format(postalList[closestPostal.i].code, closestPostal.d)
            Citizen.Wait(100)
            TriggerEvent('nearest_postal_hud', postalText)
        end
        Wait(0)
    end
end)

RegisterCommand('p', function(source, args, rawCommand)
    if #args < 1 then
        if postalBlip then
            RemoveBlip(postalBlip.hndl)
            postalBlip = nil
            TriggerEvent('chat:addMessage', {
                color = {255, 0, 0},
                args = {'Postals', Config.blip.deleteText}
            })
        end
        return
    end

    local postalCode = string.upper(args[1])
    local foundPostal = nil
    for _, postal in ipairs(postalList) do
        if string.upper(postal.code) == postalCode then
            foundPostal = postal
            break
        end
    end

    if foundPostal then
        if postalBlip then
            RemoveBlip(postalBlip.hndl)
        end
        postalBlip = {hndl = AddBlipForCoord(foundPostal.x, foundPostal.y, 0.0), p = foundPostal}
        SetBlipRoute(postalBlip.hndl, true)
        SetBlipSprite(postalBlip.hndl, Config.blip.sprite)
        SetBlipColour(postalBlip.hndl, Config.blip.color)
        SetBlipRouteColour(postalBlip.hndl, Config.blip.color)
        BeginTextCommandSetBlipName('STRING')
        AddTextComponentSubstringPlayerName(Config.blip.blipText:format(postalBlip.p.code))
        EndTextCommandSetBlipName(postalBlip.hndl)

        TriggerEvent('chat:addMessage', {
            color = {255, 0, 0},
            args = {'Postals', Config.blip.drawRouteText:format(foundPostal.code)}
        })
    else
        TriggerEvent('chat:addMessage', {
            color = {255, 0, 0},
            args = {'Postals', Config.blip.notExistText}
        })
    end
end)
