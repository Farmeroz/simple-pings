# Simple Pings 0.1.0

Pings for Foundry Virtual Tabletop v14, based on Azzurite’s Pings.  Works with any game system, including GURPS 4e / GGA.

## Installation

In Foundry’s **Install Module** dialogue, paste this manifest URL:

```text
https://github.com/Farmeroz/simple-pings/releases/latest/download/module.json
```

Alternatively, install the release ZIP manually:

1. Shut down Foundry and extract the `simple-pings` folder into your Foundry user data folder’s `Data/modules/` directory.  The result should be `Data/modules/simple-pings/module.json`.
2. Start Foundry and open your world.
3. Enable **Simple Pings** and **libWrapper**.  Disable the original **Pings** module in that world.
4. Disable **Settings Extender** if no other enabled module needs it, then reload the world.

Simple Pings requires libWrapper, just as the original Pings does.  It neither requires nor loads Settings Extender.  If both Pings modules are enabled, Simple Pings stays inactive and asks you to disable the original.

## Using pings

- **Hold left mouse button for 350 ms:** ping the map.
- **Hold Shift + left mouse button:** ping and centre everyone’s view on that location, subject to the world’s minimum role setting.
- Release early or move the pointer more than five screen pixels to cancel the hold.
- Pings are shared with connected users viewing the same scene and level.
- An off-screen ping shows a directional indicator.

The default minimum role is **Player**, matching the original Pings.  A GM can change it to **Gamemaster**, **Assistant GM**, or **Trusted player** under Configure Settings → Simple Pings.

## Controls and appearance

**Configure Settings → Simple Pings** contains mouse buttons, modifier combinations, hold duration, names, image, size, duration, rotation, and pulsing.  Mouse buttons can be disabled.  Right and extra mouse buttons may also perform browser or Foundry actions; left and middle are the simplest choices.

**Configure Controls → Simple Pings** contains **Ping at pointer** and **Screen-moving ping at pointer**.  Keyboard shortcuts begin unassigned.  Hover over the map to use them; typing into chat and other text fields does not trigger these shortcuts.

Appearance and mouse settings are personal to each client, as in the original Pings.  The minimum role is a world setting.  An optional image replaces the original graphic and is tinted with the sender’s player colour.  Greyscale images work best.  Foundry’s photosensitive mode disables rotation and pulsing.

Simple Pings has its own settings.  Existing Pings preferences are left intact and are not automatically imported.  Re-enter any custom settings you want to keep.  To switch back, disable Simple Pings and re-enable Pings and its dependencies.

## Macros

The API is available at `game.modules.get('simple-pings').api` or `window.SimplePings` after world startup.  The original `window.Azzu.Pings` alias and `pingsReady` hook are retained, together with a new `simplePingsReady` hook.

```js
// Ping at scene coordinates for everyone on this scene and level.
const pings = game.modules.get('simple-pings').api;
pings.perform({x: 1000, y: 800});

// A labelled ping.  The final argument requests a screen move if permitted.
pings.performText({x: 1000, y: 800}, 'Look here', 0xffcc00, true);
```

`perform` / `performText` show locally and send to other clients; `show` / `showText` are local only; `send` / `sendText` are remote only.  Each returns an ID for `remove(id)`.  Text is limited to 256 characters.  Only a GM can use another user’s identity with the API.  Screen-moving requests respect the configured minimum role.

## Credits and licence

Based on **Pings 1.4.3** by **Azzurite**:
https://gitlab.com/foundry-azzurite/pings

The original renderer credits Mörill’s Pointer as its inspiration/adaptation.  This fork retains the original renderer and API structure and replaces the settings integration, input handling, startup, and network plumbing.  The modifications are dated 20 September 2026 and maintained under the Farmeroz name.

Distributed under **GNU LGPL version 3**.  See `LICENSE` for LGPL v3 and `COPYING` for GPL v3.  All runtime JavaScript is included in editable source form; no build or compilation is required.
