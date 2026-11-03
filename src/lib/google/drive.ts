import { romFolders } from "@/config/consoles";
import { pickBios } from "@/lib/library/roms";
import { getAccessToken } from "./token";

const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
const SETTINGS_FILE = "settings.json";
const FOLDERS_KEY = "arcadelink:drive-folders";
export const ROM_CACHE = "arcadelink-roms";

type DriveFile = { id: string; name: string; mimeType: string; size?: string; modifiedTime?: string };
type SaveFolders = { saves: string; consoles: Record<string, string>; bios?: string };

async function drive(url: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Drive respondeu ${response.status}`);
  return response;
}

async function list(query: string) {
  const files: DriveFile[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `${query} and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime)",
      pageSize: "1000",
      pageToken,
    });
    const page = await (await drive(`${API}?${params}`)).json();
    files.push(...page.files);
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
  return files;
}

async function create(name: string, parent: string, mimeType: string): Promise<DriveFile> {
  const response = await drive(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parents: [parent], mimeType }),
  });
  return response.json();
}

function byName(name: string, parent: string) {
  const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return list(`name = '${escaped}' and '${parent}' in parents`);
}

async function findOrCreate(name: string, parent: string, mimeType: string) {
  const [found] = await byName(name, parent);
  return found ?? create(name, parent, mimeType);
}

async function createConsoleFolders(parent: string) {
  const ids: Record<string, string> = {};
  for (const { id, name } of await list(`'${parent}' in parents`)) ids[name] = id;
  for (const name of romFolders) ids[name] ??= (await create(name, parent, FOLDER)).id;
  return ids;
}

function rememberSaveFolders(folders: SaveFolders) {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {}
}

function rememberedSaveFolders(): SaveFolders | null {
  try {
    return JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? "null");
  } catch {
    return null;
  }
}

let appFolders: Promise<{ app: DriveFile; roms: DriveFile; saves: DriveFile; bios: DriveFile }> | null = null;

/** `ArcadeLink/` com `Saves/<console>/`, `Roms/<console>/` e `Bios/`. Criadas pelo app, ficam cobertas pelo `drive.file`. */
export function getAppFolders() {
  appFolders ??= (async () => {
    const app = await findOrCreate("ArcadeLink", "root", FOLDER);
    const saves = await findOrCreate("Saves", app.id, FOLDER);
    const roms = await findOrCreate("Roms", app.id, FOLDER);
    const bios = await findOrCreate("Bios", app.id, FOLDER);
    await createConsoleFolders(roms.id);
    const consoles = await createConsoleFolders(saves.id);
    rememberSaveFolders({ saves: saves.id, consoles, bios: bios.id });
    return { app, roms, saves, bios };
  })().catch((error) => {
    appFolders = null;
    throw error;
  });
  return appFolders;
}

export async function readSettingsFile(): Promise<unknown | null> {
  const { id } = (await getAppFolders()).app;
  const [file] = await byName(SETTINGS_FILE, id);
  if (!file) return null;
  return (await drive(`${API}/${file.id}?alt=media`)).json();
}

export async function writeSettingsFile(settings: unknown) {
  const { id } = (await getAppFolders()).app;
  const file = await findOrCreate(SETTINGS_FILE, id, "application/json");
  await drive(`${UPLOAD}/${file.id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

function toRomFile({ id, name, modifiedTime, size }: DriveFile, folder: string) {
  return { id, name, folder, version: modifiedTime, size };
}

/** Arquivos da pasta e das subpastas de console, que ficam a um nível, como no RetroArch. */
export async function listRomFiles(folderId: string) {
  const items = await list(`'${folderId}' in parents`);
  const isFolder = (file: DriveFile) => file.mimeType === FOLDER;
  const nested = await Promise.all(
    items.filter(isFolder).map(async (folder) => {
      const files = await list(`'${folder.id}' in parents`);
      return files.filter((file) => !isFolder(file)).map((file) => toRomFile(file, folder.name));
    }),
  );
  const top = items.filter((file) => !isFolder(file)).map((file) => toRomFile(file, ""));
  return [...top, ...nested.flat()];
}

async function fetchRom(id: string, size: string | undefined, onProgress: (percent: number) => void) {
  const total = Number(size ?? (await (await drive(`${API}/${id}?fields=size`)).json()).size);
  const response = await drive(`${API}/${id}?alt=media`);
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(100, Math.round((received / total) * 100)));
  }
  return new Blob(chunks as BlobPart[]);
}

type RomRef = { id: string; name: string; version?: string; size?: string };

/** Só existe no navegador da pessoa e some ao sair. O servidor do site nunca recebe a ROM. */
export async function downloadRom(rom: RomRef, onProgress: (percent: number) => void) {
  const cache = rom.version && "caches" in window ? await caches.open(ROM_CACHE).catch(() => null) : null;
  const key = `/rom-cache/${rom.id}?v=${encodeURIComponent(rom.version ?? "")}`;
  const hit = await cache?.match(key);
  if (hit) return new File([await hit.blob()], rom.name);

  const blob = await fetchRom(rom.id, rom.size, onProgress);
  if (cache) {
    // Falta de espaço no cache não pode impedir o jogo de abrir.
    const stale = await cache.keys(`/rom-cache/${rom.id}`, { ignoreSearch: true }).catch(() => []);
    await Promise.all(stale.map((old) => cache.delete(old))).catch(() => {});
    await cache.put(key, new Response(blob)).catch(() => {});
  }
  return new File([blob], rom.name);
}

async function saveFolderIds(folder: string) {
  const remembered = rememberedSaveFolders();
  const known = remembered?.consoles[folder];
  if (remembered && known) return { saves: remembered.saves, target: known };
  const { saves } = await getAppFolders();
  return { saves: saves.id, target: (await findOrCreate(folder, saves.id, FOLDER)).id };
}

async function fileBytes(id: string) {
  return new Uint8Array(await (await drive(`${API}/${id}?alt=media`)).arrayBuffer());
}

/** Saves antigos ficavam soltos em `Saves/`: ao achar um, move para a pasta do console. */
export async function readSaveFiles(names: string[], folder: string) {
  const { saves, target } = await saveFolderIds(folder);
  const [own, loose] = await Promise.all([list(`'${target}' in parents`), list(`'${saves}' in parents`)]);
  return Promise.all(
    names.map(async (name) => {
      const inPlace = own.find((file) => file.name === name);
      if (inPlace) return fileBytes(inPlace.id);
      const old = loose.find((file) => file.name === name);
      if (!old) return null;
      await drive(`${API}/${old.id}?addParents=${target}&removeParents=${saves}`, { method: "PATCH" });
      return fileBytes(old.id);
    }),
  );
}

export async function writeSaveFile(name: string, folder: string, data: Uint8Array) {
  const { target } = await saveFolderIds(folder);
  const file = await findOrCreate(name, target, "application/octet-stream");
  await drive(`${UPLOAD}/${file.id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([data as BlobPart]),
  });
}

/** Primeira BIOS da lista que estiver em `ArcadeLink/Bios`, com o nome que o core espera. */
export async function downloadBios(names: string[]) {
  const folder = rememberedSaveFolders()?.bios ?? (await getAppFolders()).bios.id;
  const found = pickBios(await list(`'${folder}' in parents`), names);
  if (!found) return null;
  const { id, name, modifiedTime, size } = found.file;
  const file = await downloadRom({ id, name, version: modifiedTime, size }, () => {});
  return { name: found.name, data: new Uint8Array(await file.arrayBuffer()) };
}
