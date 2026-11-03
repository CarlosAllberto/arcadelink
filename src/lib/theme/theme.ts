import type { Background, Theme } from "@/lib/settings/settings";

const THEME_KEY = "arcadelink:theme";
const BACKGROUND_KEY = "arcadelink:background";

/** Roda no <head>, antes da primeira pintura, para evitar flash de tema errado. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var b=localStorage.getItem("${BACKGROUND_KEY}");if(b)document.documentElement.dataset.background=b}catch(e){}`;

export function getTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

/** Pontos é o fundo padrão do CSS; os outros vêm de `data-background` no <html>. */
export function applyBackground(background: Background) {
  try {
    localStorage.setItem(BACKGROUND_KEY, background);
  } catch {}
  if (background === "dots") delete document.documentElement.dataset.background;
  else document.documentElement.dataset.background = background;
}
