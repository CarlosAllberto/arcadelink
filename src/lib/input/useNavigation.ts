"use client";

import { useEffect, useRef } from "react";

export type NavAction = "left" | "right" | "l" | "r" | "y";

const KEYS: Record<string, NavAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  q: "l",
  e: "r",
  y: "y",
};

const REPEAT_DELAY = 350;
const REPEAT_RATE = 160;

function readPad(pad: Gamepad): Record<NavAction, boolean> {
  const pressed = (index: number) => Boolean(pad.buttons[index]?.pressed);
  const axis = pad.axes[0] ?? 0;
  return {
    left: pressed(14) || axis < -0.5,
    right: pressed(15) || axis > 0.5,
    l: pressed(4),
    r: pressed(5),
    y: pressed(3),
  };
}

/** Teclado e gamepad disparam as mesmas ações. */
export function useNavigation(onAction: (action: NavAction) => void) {
  const handler = useRef(onAction);
  useEffect(() => {
    handler.current = onAction;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const action = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      if (!event.repeat || action === "left" || action === "right") handler.current(action);
    }

    const nextFire = new Map<string, number>();
    let frame = 0;
    function poll(now: number) {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue;
        const state = readPad(pad);
        for (const action of Object.keys(state) as NavAction[]) {
          const key = `${pad.index}:${action}`;
          const due = nextFire.get(key);
          if (!state[action]) {
            nextFire.delete(key);
          } else if (due === undefined) {
            handler.current(action);
            nextFire.set(key, now + REPEAT_DELAY);
          } else if (now >= due && (action === "left" || action === "right")) {
            handler.current(action);
            nextFire.set(key, now + REPEAT_RATE);
          }
        }
      }
      frame = requestAnimationFrame(poll);
    }

    window.addEventListener("keydown", onKeyDown);
    frame = requestAnimationFrame(poll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
    };
  }, []);
}
