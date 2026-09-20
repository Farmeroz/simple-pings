import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesMouse, createHold, isEditing} from '../scripts/bindings.js';
import {normaliseMessage} from '../scripts/net.js';
import createGui from '../scripts/pings-gui.js';
import {registerSettings} from '../scripts/settings.js';

function clock() {
  let id = 0;
  const pending = new Map();
  return {schedule(fn) {pending.set(++id, fn); return id;}, unschedule(id) {pending.delete(id);},
    tick() {for (const [id, fn] of [...pending]) {pending.delete(id); fn();}}};
}
const down = {clientX: 30, clientY: 40, pointerId: 1, button: 0};
function holdFixture() {
  const time = clock(), fired = [];
  return {time, fired, hold: createHold({fire: s => fired.push(s), delay: () => 350, ...time})};
}
test('mouse bindings require exact modifiers and support disabled buttons', () => {
  assert.equal(matchesMouse({button: 0}, 0), true);
  assert.equal(matchesMouse({button: 0, shiftKey: true}, 0), false);
  assert.equal(matchesMouse({button: 0, shiftKey: true}, 0, 'Shift'), true);
  assert.equal(matchesMouse({button: 1, metaKey: true, altKey: true}, 1, 'Alt+Meta'), true);
  assert.equal(matchesMouse({button: -1}, -1), false);
});
test('stationary hold fires once', () => {
  const {hold, time, fired} = holdFixture(); hold.start(down, false); time.tick(); time.tick();
  assert.equal(fired.length, 1);
});
test('release after modifier changes cancels pending ping', () => {
  const {hold, time, fired} = holdFixture(); hold.start({...down, shiftKey: true}, true);
  hold.release({...down, shiftKey: false}); time.tick(); assert.equal(fired.length, 0);
});
test('drag away and return cannot trigger a ping', () => {
  const {hold, time, fired} = holdFixture(); hold.start(down, false);
  hold.move({...down, clientX: 45}); hold.move(down); time.tick(); assert.equal(fired.length, 0);
});
test('unrelated pointer release does not cancel a held mouse', () => {
  const {hold, time, fired} = holdFixture(); hold.start(down, false);
  hold.release({...down, pointerId: 2}); time.tick(); assert.equal(fired.length, 1);
});
test('cancel removes a pending hold', () => {
  const {hold, time, fired} = holdFixture(); hold.start(down, false); hold.cancel(); time.tick(); assert.equal(fired.length, 0);
});
const player = {id: 'player', color: 0x3388ff, name: 'Player', isGM: false, hasRole: role => role <= 1};
const gm = {id: 'gm', color: 0xff8833, name: 'GM', isGM: true, hasRole: () => true};
const game = {user: player, users: new Map([['player', player], ['gm', gm]]), settings: {get: () => 4}};
const board = {ready: true, scene: {id: 'scene'}, level: {id: 'level'}};
const packet = () => ({sceneId: 'scene', levelId: 'level', senderId: 'player', message: 'UserPing',
  pingData: {id: 'player', position: {x: 1, y: 2}, moveCanvas: false}});
