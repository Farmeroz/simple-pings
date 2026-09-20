// Simple Pings, 2026-09-20. Native settings and keyboard shortcuts.
import {ID} from './constants.js';

export function registerSettings(game, trigger) {
  const options = {};
  function setting(key, name, hint, type, value, extra = {}) {
    game.settings.register(ID, key, {name, hint, scope: 'client', config: true, type, default: value, ...extra});
    Object.defineProperty(options, key, {enumerable: true, get: () => game.settings.get(ID, key)});
  }
  setting('minMovePermission', 'Minimum role for screen-moving pings', 'Who may centre everyone’s view on a ping. Applies to this world.', Number, 1,
    {scope: 'world', choices: {1: 'Player', 2: 'Trusted player', 3: 'Assistant GM', 4: 'Gamemaster'}});
  const buttons = {'-1': 'Disabled', 0: 'Left', 1: 'Middle', 2: 'Right', 3: 'Mouse 4', 4: 'Mouse 5'};
  const modifiers = {};
  for (let mask = 0; mask < 16; mask++) {
    const names = ['Shift', 'Control', 'Alt', 'Meta'].filter((_, i) => mask & (1 << i));
    modifiers[names.join('+')] = names.join(' + ') || 'None';
  }
  setting('mouseButton', 'Ping: mouse button', 'Hold this button on the map to ping. Ordinary clicks and dragging continue to work.', Number, 0, {choices: buttons});
  setting('mouseModifiers', 'Ping: modifier keys', 'Hold these keys together with the mouse button. Meta is Command on macOS.', String, '', {choices: modifiers});
  setting('mouseButtonMove', 'Screen-moving ping: mouse button', 'Uses the world’s minimum role setting. Choose Disabled to use keyboard shortcuts only.', Number, 0, {choices: buttons});
  setting('mouseModifiersMove', 'Screen-moving ping: modifier keys', 'Screen-moving pings take priority if both mouse bindings are identical.', String, 'Shift', {choices: modifiers});
  setting('mouseButtonDuration', 'Mouse hold duration (ms)', 'Release or drag before this time to cancel the ping.', Number, 350, {range: {min: 100, max: 2000, step: 50}});
  setting('showName', 'Show player name', 'Display the sender’s name beneath their ping.', Boolean, true);
  setting('image', 'Ping image', 'Optional image path. Leave blank for the original Pings graphic. Greyscale images work best with player-colour tinting.', String, '', {filePicker: 'image'});
  setting('scale', 'Ping size (grid cells)', 'Size relative to the scene’s grid spacing.', Number, 1, {range: {min: 0.25, max: 5, step: 0.25}});
  setting('duration', 'Display duration (seconds)', 'Time at full size, plus a short entrance and exit animation.', Number, 6, {range: {min: 0.5, max: 30, step: 0.5}});
  setting('rotate', 'Rotate ping', 'Rotate the ping graphic, keeping its label upright.', Boolean, true);
  setting('rotateSpeed', 'Rotation period (seconds)', 'Time for one full turn. Smaller values rotate faster.', Number, 6, {range: {min: 0.5, max: 20, step: 0.5}});
  setting('sizeChange', 'Pulse ping size', 'Gently enlarge and shrink the graphic while it is displayed.', Boolean, true);
  setting('sizeChangeAmount', 'Pulse amount', 'Fraction of the base size added and removed during the pulse.', Number, 0.125, {range: {min: 0, max: 0.5, step: 0.025}});
  setting('sizeChangeSpeed', 'Pulse period (seconds)', 'Time for one complete pulse.', Number, 3, {range: {min: 0.5, max: 10, step: 0.5}});
  for (const [action, name, move] of [['ping', 'Ping at pointer', false], ['pingMove', 'Screen-moving ping at pointer', true]]) {
    game.keybindings.register(ID, action, {
      name, hint: 'Hover over the map and press this shortcut. Configure mouse controls in Module Settings.',
      editable: [], onDown: context => context.event?.repeat ? false : trigger(move),
      precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
    });
  }
  return options;
}
