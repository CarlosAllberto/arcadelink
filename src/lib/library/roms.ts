import { consoles, type ConsoleConfig, type ConsoleId } from "../../config/consoles.ts";
import { romTitles } from "../../config/rom-titles.ts";

/** `version` e `size` vêm do Drive: mudam quando o arquivo é trocado, e invalidam o cache local. */
export type Rom = { id: string; name: string; console: ConsoleId; folder?: string; version?: string; size?: string };
export type RomFile = { id: string; name: string; folder: string; version?: string; size?: string };

const ARCHIVES = ["zip", "7z"];
// Preferência de região quando a base tem várias capas do mesmo jogo.
const REGIONS = ["USA", "World", "Brazil", "Europe", "Japan"];
const ROMAN: Record<string, string> = { 2: "ii", 3: "iii", 4: "iv", 5: "v", 6: "vi", 7: "vii", 8: "viii", 9: "ix" };
// Abaixo disso, buscar pelo começo do nome traria capas de jogos sem relação.
const MIN_PREFIX = 6;

function extension(name: string) {
  return name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
}

function withoutTags(name: string) {
  return name
    .replace(/\.[a-z0-9]{1,4}$/i, "")
    // Numeração de coleções, como "0997 - Castlevania". Anos ficam, por causa de "1943 - The Battle of Midway".
    .replace(/^(?!19\d\d|20\d\d)\d{3,4}\s*-\s*/, "")
    .replace(/_/g, " ")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[\s\-–]+$/, "")
    .trim();
}

function knownTitle(fileName: string) {
  const title = withoutTags(fileName);
  const known = romTitles[title.toLowerCase()] ?? title;
  return typeof known === "string" ? { title: known, cover: known } : known;
}

function withArticle(title: string) {
  return title.replace(/^(.*?), (The|A|An)(?= -|$)/i, "$2 $1");
}

/** "Legend of Zelda, The - A Link (BR) (site.com).sfc" vira "The Legend of Zelda - A Link". */
export function romTitle(fileName: string) {
  return withArticle(knownTitle(fileName).title);
}

/** Título usado para buscar a capa: o mesmo de `romTitle`, salvo exceção em `rom-titles`. */
export function coverTitle(fileName: string) {
  return withArticle(knownTitle(fileName).cover);

}

/** Chave que ignora artigo, acentos, pontuação e numeral, para casar "The Mask" com "Mask, The" e 3 com III. */
export function coverKey(title: string) {
  return withoutTags(title)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/,\s*the\b/, "")
    .replace(/\b[2-9]\b/g, (digit) => ROMAN[digit])
    .replace(/[^a-z0-9]/g, "");
}

function coverRank(file: string) {
  const unofficial = /\((Beta|Proto|Demo|Sample|Hack|Unl|Pirate|Bootleg)[^)]*\)/i.test(file) ? 100 : 0;
  const region = REGIONS.findIndex((name) => file.includes(name));
  return unofficial + (region < 0 ? REGIONS.length : region) * 2 + (/\(Rev/.test(file) ? 1 : 0);
}

/** Melhor arquivo da base para o título, ou null se nenhum casar. */
export function pickCover(files: string[], title: string) {
  // `rom-titles` pode apontar um arquivo exato da base, como uma região com arte melhor.
  if (files.includes(`${title}.png`)) return `${title}.png`;
  const key = coverKey(title);
  if (!key) return null;
  const keyed = files.map((file) => ({ file, key: coverKey(file) }));
  let matches = keyed.filter((item) => item.key === key);
  // ROMs costumam vir sem o subtítulo que a base usa, como "Street Fighter III 3rd Strike".
  if (!matches.length && key.length >= MIN_PREFIX) matches = keyed.filter((item) => item.key.startsWith(key));
  const ranked = matches.map((item) => item.file);
  // No empate, o nome mais curto é o lançamento comum, sem coletânea ou edição especial.
  return ranked.sort((a, b) => coverRank(a) - coverRank(b) || a.length - b.length)[0] ?? null;
}

function consoleByFolder(folder: string) {
  const name = folder.toUpperCase();
  return consoles.find((item: ConsoleConfig) => item.folders.includes(name));
}

/** A extensão manda quando é só de um console; zip, 7z e as compartilhadas dependem da subpasta. */
export function consoleForRom(fileName: string, folder: string): ConsoleId | null {
  const ext = extension(fileName);
  const byExtension = consoles.find((item: ConsoleConfig) => item.extensions.includes(ext));
  if (byExtension) return byExtension.id;
  const byFolder = consoleByFolder(folder);
  const allowed = ARCHIVES.includes(ext) || byFolder?.folderExtensions?.includes(ext);
  return allowed ? (byFolder?.id ?? null) : null;
}

/** Subpasta dos saves: a da extensão, como GBC, ou a principal do console. */
export function saveFolderFor(fileName: string, folders: string[]) {
  const ext = extension(fileName).toUpperCase();
  return folders.includes(ext) ? ext : folders[0];
}

/** Separa o que entra no carrossel do que é ignorado, como `.md` ou ROMs de GBA. */
export function classifyRoms(files: RomFile[]) {
  const roms: Rom[] = [];
  for (const { id, name, folder, version, size } of files) {
    const target = consoleForRom(name, folder);
    if (target) roms.push({ id, name, console: target, folder, version, size });
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

/** Primeiro nome de `names` presente em `files`, sem diferenciar maiúsculas. */
export function pickBios<T extends { name: string }>(files: T[], names: string[]) {
  for (const name of names) {
    const file = files.find((item) => item.name.toLowerCase() === name.toLowerCase());
    if (file) return { file, name };
  }
  return null;
}
