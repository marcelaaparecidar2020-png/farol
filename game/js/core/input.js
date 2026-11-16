// Keyboard and mouse input mapped into the game's 1280x720 logical space.

const BLOCKED_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function createInput(canvas, toLogical) {
  const pointer = { x: 640, y: 260, down: false, rightDown: false };
  const held = new Set();
  const pressed = new Set();
  let leftClicks = 0;
  let rightClicks = 0;

  const track = (e) => {
    const p = toLogical(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
  };

  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerdown', (e) => {
    track(e);
    canvas.focus();
    if (e.button === 0) {
      pointer.down = true;
      leftClicks++;
    } else if (e.button === 2) {
      pointer.rightDown = true;
      rightClicks++;
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button === 0) pointer.down = false;
    if (e.button === 2) pointer.rightDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => {
    held.clear();
    pointer.down = false;
    pointer.rightDown = false;
  });

  return {
    pointer,
    isHeld: (code) => held.has(code),
    wasPressed: (...codes) => codes.some((c) => pressed.has(c)),
    get leftClicked() {
      return leftClicks > 0;
    },
    get rightClicked() {
      return rightClicks > 0;
    },
    /** Called once per rendered frame after all systems have read this frame's input. */
    endFrame() {
      pressed.clear();
      leftClicks = 0;
      rightClicks = 0;
    },
  };
}
