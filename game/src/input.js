// Input: held keys for movement, edge-triggered actions for the tools and
// the screens, and click-to-walk. Mouse coordinates are converted into the
// 1280x720 field, whatever size the canvas is on screen.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_SMOKE = 'smoke';
export const ACTION_EMP = 'emp';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
  Digit1: ACTION_SMOKE,
  Numpad1: ACTION_SMOKE,
  Digit2: ACTION_EMP,
  Numpad2: ACTION_EMP,
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const state = {
    left: false,
    right: false,
    up: false,
    down: false,
    sneak: false,
    moveTarget: null,
  };

  function syncHeld() {
    state.left = held.has('KeyA') || held.has('ArrowLeft');
    state.right = held.has('KeyD') || held.has('ArrowRight');
    state.up = held.has('KeyW') || held.has('ArrowUp');
    state.down = held.has('KeyS') || held.has('ArrowDown');
    state.sneak = held.has('ShiftLeft') || held.has('ShiftRight');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      held.add(event.code);
      const action = KEY_ACTIONS[event.code];
      if (action) pressed.add(action);
    }
    syncHeld();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
    syncHeld();
  });
  window.addEventListener('blur', () => {
    held.clear();
    syncHeld();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    state.moveTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });

  return {
    /** The held keys, read every frame. */
    read() {
      return state;
    },
    /** The edge-triggered actions since the last call; each is reported once. */
    consumeActions() {
      const actions = {
        confirm: pressed.has(ACTION_CONFIRM),
        pause: pressed.has(ACTION_PAUSE),
        restart: pressed.has(ACTION_RESTART),
        mute: pressed.has(ACTION_MUTE),
        smoke: pressed.has(ACTION_SMOKE),
        emp: pressed.has(ACTION_EMP),
      };
      pressed.clear();
      return actions;
    },
    /** Clear a stale click-to-walk target (for example when a key is pressed). */
    clearMoveTarget() {
      state.moveTarget = null;
    },
  };
}
