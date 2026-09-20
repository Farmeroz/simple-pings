// Simple Pings, 2026-09-20. Independent replacement for Settings Extender bindings.
export function matchesMouse(event, button, modifiers = '') {
  if (button < 0 || event.button !== button) return false;
  const keys = new Set(modifiers.split('+'));
  return Boolean(event.shiftKey) === keys.has('Shift')
    && Boolean(event.ctrlKey) === keys.has('Control')
    && Boolean(event.altKey) === keys.has('Alt')
    && Boolean(event.metaKey) === keys.has('Meta');
}

export function isCanvasTarget(target, view) {
  return Boolean(target && view && (target === view || view.contains?.(target)));
}

export function isEditing(target) {
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'));
}

// Cancels permanently on dragging, even if the pointer subsequently returns to its start.
export function createHold({fire, delay, schedule = setTimeout, unschedule = clearTimeout}) {
  let pending = null;
  function cancel() {
    if (pending) unschedule(pending.timer);
    pending = null;
  }
  return {
    start(event, move) {
      cancel();
      const state = {x: event.clientX, y: event.clientY, button: event.button, pointerId: event.pointerId, move};
      pending = state;
      state.timer = schedule(() => {
        if (pending !== state) return;
        pending = null;
        fire(state);
      }, delay());
    },
    move(event) {
      if (!pending || event.pointerId !== pending.pointerId) return;
      if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 5) cancel();
    },
    release(event) {
      if (pending && event.pointerId === pending.pointerId && event.button === pending.button) cancel();
    },
    cancel
  };
}
