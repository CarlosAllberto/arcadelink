import { getAccessToken } from "./token";

const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER = "application/vnd.google-apps.folder";
const SETTINGS_FILE = "settings.json";

type DriveFile = { id: string };

async function drive(url: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Drive respondeu ${response.status}`);
  return response;
}

async function list(query: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({ q: `${query} and trashed = false`, fields: "files(id)", pageSize: "1000" });
  const { files } = await (await drive(`${API}?${params}`)).json();
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

let appFolder: Promise<DriveFile> | null = null;

/** Pasta do app, com `Saves/` dentro. Criadas pelo app, ficam cobertas pelo `drive.file`. */
function getAppFolder() {
  appFolder ??= (async () => {
    const folder = await findOrCreate("ArcadeLink", "root", FOLDER);
    await findOrCreate("Saves", folder.id, FOLDER);
    return folder;
  })().catch((error) => {
    appFolder = null;
    throw error;
  });
  return appFolder;
}

export async function readSettingsFile(): Promise<unknown | null> {
  const { id } = await getAppFolder();
  const [file] = await list(`name = '${SETTINGS_FILE}' and '${id}' in parents`);
  if (!file) return null;
  return (await drive(`${API}/${file.id}?alt=media`)).json();
}

export async function writeSettingsFile(settings: unknown) {
  const { id } = await getAppFolder();
  const file = await findOrCreate(SETTINGS_FILE, id, "application/json");
  await drive(`${UPLOAD}/${file.id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

/** Quantos itens o app enxerga na pasta. Zero numa pasta cheia indica que o escopo não cobre o conteúdo. */
export async function countFolderItems(folderId: string) {
  return (await list(`'${folderId}' in parents`)).length;
}
