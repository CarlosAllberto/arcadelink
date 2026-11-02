import { romFolders } from "@/config/consoles";
import { getAccessToken } from "./token";

const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
const SETTINGS_FILE = "settings.json";

type DriveFile = { id: string; name: string; mimeType: string };

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
      fields: "nextPageToken,files(id,name,mimeType)",
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
  const existing = (await list(`'${parent}' in parents`)).map((file) => file.name);
  for (const name of romFolders) {
    if (!existing.includes(name)) await create(name, parent, FOLDER);
  }
}

let appFolders: Promise<{ app: DriveFile; roms: DriveFile; saves: DriveFile }> | null = null;

/** `ArcadeLink/` com `Saves/<console>/` e `Roms/<console>/`. Criadas pelo app, ficam cobertas pelo `drive.file`. */
export function getAppFolders() {
  appFolders ??= (async () => {
    const app = await findOrCreate("ArcadeLink", "root", FOLDER);
    const saves = await findOrCreate("Saves", app.id, FOLDER);
    const roms = await findOrCreate("Roms", app.id, FOLDER);
    await createConsoleFolders(roms.id);
    await createConsoleFolders(saves.id);
    return { app, roms, saves };
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

/** Arquivos da pasta e das subpastas de console, que ficam a um nível, como no RetroArch. */
export async function listRomFiles(folderId: string) {
  const items = await list(`'${folderId}' in parents`);
  const isFolder = (file: DriveFile) => file.mimeType === FOLDER;
  const nested = await Promise.all(
    items.filter(isFolder).map(async (folder) => {
      const files = await list(`'${folder.id}' in parents`);
      return files.filter((file) => !isFolder(file)).map(({ id, name }) => ({ id, name, folder: folder.name }));
    }),
  );
  const top = items.filter((file) => !isFolder(file)).map(({ id, name }) => ({ id, name, folder: "" }));
  return [...top, ...nested.flat()];
}

/** Baixa a ROM para a memória. O site nunca guarda a ROM em lugar nenhum. */
export async function downloadRom(id: string, name: string, onProgress: (percent: number) => void) {
  const { size } = await (await drive(`${API}/${id}?fields=size`)).json();
  const response = await drive(`${API}/${id}?alt=media`);
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(Math.min(100, Math.round((received / Number(size)) * 100)));
  }
  return new File(chunks as BlobPart[], name);
}

async function saveFolder(folder: string) {
  const { saves } = await getAppFolders();
  return { saves, target: await findOrCreate(folder, saves.id, FOLDER) };
}

/** Saves antigos ficavam soltos em `Saves/`: ao achar um, move para a pasta do console. */
export async function readSaveFile(name: string, folder: string) {
  const { saves, target } = await saveFolder(folder);
  let [file] = await byName(name, target.id);
  if (!file) {
    [file] = await byName(name, saves.id);
    if (!file) return null;
    await drive(`${API}/${file.id}?addParents=${target.id}&removeParents=${saves.id}`, { method: "PATCH" });
  }
  return new Uint8Array(await (await drive(`${API}/${file.id}?alt=media`)).arrayBuffer());
}

export async function writeSaveFile(name: string, folder: string, data: Uint8Array) {
  const { target } = await saveFolder(folder);
  const file = await findOrCreate(name, target.id, "application/octet-stream");
  await drive(`${UPLOAD}/${file.id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Blob([data as BlobPart]),
  });
}
