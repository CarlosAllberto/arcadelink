import type { ConsoleId } from "./consoles";

export type Game = { id: string; title: string; color: string; cover: string; fallback?: string };

const PALETTE = [
  ["#5c4bb5", "#1f1747"],
  ["#c2348f", "#3e0d33"],
  ["#2d82b7", "#0e2c45"],
  ["#c4622d", "#40180b"],
  ["#2f6f4f", "#0f2d22"],
  ["#b5302d", "#3c0c0d"],
];

function escapeXml(text: string) {
  return text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function makeCover(title: string, color: string, accent: string) {
  const words = title.toUpperCase().split(" ").slice(0, 6);
  const size = Math.min(56, 860 / Math.max(...words.map((word) => word.length)));
  const text = words
    .map(
      (word, i) =>
        `<text x="300" y="${320 + (i - (words.length - 1) / 2) * size * 1.25}" text-anchor="middle" font-family="monospace" font-weight="700" font-size="${size}" fill="#fff">${escapeXml(word)}</text>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${accent}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="300" cy="300" r="210" fill="#fff" fill-opacity=".12"/><circle cx="300" cy="300" r="130" fill="#000" fill-opacity=".14"/>${text}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function game(id: string, title: string, color: string, accent: string): Game {
  return { id, title, color, cover: makeCover(title, color, accent) };
}

/** Capa gerada para ROM sem capa na base; a cor sai do título para ser sempre a mesma. */
export function generatedCover(title: string) {
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [color, accent] = PALETTE[hash % PALETTE.length];
  return { color, cover: makeCover(title, color, accent) };
}

export function emptyGame(folder: string): Game {
  return { id: "empty", title: `Nenhuma ROM em Roms/${folder}`, ...generatedCover("Sem ROMs") };
}

// Capas de exemplo geradas até a biblioteca real entrar na etapa 3.
export const sampleGames: Record<ConsoleId, Game[]> = {
  gb: [
    game("gb-1", "Cometa Turbo", "#2f6f4f", "#0f2d22"),
    game("gb-2", "Vila Pixel", "#7a8f2a", "#2c3a12"),
    game("gb-3", "Cavaleiro Verde", "#3b7d6b", "#10302c"),
    game("gb-4", "Blocos 8", "#5a6b2f", "#20280f"),
    game("gb-5", "Rio Secreto", "#2d6a7a", "#0d2a33"),
  ],
  snes: [
    game("snes-1", "Reino de Prata", "#5c4bb5", "#1f1747"),
    game("snes-2", "Corrida Neon", "#c2348f", "#3e0d33"),
    game("snes-3", "Lenda do Vento", "#2d82b7", "#0e2c45"),
    game("snes-4", "Herói Estelar", "#c4622d", "#40180b"),
    game("snes-5", "Mansão Lunar", "#4a4e8c", "#14162f"),
  ],
  nes: [
    game("nes-1", "Fuga Espacial", "#b5302d", "#3c0c0d"),
    game("nes-2", "Ninja Azul", "#2c5fb0", "#0d1f42"),
    game("nes-3", "Torre Dourada", "#c2922c", "#40290a"),
    game("nes-4", "Robô Rebelde", "#6d6d78", "#222228"),
    game("nes-5", "Selva Perdida", "#3f8a3a", "#112e10"),
  ],
  n64: [
    game("n64-1", "Pista Galáctica", "#c43b3b", "#3f0e16"),
    game("n64-2", "Ilha Flutuante", "#2c9c8f", "#0c332f"),
    game("n64-3", "Tempo de Herói", "#b0852c", "#3b2a0b"),
    game("n64-4", "Arena Cubo", "#6a3fb5", "#201040"),
    game("n64-5", "Mar de Vidro", "#2c74c4", "#0c2440"),
  ],
};
