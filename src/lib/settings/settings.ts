import type { ConsoleId } from "@/config/consoles";

export type Theme = "system" | "light" | "dark";
export const BACKGROUNDS = ["dots", "grid", "scanlines", "checker", "landscape", "plain"] as const;
export type Background = (typeof BACKGROUNDS)[number];
export type Folder = { id: string; name: string };

/** Valores que um console pode sobrescrever. */
type ConsoleSettings = { gameVolume: number; shader: string };

/** Botão do jogo: tecla (keyCode e rótulo) e botão do gamepad, nos nomes do EmulatorJS. */
export type ControlBinding = { keyCode?: number; key?: string; pad?: string };
/** Jogador, índice do botão no RetroPad, atalho. */
export type Controls = Record<number, Record<number, ControlBinding>>;

export type Settings = ConsoleSettings & {
  theme: Theme;
  background: Background;
  reduceMotion: boolean;
  floating: boolean;
  musicVolume: number;
  romsFolder: Folder | null;
  /** Minutos entre envios do save de bateria; 0 envia só ao pausar ou sair. */
  saveInterval: number;
  autoStateOnExit: boolean;
  controls: Controls;
  /** Tecla de cada ação do menu, quando diferente do padrão. */
  menuKeys: Record<string, string>;
  /** Índice do botão do gamepad de cada ação do menu, quando diferente do padrão. */
  menuPad: Record<string, number>;
  consoles: Partial<Record<ConsoleId, Partial<ConsoleSettings>>>;
  updatedAt: number;
};

export const defaultSettings: Settings = {
  theme: "system",
  background: "dots",
  reduceMotion: false,
  floating: true,
  gameVolume: 80,
  shader: "disabled",
  musicVolume: 50,
  romsFolder: null,
  saveInterval: 5,
  autoStateOnExit: true,
  controls: {},
  menuKeys: {},
  menuPad: {},
  consoles: {},
  updatedAt: 0,
};

function volume(value: unknown, fallback: number) {
  return typeof value === "number" && value >= 0 && value <= 100 ? value : fallback;
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function record<T>(value: unknown) {
  return (value && typeof value === "object" ? value : {}) as T;
}

function folder(value: unknown) {
  const { id, name } = (value ?? {}) as Partial<Folder>;
  return typeof id === "string" && typeof name === "string" ? { id, name } : null;
}

/** Aceita o que vier do localStorage ou do Drive: campo inválido cai no padrão. */
export function parseSettings(raw: unknown): Settings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    theme: value.theme === "light" || value.theme === "dark" ? value.theme : "system",
    background: BACKGROUNDS.includes(value.background as Background)
      ? (value.background as Background)
      : defaultSettings.background,
    reduceMotion: flag(value.reduceMotion, defaultSettings.reduceMotion),
    floating: flag(value.floating, defaultSettings.floating),
    gameVolume: volume(value.gameVolume, defaultSettings.gameVolume),
    musicVolume: volume(value.musicVolume, defaultSettings.musicVolume),
    shader: text(value.shader, defaultSettings.shader),
    romsFolder: folder(value.romsFolder),
    saveInterval: volume(value.saveInterval, defaultSettings.saveInterval),
    autoStateOnExit: flag(value.autoStateOnExit, defaultSettings.autoStateOnExit),
    controls: record<Controls>(value.controls),
    menuKeys: record<Settings["menuKeys"]>(value.menuKeys),
    menuPad: record<Settings["menuPad"]>(value.menuPad),
    consoles: record<Settings["consoles"]>(value.consoles),
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  };
}

export function newerSettings(local: Settings, remote: Settings) {
  return remote.updatedAt > local.updatedAt ? remote : local;
}

export function settingsForConsole(settings: Settings, id: ConsoleId): ConsoleSettings {
  const own = settings.consoles[id];
  return { gameVolume: volume(own?.gameVolume, settings.gameVolume), shader: text(own?.shader, settings.shader) };
}
