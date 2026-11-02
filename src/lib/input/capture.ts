const PAD_LABELS: Record<number, string> = {
  0: "BUTTON_1",
  1: "BUTTON_2",
  2: "BUTTON_3",
  3: "BUTTON_4",
  4: "LEFT_TOP_SHOULDER",
  5: "RIGHT_TOP_SHOULDER",
  6: "LEFT_BOTTOM_SHOULDER",
  7: "RIGHT_BOTTOM_SHOULDER",
  8: "SELECT",
  9: "START",
  10: "LEFT_STICK",
  11: "RIGHT_STICK",
  12: "DPAD_UP",
  13: "DPAD_DOWN",
  14: "DPAD_LEFT",
  15: "DPAD_RIGHT",
};
const TIMEOUT = 8000;

let capturing = false;

/** Enquanto captura, a navegação ignora a entrada. */
export function isCapturing() {
  return capturing;
}

/** Próxima tecla pressionada. Esc cancela. */
export function captureKey() {
  capturing = true;
  return new Promise<{ keyCode: number; key: string } | null>((resolve) => {
    function finish(result: { keyCode: number; key: string } | null) {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey, true);
      capturing = false;
      resolve(result);
    }
    function onKey(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();
      finish(event.key === "Escape" ? null : { keyCode: event.keyCode, key: event.key.toLowerCase() });
    }
    const timer = setTimeout(() => finish(null), TIMEOUT);
    window.addEventListener("keydown", onKey, true);
  });
}

function pressedButton() {
  for (const pad of navigator.getGamepads()) {
    const index = pad?.buttons.findIndex((button) => button.pressed) ?? -1;
    if (index >= 0) return index;
  }
  return -1;
}

/** Próximo botão do gamepad. Espera soltar o botão que abriu a captura e o que foi escolhido. */
export function capturePad() {
  capturing = true;
  const deadline = performance.now() + TIMEOUT;
  let armed = false;
  let chosen: number | null = null;
  return new Promise<string | null>((resolve) => {
    function poll(now: number) {
      const pressed = pressedButton();
      if (chosen === null) {
        if (pressed < 0) armed = true;
        else if (armed) chosen = pressed;
      }
      const released = chosen !== null && pressed < 0;
      if (released || now > deadline) {
        capturing = false;
        return resolve(chosen === null ? null : (PAD_LABELS[chosen] ?? null));
      }
      requestAnimationFrame(poll);
    }
    requestAnimationFrame(poll);
  });
}
