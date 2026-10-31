export type ConsoleId = "gb" | "snes" | "nes" | "n64";

type Area = { x: number; y: number; width: number; height: number };

export type ConsoleConfig = {
  id: ConsoleId;
  name: string;
  image: string;
  /** Logo e selos da etiqueta, que ficam por cima da capa. */
  overlay: string;
  /** Tamanho do frame no Figma; as áreas abaixo usam a mesma escala. */
  width: number;
  height: number;
  cover: Area;
  coverClip?: string;
  gloss: boolean;
  /** Faixas da etiqueta pintadas com a cor dominante da capa. */
  labelStrips?: (Area & { radius: string })[];
};

// Para adicionar um console: exporte os PNGs para public/cartridges e inclua um item aqui.
export const consoles: ConsoleConfig[] = [
  {
    id: "gb",
    name: "Game Boy",
    image: "/cartridges/gb.png",
    overlay: "/cartridges/gb-overlay.png",
    width: 450,
    height: 514,
    cover: { x: 80, y: 153, width: 290, height: 290 },
    gloss: true,
  },
  {
    id: "snes",
    name: "SNES",
    image: "/cartridges/snes.png",
    overlay: "/cartridges/snes-overlay.png",
    width: 895,
    height: 624,
    cover: { x: 355, y: 43, width: 333, height: 258 },
    gloss: true,
    labelStrips: [
      { x: 73, y: 43, width: 46, height: 258, radius: "74% 0 0 74% / 13% 0 0 13%" },
      { x: 688, y: 43, width: 134, height: 258, radius: "0 25% 25% 0 / 0 13% 13% 0" },
    ],
  },
  {
    id: "nes",
    name: "NES",
    image: "/cartridges/nes.png",
    overlay: "/cartridges/nes-overlay.png",
    width: 895,
    height: 998.5,
    cover: { x: 366, y: 0, width: 404, height: 676 },
    gloss: false,
  },
  {
    id: "n64",
    name: "Nintendo 64",
    image: "/cartridges/n64.png",
    overlay: "/cartridges/n64-overlay.png",
    width: 932,
    height: 637,
    cover: { x: 213, y: 54, width: 506, height: 527 },
    // A etiqueta do N64 tem o topo em arco, não cantos arredondados.
    coverClip:
      "polygon(0 4%, 15% 1.7%, 30% 0.5%, 50% 0, 70% 0.5%, 85% 1.7%, 100% 4%, 100% 100%, 0 100%)",
    gloss: true,
  },
];
