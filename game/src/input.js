// Input: keyboard state plus mouse clicks translated into canvas
// coordinates. The canvas is drawn at a fixed 1280 by 720, so a click on
// a scaled display maps back by the canvas bounding box.

export function createInput(canvas, onAction) {
  const input = {
    keys: new Set(),
    click: null,
    useSmoke: false,
    useEmp: false,
    useDecoy: false,
    useVent: false,
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(event.code);
    if (event.code === 'Digit1') input.useSmoke = true;
    if (event.code === 'Digit2') input.useEmp = true;
    if (event.code === 'Digit3') input.useDecoy = true;
    if (event.code === 'KeyE') input.useVent = true;
    if (onAction) onAction(event.code);
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    input.click = { x, y };
    if (onAction) onAction('click');
  });

  return input;
}
