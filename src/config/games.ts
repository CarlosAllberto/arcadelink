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

/** Capa gerada para ROM sem capa na base; a cor sai do título para ser sempre a mesma. */
export function generatedCover(title: string) {
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [color, accent] = PALETTE[hash % PALETTE.length];
  return { color, cover: makeCover(title, color, accent) };
}
