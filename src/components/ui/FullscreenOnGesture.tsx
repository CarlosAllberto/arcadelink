"use client";

import { useEffect } from "react";

/** Navegadores só liberam tela cheia após um gesto, então entra no primeiro. Vale uma vez por página, para respeitar o Esc. */
export function FullscreenOnGesture() {
  useEffect(() => {
    function enter(event: Event) {
      if (event instanceof KeyboardEvent && event.key === "Escape") return;
      stop();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    }
    function stop() {
      window.removeEventListener("click", enter);
      window.removeEventListener("keydown", enter);
    }
    window.addEventListener("click", enter);
    window.addEventListener("keydown", enter);
    return stop;
  }, []);

  return null;
}
