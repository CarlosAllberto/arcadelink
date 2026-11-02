"use client";

import { useEffect, useSyncExternalStore } from "react";
import { listRomFiles } from "@/lib/google/drive";
import { classifyRoms, type Rom } from "./roms";

const STORAGE_KEY = "arcadelink:library";

export type Library = {
  /** Null até a primeira leitura do Drive: o carrossel mostra os jogos de exemplo. */
  roms: Rom[] | null;
  ignored: number;
  coversVersion: number;
  scanning: boolean;
  failed: boolean;
};

const initial: Library = { roms: null, ignored: 0, coversVersion: 0, scanning: false, failed: false };
const listeners = new Set<() => void>();
let library: Library | null = null;

function current() {
  if (library) return library;
  library = initial;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(stored?.roms)) library = { ...initial, ...stored, scanning: false, failed: false };
  } catch {}
  return library!;
}

function commit(patch: Partial<Library>) {
  library = { ...current(), ...patch };
  const { roms, ignored, coversVersion } = library;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ roms, ignored, coversVersion }));
  } catch {}
  listeners.forEach((listener) => listener());
}

export function getRom(id: string) {
  return current().roms?.find((rom) => rom.id === id);
}

export async function scanLibrary(folderId: string) {
  commit({ scanning: true, failed: false });
  try {
    commit({ ...classifyRoms(await listRomFiles(folderId)), scanning: false });
  } catch (error) {
    console.error("Falha ao ler a biblioteca:", error);
    commit({ scanning: false, failed: true });
  }
}

export function refreshCovers() {
  commit({ coversVersion: Date.now() });
}

export function clearLibrary() {
  commit(initial);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function useLibrary() {
  return useSyncExternalStore(subscribe, current, () => initial);
}

/** Lê a pasta quando a conexão com o Drive fica pronta ou a pasta muda. */
export function useLibraryScan(folderId: string | undefined) {
  useEffect(() => {
    if (folderId) scanLibrary(folderId);
  }, [folderId]);
}