test('network rejects other scenes, levels, and missing canvas', () => {
  assert.equal(normaliseMessage({...packet(), sceneId: 'other'}, board, game), null);
  assert.equal(normaliseMessage({...packet(), levelId: 'other'}, board, game), null);
  assert.equal(normaliseMessage(packet(), {...board, ready: false}, game), null);
});
test('network rejects malformed positions, unknown users, and arbitrary message types', () => {
  for (const position of [null, {x: Infinity, y: 0}, {x: NaN, y: 0}, {x: '0', y: 0}]) {
    const p = packet(); p.pingData.position = position; assert.equal(normaliseMessage(p, board, game), null);
  }
  assert.equal(normaliseMessage({...packet(), senderId: 'unknown'}, board, game), null);
  assert.equal(normaliseMessage({...packet(), message: '__proto__'}, board, game), null);
});
test('network applies role restrictions to user and text pulls', () => {
  const p = packet(); p.pingData.moveCanvas = true;
  assert.equal(normaliseMessage(p, board, game).pingData.moveCanvas, false);
  p.message = 'TextPing'; Object.assign(p.pingData, {text: 'Here', color: 0xffffff});
  assert.equal(normaliseMessage(p, board, game).pingData.moveCanvas, false);
  p.senderId = 'gm'; assert.equal(normaliseMessage(p, board, game).pingData.moveCanvas, true);
});
test('network validates text length, colour, and user impersonation', () => {
  const p = packet(); p.pingData.id = 'gm'; assert.equal(normaliseMessage(p, board, game), null);
  p.message = 'TextPing'; Object.assign(p.pingData, {text: 'x'.repeat(257), color: 0xffffff});
  assert.equal(normaliseMessage(p, board, game), null);
  p.pingData.text = 'Here'; p.pingData.color = -1; assert.equal(normaliseMessage(p, board, game), null);
});
function guiFixture() {
  const events = new Map(), hooks = new Map(), pings = [], emitted = [], pans = [];
  const view = {}, document = {activeElement: null, elementFromPoint: () => view};
  const win = {document, addEventListener: (n, fn) => events.set(n, fn), removeEventListener: n => events.delete(n)};
  const hookApi = {on: (n, fn) => {hooks.set(n, fn); return n;}, off: n => hooks.delete(n)};
  const c = {...board, app: {view}, controls: {pings: {addChild: p => pings.push(p)}, drawOffscreenPing: () => {}},
    canvasCoordinatesFromClient: p => ({x: (p.x - 10) / 2, y: (p.y - 20) / 2}),
    animatePan: p => pans.push(p), isOffscreen: () => false};
  const options = {showName: true, minMovePermission: 4, mouseButton: 0, mouseModifiers: '',
    mouseButtonMove: 0, mouseModifiersMove: 'Shift', mouseButtonDuration: 350, duration: 6};
  const gui = createGui(win, c, game, hookApi, options,
    (pos, id, text, color, options) => ({...pos, id, text, color, options, destroyed: false, destroy() {this.destroyed = true;}}),
    p => emitted.push(p));
  const hover = () => events.get('pointermove')({...down, target: view});
  return {gui, events, hooks, pings, emitted, pans, document, c, hover, view};
}
test('GUI keyboard ping converts client coordinates and retains name and colour', () => {
  const f = guiFixture(); f.hover(); assert.equal(f.gui.triggerPing(), true);
  assert.deepEqual(f.emitted[0].position, {x: 10, y: 10});
  assert.equal(f.pings[0].text, 'Player'); assert.equal(f.pings[0].color, 0x3388ff); f.gui.destroy();
});
test('GUI refuses keyboard pings over interface or while editing', () => {
  const f = guiFixture(); f.hover(); f.document.elementFromPoint = () => ({});
  assert.equal(f.gui.triggerPing(), false);
  f.document.elementFromPoint = () => f.view; f.document.activeElement = {closest: () => ({})};
  assert.equal(f.gui.triggerPing(), false); assert.equal(f.emitted.length, 0); f.gui.destroy();
});
test('GUI restricts player pulls and allows GM pull display', () => {
  const f = guiFixture(); f.hover(); assert.equal(f.gui.triggerPing(true), false);
  f.gui.displayUserPing({x: 5, y: 7}, 'player', true); assert.equal(f.pans.length, 0);
  f.gui.displayUserPing({x: 5, y: 7}, 'gm', true); assert.equal(f.pans.length, 1); f.gui.destroy();
});
test('repeated user ping destroys previous ping; remove finds owned pings', () => {
  const f = guiFixture(); f.gui.displayUserPing({x: 1, y: 1}, 'player');
  f.gui.displayUserPing({x: 2, y: 2}, 'player'); assert.equal(f.pings[0].destroyed, true);
  f.gui.removePing('player'); assert.equal(f.pings[1].destroyed, true); f.gui.destroy();
});
test('scene teardown cleans up graphics; scene redraw does not multiply listeners', () => {
  const f = guiFixture(); f.hover(); f.gui.triggerPing(); const count = f.events.size;
  f.hooks.get('canvasTearDown')(); assert.equal(f.pings[0].destroyed, true);
  assert.equal(f.gui.triggerPing(), false); f.hooks.get('canvasReady')();
  assert.equal(f.events.size, count); f.hover(); assert.equal(f.gui.triggerPing(), true);
  f.gui.destroy(); assert.equal(f.events.size, 0); assert.equal(f.hooks.size, 0);
});
test('settings use only native types; keyboard actions are native and suppress repeats', () => {
  globalThis.CONST = {KEYBINDING_PRECEDENCE: {NORMAL: 0}};
  const settings = new Map(), keys = new Map(), fired = [];
  const fakeGame = {settings: {register: (id, key, value) => settings.set(key, value), get: (id, key) => settings.get(key).default},
    keybindings: {register: (id, key, value) => keys.set(key, value)}};
  const options = registerSettings(fakeGame, move => {fired.push(move); return true;});
  assert.equal(options.mouseButtonDuration, 350); assert.equal(options.minMovePermission, 1);
  assert.ok([...settings.values()].every(s => [Number, String, Boolean].includes(s.type)));
  assert.equal(settings.get('minMovePermission').scope, 'world');
  keys.get('ping').onDown({event: {repeat: false}}); keys.get('pingMove').onDown({event: {repeat: false}});
  keys.get('ping').onDown({event: {repeat: true}}); assert.deepEqual(fired, [false, true]);
});
test('startup registers wrapper, socket, native controls, and macro API without Settings Extender', async () => {
  const once = new Map(), on = new Map(), registered = [], values = new Map(), modules = new Map([['simple-pings', {}]]);
  const saved = {};
  for (const key of ['Hooks','PIXI','game','canvas','window','CONFIG','libWrapper','ui']) saved[key] = globalThis[key];
  globalThis.PIXI = {Container: class {}};
  globalThis.Hooks = {once: (name, fn) => once.set(name, fn), on: (name, fn) => {on.set(name, fn); return name;}, off() {}, callAll() {}};
  globalThis.game = {modules, user: gm, users: game.users,
    settings: {register: (id, key, data) => values.set(key, data.default), get: (id, key) => values.get(key)},
    keybindings: {register() {}}, socket: {on: (name, fn) => registered.push([name, fn]), off() {}}};
  globalThis.canvas = {ready: true, scene: {id: 'scene'}, controls: {pings: {}}};
  globalThis.window = {addEventListener() {}, removeEventListener() {}, document: {}};
  globalThis.CONFIG = {};
  globalThis.ui = {notifications: {warn: message => assert.fail(message)}};
  let wrapper;
  globalThis.libWrapper = {register: (id, path, fn) => {wrapper = fn; assert.match(path, /ControlsLayer.prototype._onLongPress$/);}};
  try {
    await import('../scripts/main.js');
    once.get('init')(); once.get('setup')();
    assert.equal(wrapper(() => 'core'), 'core'); // Before our GUI is ready, core remains usable.
    once.get('ready')();
    assert.equal(registered[0][0], 'module.simple-pings');
    assert.equal(typeof modules.get('simple-pings').api.perform, 'function');
    assert.equal(wrapper(() => assert.fail('Duplicate core ping')), undefined);
    once.get('shutdown')();
  } finally {for (const [key, value] of Object.entries(saved)) globalThis[key] = value;}
});
