import { NextResponse, type NextRequest } from "next/server";
import { consoles } from "@/config/consoles";
import { pickCover } from "@/lib/library/roms";

const BASE = "https://thumbnails.libretro.com";
const INDEX_TTL = 24 * 60 * 60 * 1000;
const COVER_CACHE = "public, max-age=2592000";
const MISSING_CACHE = "public, max-age=3600";

const indexes = new Map<string, { files: Promise<string[]>; expiresAt: number }>();

function coversUrl(system: string) {
  return `${BASE}/${encodeURIComponent(system)}/Named_Boxarts/`;
}

async function fetchIndex(system: string) {
  const response = await fetch(coversUrl(system));
  if (!response.ok) throw new Error(`Índice de capas respondeu ${response.status}`);
  const html = await response.text();
  return [...html.matchAll(/href="([^"?/][^"]*\.png)"/g)].map((match) => decodeURIComponent(match[1]));
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
      const image = await fetch(coversUrl(system) + encodeURIComponent(file));
      if (!image.ok) throw new Error(`Capa respondeu ${image.status}`);
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
