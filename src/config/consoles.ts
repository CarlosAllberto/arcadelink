export type ConsoleId = "gb" | "snes" | "nes" | "n64";

type Area = { x: number; y: number; width: number; height: number };

export type ConsoleConfig = {
  id: ConsoleId;
  name: string;
  /** Subpastas de `Roms` deste console; a primeira aparece nas mensagens. */
  folders: string[];
  extensions: string[];
  /** Sistemas na base libretro-thumbnails. */
  coverSystems: string[];
  /** Valor de `EJS_core` no EmulatorJS. */
  core: string;
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

/** Subpastas criadas em `ArcadeLink/Roms` no Drive, como no RetroArch. */
export const romFolders = ["GB", "GBC", "GBA", "NES", "SNES", "N64"];

// Para adicionar um console: exporte os PNGs para public/cartridges e inclua um item aqui.
export const consoles: ConsoleConfig[] = [
  {
    id: "snes",
    name: "SNES",
    core: "snes",
    folders: ["SNES"],
    extensions: ["sfc", "smc"],
    coverSystems: ["Nintendo - Super Nintendo Entertainment System"],
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
    id: "gb",
    name: "Game Boy",
    core: "gb",
    folders: ["GB", "GBC"],
    extensions: ["gb", "gbc"],
    coverSystems: ["Nintendo - Game Boy", "Nintendo - Game Boy Color"],
    image: "/cartridges/gb.png",
    overlay: "/cartridges/gb-overlay.png",
    width: 450,
    height: 514,
    cover: { x: 80, y: 153, width: 290, height: 290 },
    gloss: true,
  },
  {
    id: "nes",
    name: "NES",
    core: "nes",
    folders: ["NES"],
    extensions: ["nes"],
    coverSystems: ["Nintendo - Nintendo Entertainment System"],
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
    core: "n64",
    folders: ["N64"],
    extensions: ["z64", "n64", "v64"],
    coverSystems: ["Nintendo - Nintendo 64"],
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
