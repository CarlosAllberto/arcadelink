import { consoles, type ConsoleConfig, type ConsoleId } from "../../config/consoles.ts";

export type Rom = { id: string; name: string; console: ConsoleId };
export type RomFile = { id: string; name: string; folder: string };

const ARCHIVES = ["zip", "7z"];
// Preferência de região quando a base tem várias capas do mesmo jogo.
const REGIONS = ["USA", "World", "Brazil", "Europe", "Japan"];

function extension(name: string) {
  return name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
}

function withoutTags(name: string) {
  return name
    .replace(/\.[a-z0-9]{1,4}$/i, "")
    .replace(/_/g, " ")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s\-–]+$/, "")
    .trim();
}

/** "Legend of Zelda, The - A Link (BR) (site.com).sfc" vira "The Legend of Zelda - A Link". */
export function romTitle(fileName: string) {
  const title = withoutTags(fileName);
  return title.replace(/^(.*?), (The|A|An)(?= -|$)/i, "$2 $1");
}

/** Chave que ignora artigo, acentos e pontuação, para casar "The Mask" com "Mask, The". */
export function coverKey(title: string) {
  return withoutTags(title)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/,\s*the\b/, "")
    .replace(/[^a-z0-9]/g, "");
}

function coverRank(file: string) {
  const unofficial = /\((Beta|Proto|Demo|Sample|Hack|Unl|Pirate)[^)]*\)/i.test(file) ? 100 : 0;
  const region = REGIONS.findIndex((name) => file.includes(name));
  return unofficial + (region < 0 ? REGIONS.length : region) * 2 + (/\(Rev/.test(file) ? 1 : 0);
}

/** Melhor arquivo da base para o título, ou null se nenhum casar. */
export function pickCover(files: string[], title: string) {
  const key = coverKey(title);
  if (!key) return null;
  const matches = files.filter((file) => coverKey(file) === key);
  // No empate, o nome mais curto é o lançamento comum, sem coletânea ou edição especial.
  return matches.sort((a, b) => coverRank(a) - coverRank(b) || a.length - b.length)[0] ?? null;
}

function consoleByFolder(folder: string) {
  const name = folder.toUpperCase();
  return consoles.find((item: ConsoleConfig) => item.folders.includes(name));
}

/** A extensão manda quando é conhecida; zip e 7z dependem da subpasta. */
export function consoleForRom(fileName: string, folder: string): ConsoleId | null {
  const ext = extension(fileName);
  const byExtension = consoles.find((item: ConsoleConfig) => item.extensions.includes(ext));
  if (byExtension) return byExtension.id;
  return ARCHIVES.includes(ext) ? (consoleByFolder(folder)?.id ?? null) : null;
}

/** Subpasta dos saves: a da extensão, como GBC, ou a principal do console. */
export function saveFolderFor(fileName: string, folders: string[]) {
  const ext = extension(fileName).toUpperCase();
  return folders.includes(ext) ? ext : folders[0];
}

/** Separa o que entra no carrossel do que é ignorado, como `.md` ou ROMs de GBA. */
export function classifyRoms(files: RomFile[]) {
  const roms: Rom[] = [];
  for (const { id, name, folder } of files) {
    const target = consoleForRom(name, folder);
    if (target) roms.push({ id, name, console: target });
  }
  roms.sort((a, b) => romTitle(a.name).localeCompare(romTitle(b.name), "pt-BR"));
  return { roms, ignored: files.length - roms.length };
}

/** Cor mais saturada em média, a partir de pixels RGBA. */
export function dominantColor(data: ArrayLike<number>) {
  let [r, g, b, total] = [0, 0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    const saturation = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    const weight = (saturation + 1) * (data[i + 3] / 255);
    r += data[i] * weight;
    g += data[i + 1] * weight;
    b += data[i + 2] * weight;
    total += weight;
  }
  if (!total) return null;
  return `rgb(${Math.round(r / total)} ${Math.round(g / total)} ${Math.round(b / total)})`;
}
