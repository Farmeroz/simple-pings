// Simple Pings, 2026-09-20. Based on Pings by Azzurite; LGPL-3.0.
import {ID} from './constants.js';
import {registerSettings} from './settings.js';
import {initNetwork, MESSAGES, onMessageReceived, sendMessage} from './net.js';
import {initApi} from './api.js';
import createPingsGui from './pings-gui.js';
import Ping from './ping.js';
let gui;
let settings;
let blocked = false;
let restoreNetwork;
let wrapped = false;

Hooks.once('init', () => {
  settings = registerSettings(game, move => gui?.triggerPing(move) ?? false);
});
Hooks.once('setup', () => {
  blocked = Boolean(game.modules.get('pings')?.active);
  if (blocked) return;
  // Keep the original module's supported wrapper approach; do not modify core keybindings.
  try {
    libWrapper.register(ID, 'foundry.canvas.layers.ControlsLayer.prototype._onLongPress',
      function (wrappedMethod, ...args) {
        if (gui && canvas.ready) return;
        return wrappedMethod(...args);
      }, 'MIXED');
    wrapped = true;
  } catch (error) {
    blocked = true;
    console.error('Simple Pings: could not register native-ping integration.', error);
  }
});
Hooks.once('ready', () => {
  if (blocked || !wrapped) {
    ui.notifications.warn(game.modules.get('pings')?.active
      ? 'Simple Pings: disable the original Pings module and reload to use Simple Pings.'
      : 'Simple Pings could not start. Check that libWrapper is enabled, then reload.');
    return;
  }
  gui = createPingsGui(window, canvas, game, Hooks, settings,
    (...args) => new Ping(canvas, CONFIG, ...args),
    data => sendMessage(MESSAGES.USER_PING, data));
  onMessageReceived(MESSAGES.USER_PING, ({position, id, moveCanvas}) => gui.displayUserPing(position, id, moveCanvas));
  onMessageReceived(MESSAGES.TEXT_PING, ({position, id, text, color, moveCanvas}) => gui.displayTextPing(position, id, text, color, moveCanvas));
  onMessageReceived(MESSAGES.REMOVE_PING, ({id}) => gui.removePing(id));
  restoreNetwork = initNetwork();
  const api = initApi(gui);
  game.modules.get(ID).api = api;
  Hooks.callAll('simplePingsReady', api);
  Hooks.callAll('pingsReady', api);
});
Hooks.once('shutdown', () => {gui?.destroy(); restoreNetwork?.();});
