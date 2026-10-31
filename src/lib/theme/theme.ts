export type Theme = "system" | "light" | "dark";

export const THEME_KEY = "arcadelink:theme";
const THEMES: Theme[] = ["system", "light", "dark"];
const listeners = new Set<() => void>();

/** Roda no <head>, antes da primeira pintura, para evitar flash de tema errado. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    return stored && THEMES.includes(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function cycleTheme() {
  const next = THEMES[(THEMES.indexOf(getTheme()) + 1) % THEMES.length];
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
  listeners.forEach((listener) => listener());
}
