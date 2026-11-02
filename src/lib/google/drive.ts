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

async function findOrCreate(name: string, parent: string, mimeType: string) {
  const [found] = await list(`name = '${name}' and '${parent}' in parents`);
  return found ?? create(name, parent, mimeType);
}

let appFolders: Promise<{ app: DriveFile; roms: DriveFile }> | null = null;

/** `ArcadeLink/` com `Saves/` e `Roms/<console>/`. Criadas pelo app, ficam cobertas pelo `drive.file`. */
export function getAppFolders() {
  appFolders ??= (async () => {
    const app = await findOrCreate("ArcadeLink", "root", FOLDER);
    await findOrCreate("Saves", app.id, FOLDER);
    const roms = await findOrCreate("Roms", app.id, FOLDER);
    const existing = (await list(`'${roms.id}' in parents`)).map((file) => file.name);
    for (const name of romFolders) {
      if (!existing.includes(name)) await create(name, roms.id, FOLDER);
    }
    return { app, roms };
  })().catch((error) => {
    appFolders = null;
    throw error;
  });
  return appFolders;
}

export async function readSettingsFile(): Promise<unknown | null> {
  const { id } = (await getAppFolders()).app;
  const [file] = await list(`name = '${SETTINGS_FILE}' and '${id}' in parents`);
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
