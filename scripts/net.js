// Simple Pings, 2026-09-20. Scene/level scoped messages with bounded input.
import {ID} from './constants.js';
const SOCKET_NAME = `module.${ID}`;
const callbacks = new Map();
export const MESSAGES = {
  USER_PING: {name: 'UserPing'}, TEXT_PING: {name: 'TextPing'}, REMOVE_PING: {name: 'RemovePing'}
};
export function validPosition(position) {
  return position && Number.isFinite(position.x) && Number.isFinite(position.y)
    && Math.abs(position.x) <= 1e8 && Math.abs(position.y) <= 1e8;
}
export function normaliseMessage(data, board, game) {
  if (!board.ready || !board.scene || !data || data.sceneId !== board.scene.id
      || data.levelId !== (board.level?.id ?? null)) return null;
  const sender = game.users.get(data.senderId);
  const p = data.pingData;
  if (!sender || !p || typeof p.id !== 'string' || !p.id.length || p.id.length > 128) return null;
  if (!Object.values(MESSAGES).some(m => m.name === data.message)) return null;
  if (data.message === MESSAGES.REMOVE_PING.name) return {...data, pingData: {id: p.id}};
  if (!validPosition(p.position) || typeof p.moveCanvas !== 'boolean') return null;
  const result = {id: p.id, position: {x: p.position.x, y: p.position.y},
    moveCanvas: p.moveCanvas && sender.hasRole(game.settings.get(ID, 'minMovePermission'))};
  if (data.message === MESSAGES.USER_PING.name) {
    if (!game.users.get(p.id) || (p.id !== sender.id && !sender.isGM)) return null;
  } else {
    if (typeof p.text !== 'string' || p.text.length > 256 || !Number.isInteger(p.color)
        || p.color < 0 || p.color > 0xFFFFFF) return null;
    Object.assign(result, {text: p.text, color: p.color});
  }
  return {...data, pingData: result};
}
export function initNetwork() {
  const listener = data => {
    const message = normaliseMessage(data, canvas, game);
    if (message) for (const fn of callbacks.get(message.message) ?? []) fn(message.pingData);
  };
  game.socket.on(SOCKET_NAME, listener);
  return () => {game.socket.off(SOCKET_NAME, listener); callbacks.clear();};
}
export function onMessageReceived(message, fn) {
  if (!callbacks.has(message.name)) callbacks.set(message.name, []);
  callbacks.get(message.name).push(fn);
}
export function sendMessage(message, pingData) {
  const packet = {message: message.name, sceneId: canvas.scene?.id, levelId: canvas.level?.id ?? null,
    senderId: game.user.id, pingData};
  const checked = normaliseMessage(packet, canvas, game);
  if (!checked) throw new Error('Simple Pings: invalid ping or canvas not ready.');
  game.socket.emit(SOCKET_NAME, checked);
}
