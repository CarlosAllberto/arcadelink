import type { ConsoleId } from "@/config/consoles";

export type Theme = "system" | "light" | "dark";
export type Folder = { id: string; name: string };

/** Valores que um console pode sobrescrever. */
type ConsoleSettings = { gameVolume: number };

export type Settings = ConsoleSettings & {
  theme: Theme;
  reduceMotion: boolean;
  floating: boolean;
  musicVolume: number;
  romsFolder: Folder | null;
  consoles: Partial<Record<ConsoleId, Partial<ConsoleSettings>>>;
  updatedAt: number;
};

export const defaultSettings: Settings = {
  theme: "system",
  reduceMotion: false,
  floating: true,
  gameVolume: 80,
  musicVolume: 50,
  romsFolder: null,
  consoles: {},
  updatedAt: 0,
};

function volume(value: unknown, fallback: number) {
  return typeof value === "number" && value >= 0 && value <= 100 ? value : fallback;
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function folder(value: unknown) {
  const { id, name } = (value ?? {}) as Partial<Folder>;
  return typeof id === "string" && typeof name === "string" ? { id, name } : null;
}

/** Aceita o que vier do localStorage ou do Drive: campo inválido cai no padrão. */
export function parseSettings(raw: unknown): Settings {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const consoles = (value.consoles && typeof value.consoles === "object" ? value.consoles : {}) as Settings["consoles"];
  return {
    theme: value.theme === "light" || value.theme === "dark" ? value.theme : "system",
    reduceMotion: flag(value.reduceMotion, defaultSettings.reduceMotion),
    floating: flag(value.floating, defaultSettings.floating),
    gameVolume: volume(value.gameVolume, defaultSettings.gameVolume),
    musicVolume: volume(value.musicVolume, defaultSettings.musicVolume),
    romsFolder: folder(value.romsFolder),
    consoles,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  };
}

export function newerSettings(local: Settings, remote: Settings) {
  return remote.updatedAt > local.updatedAt ? remote : local;
}

export function settingsForConsole(settings: Settings, id: ConsoleId): ConsoleSettings {
  return { gameVolume: volume(settings.consoles[id]?.gameVolume, settings.gameVolume) };
}
