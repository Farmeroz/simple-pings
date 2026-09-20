// Derived from Azzurite's Pings (LGPL-3.0). Input and lifecycle replaced 2026-09-20.
import {matchesMouse, isCanvasTarget, isEditing, createHold} from './bindings.js';

export default function createPingsGui(win, board, game, hooks, options, createPing, userPingedCallback) {
  let active = Boolean(board.ready);
  let pointer = null;
  const owned = new Set();
  const controls = () => board.controls ?? board.getLayerByEmbeddedName?.('Controls');
  const view = () => board.app?.view ?? board.app?.canvas;
  const ready = () => active && board.ready && board.scene && controls()?.pings;
  const canMove = user => Boolean(user?.hasRole(options.minMovePermission));
  function point() {
    if (!pointer) return null;
    return board.canvasCoordinatesFromClient({x: pointer.clientX, y: pointer.clientY});
  }
  function overCanvas() {
    if (!pointer) return false;
    return isCanvasTarget(win.document.elementFromPoint(pointer.clientX, pointer.clientY), view());
  }
  function triggerPing(moveCanvas = false) {
    if (!ready() || !overCanvas() || isEditing(win.document.activeElement)) return false;
    if (moveCanvas && !canMove(game.user)) return false;
    const position = point();
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return false;
    displayUserPing(position, game.user.id, moveCanvas);
    userPingedCallback({position, id: game.user.id, moveCanvas});
    return true;
  }
  const hold = createHold({
    delay: () => Math.max(100, Math.min(2000, options.mouseButtonDuration)),
    fire: state => triggerPing(state.move)
  });
  function onDown(event) {
    if (!ready() || !isCanvasTarget(event.target, view()) || event.pointerType === 'touch') return;
    pointer = event;
    const move = matchesMouse(event, options.mouseButtonMove, options.mouseModifiersMove);
    const normal = matchesMouse(event, options.mouseButton, options.mouseModifiers);
    if (!move && !normal) return;
    if (move && !canMove(game.user)) return;
    hold.start(event, move);
  }
  function onMove(event) {
    pointer = event;
    hold.move(event);
    if (!isCanvasTarget(event.target, view())) hold.cancel();
  }
  const listeners = [
    ['pointerdown', onDown], ['pointermove', onMove], ['pointerup', event => hold.release(event)],
    ['pointercancel', () => hold.cancel()], ['blur', () => {hold.cancel(); pointer = null;}],
    ['dragstart', () => hold.cancel()], ['pointerout', event => {if (!event.relatedTarget) {hold.cancel(); pointer = null;}}]
  ];
  for (const [name, fn] of listeners) win.addEventListener(name, fn, true);
  const tearDown = () => {active = false; hold.cancel(); pointer = null; clear();};
  const hookIds = [
    ['canvasTearDown', hooks.on('canvasTearDown', tearDown)],
    ['canvasReady', hooks.on('canvasReady', () => {active = true;})]
  ];
  function displayPing(ping, moveCanvas) {
    for (const old of owned) if (old.destroyed) owned.delete(old);
    if (owned.size >= 50) {const oldest = owned.values().next().value; oldest.destroy(); owned.delete(oldest);}
    owned.add(ping);
    controls().pings.addChild(ping);
    const pos = {x: ping.x, y: ping.y};
    if (moveCanvas) void board.animatePan(pos);
    else if (board.isOffscreen(pos)) void controls().drawOffscreenPing(pos, {
      style: 'arrow', color: ping.color, duration: ping.options.duration * 1000
    });
  }
  function displayUserPing(position, senderId, moveCanvas = false) {
    const user = game.users.get(senderId);
    if (!ready() || !user) return;
    removePing(senderId);
    const ping = createPing(position, senderId, options.showName ? user.name : undefined, Number(user.color), {...options});
    displayPing(ping, moveCanvas && canMove(user));
  }
  function displayTextPing(position, id, text, color, moveCanvas = false) {
    if (!ready()) return;
    removePing(id);
    displayPing(createPing(position, id, text, color, {...options}), moveCanvas);
  }
  function removePing(id) {
    for (const ping of owned) {
      if (ping.id !== id && !ping.destroyed) continue;
      if (!ping.destroyed) ping.destroy();
      owned.delete(ping);
    }
  }
  function clear() {
    for (const ping of owned) if (!ping.destroyed) ping.destroy();
    owned.clear();
  }
  return {
    triggerPing, displayUserPing, displayTextPing, removePing, clear,
    destroy() {
      tearDown();
      for (const [name, fn] of listeners) win.removeEventListener(name, fn, true);
      for (const [name, id] of hookIds) hooks.off(name, id);
    }
  };
}
