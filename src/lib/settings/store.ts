"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getAppFolders, readSettingsFile, writeSettingsFile } from "@/lib/google/drive";
import { ReconnectError } from "@/lib/google/token";
import { applyTheme, getTheme } from "@/lib/theme/theme";
import { defaultSettings, newerSettings, parseSettings, type Settings } from "./settings";

const STORAGE_KEY = "arcadelink:settings";
const SAVE_DELAY = 1500;

export type SyncStatus = "off" | "syncing" | "ok" | "reconnect" | "error";

const listeners = new Set<() => void>();
let settings: Settings | null = null;

function current() {
  if (settings) return settings;
  let stored: unknown = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {}
  settings = { ...parseSettings(stored), theme: getTheme() };
  return settings;
}

function commit(next: Settings) {
  settings = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  applyTheme(next.theme);
  listeners.forEach((listener) => listener());
}

export const getSettings = current;

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...current(), ...patch, updatedAt: Date.now() });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useSettings() {
  return useSyncExternalStore(subscribe, current, () => defaultSettings);
}

/** Com login, puxa o `settings.json` do Drive e grava nele cada alteração. */
export function useDriveSync(userId: string | undefined) {
  const [status, setStatus] = useState<SyncStatus>("off");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function fail(error: unknown) {
      if (cancelled) return;
      console.error("Falha ao sincronizar com o Drive:", error);
      setStatus(error instanceof ReconnectError ? "reconnect" : "error");
    }

    async function connect() {
      setStatus("syncing");
      const raw = await readSettingsFile();
      if (cancelled) return;
      const local = current();
      const newest = raw === null ? local : newerSettings(local, parseSettings(raw));
      if (newest !== local) commit(newest);
      else await writeSettingsFile(local);
      const { app, roms } = await getAppFolders();
      const folder = current().romsFolder;
      // Sem pasta, ou com a própria ArcadeLink escolhida, usa a Roms criada pelo app.
      if (!cancelled && (!folder || folder.id === app.id)) updateSettings({ romsFolder: roms });
      if (!cancelled) setStatus("ok");
    }

    const stop = subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        writeSettingsFile(current()).then(() => !cancelled && setStatus("ok"), fail);
      }, SAVE_DELAY);
    });
    connect().catch(fail);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stop();
      setStatus("off");
    };
  }, [userId]);

  return status;
}
