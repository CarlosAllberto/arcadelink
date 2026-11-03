import { NextResponse, type NextRequest } from "next/server";
import { consoles } from "@/config/consoles";
import { pickCover } from "@/lib/library/roms";

const LIBRETRO = "https://thumbnails.libretro.com";
const GITHUB_API = "https://api.github.com/repos/libretro-thumbnails";
const GITHUB_RAW = "https://raw.githubusercontent.com/libretro-thumbnails";
const FOLDER = "Named_Boxarts";
const TIMEOUT = 8000;
// A libretro às vezes trava em vez de recusar: sem limite curto, a primeira capa de cada console levaria 17s.
const LIBRETRO_TIMEOUT = 2500;
const INDEX_TTL = 24 * 60 * 60 * 1000;
const COVER_CACHE = "public, max-age=2592000";
const MISSING_CACHE = "public, max-age=3600";

const indexes = new Map<string, { files: Promise<string[]>; expiresAt: number }>();

function libretroUrl(system: string) {
  return `${LIBRETRO}/${encodeURIComponent(system)}/${FOLDER}/`;
}

function githubRepo(system: string) {
  return system.replaceAll(" ", "_");
}

function get(url: string, timeout = TIMEOUT) {
  return fetch(url, { signal: AbortSignal.timeout(timeout) });
}

async function libretroIndex(system: string) {
  const response = await get(libretroUrl(system), LIBRETRO_TIMEOUT);
  if (!response.ok) throw new Error(`Índice da libretro respondeu ${response.status}`);
  const html = await response.text();
  return [...html.matchAll(/href="([^"?/][^"]*\.png)"/g)].map((match) => decodeURIComponent(match[1]));
}

async function githubTree(url: string): Promise<{ path: string; sha: string }[]> {
  const response = await get(url);
  if (!response.ok) throw new Error(`Índice do GitHub respondeu ${response.status}`);
  return (await response.json()).tree;
}

async function githubIndex(system: string) {
  const repo = `${GITHUB_API}/${githubRepo(system)}/git/trees`;
  const folder = (await githubTree(`${repo}/master`)).find((entry) => entry.path === FOLDER);
  if (!folder) throw new Error(`${FOLDER} não existe em ${system}`);
  const files = await githubTree(`${repo}/${folder.sha}`);
  return files.map((entry) => entry.path).filter((path) => path.endsWith(".png"));
}

/** A libretro é a fonte principal; o GitHub tem o mesmo acervo e cobre as quedas dela. */
function fetchIndex(system: string) {
  return libretroIndex(system).catch((error) => {
    console.warn("Libretro indisponível, usando o GitHub:", error);
    return githubIndex(system);
  });
}

async function fetchCover(system: string, file: string) {
  const name = encodeURIComponent(file);
  const urls = [`${GITHUB_RAW}/${githubRepo(system)}/master/${FOLDER}/${name}`, libretroUrl(system) + name];
  for (const url of urls) {
    const image = await get(url).catch(() => null);
    if (image?.ok) return image;
  }
  throw new Error(`Capa indisponível: ${file}`);
}

function getIndex(system: string) {
  const cached = indexes.get(system);
  if (cached && Date.now() < cached.expiresAt) return cached.files;
  const files = fetchIndex(system).catch((error) => {
    indexes.delete(system);
    throw error;
  });
  indexes.set(system, { files, expiresAt: Date.now() + INDEX_TTL });
  return files;
}

/** Só procura o nome no índice: a URL final nunca vem do pedido. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ console: string }> }) {
  const { console: id } = await params;
  const target = consoles.find((item) => item.id === id);
  const name = request.nextUrl.searchParams.get("name");
  if (!target || !name || name.length > 200) return new NextResponse(null, { status: 400 });

  try {
    for (const system of target.coverSystems) {
      const file = pickCover(await getIndex(system), name);
      if (!file) continue;
      const image = await fetchCover(system, file);
      return new NextResponse(image.body, {
        headers: { "Content-Type": "image/png", "Cache-Control": COVER_CACHE },
      });
    }
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": MISSING_CACHE } });
  } catch (error) {
    console.error("Falha ao buscar capa:", error);
    return new NextResponse(null, { status: 502 });
  }
}
