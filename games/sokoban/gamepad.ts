/**
 * We want to treat the gamepad as a keyboard-like
 * event-emitter for the purposes of Sokoban.
 */

type GamepadKey = 'up' | 'down' | 'left' | 'right' | 'bl' | 'br' | 'bd';

export function makeGamepad() {
  let destroyed = false;
  const result = {
    onKeydown: undefined as undefined | ((k: GamepadKey) => void),
    destroy() {
      destroyed = true;
    },
  };
  const buttons: Partial<Record<GamepadKey, { date: number; delay: boolean }>> = {};

  function processButton(gamepad: Gamepad, index: number, key: GamepadKey) {
    if (!result.onKeydown) {
      return;
    }
    const prev = buttons[key];
    const pressed = gamepad.buttons[index].pressed;

    if (!pressed) {
      buttons[key] = undefined;
      return;
    }

    const now = Date.now();
    if (!prev || now - prev.date > (prev?.delay ? 175 : 100)) {
      buttons[key] = { date: now, delay: !prev };
      result.onKeydown(key);
    }
  }

  function tick() {
    const gamepad = navigator.getGamepads().find((x) => x?.connected);
    if (!destroyed) {
      window.requestAnimationFrame(tick);
    }
    if (!gamepad || !result.onKeydown) {
      return;
    }
    processButton(gamepad, 12, 'up');
    processButton(gamepad, 13, 'down');
    processButton(gamepad, 14, 'left');
    processButton(gamepad, 15, 'right');
    processButton(gamepad, 0, 'bd');
    processButton(gamepad, 2, 'bl');
    processButton(gamepad, 1, 'br');
    processButton(gamepad, 2, 'bl');
  }
  window.requestAnimationFrame(tick);

  return result;
}
