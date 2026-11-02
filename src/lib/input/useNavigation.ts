"use client";

import { useEffect, useRef } from "react";

export type NavAction = "left" | "right" | "up" | "down" | "l" | "r" | "y" | "a" | "b";

// A e B só no gamepad: no teclado, Enter e Esc já funcionam nos botões e no painel.
const KEYS: Record<string, NavAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  q: "l",
  e: "r",
  y: "y",
};

const REPEATING: NavAction[] = ["left", "right", "up", "down"];
const REPEAT_DELAY = 350;
const REPEAT_RATE = 160;

function readPad(pad: Gamepad): Record<NavAction, boolean> {
  const pressed = (index: number) => Boolean(pad.buttons[index]?.pressed);
  const [axisX = 0, axisY = 0] = pad.axes;
  return {
    left: pressed(14) || axisX < -0.5,
    right: pressed(15) || axisX > 0.5,
    up: pressed(12) || axisY < -0.5,
    down: pressed(13) || axisY > 0.5,
    l: pressed(4),
    r: pressed(5),
    y: pressed(3),
    a: pressed(0),
    b: pressed(1),
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
      if (!event.repeat || REPEATING.includes(action)) handler.current(action);
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
          } else if (now >= due && REPEATING.includes(action)) {
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
