export type ConsoleId =
  | "gb"
  | "snes"
  | "nes"
  | "n64"
  | "gba"
  | "md"
  | "sms"
  | "gg"
  | "nds"
  | "psx"
  | "pce"
  | "arcade";

type Area = { x: number; y: number; width: number; height: number };

export type ConsoleConfig = {
  id: ConsoleId;
  name: string;
  /** Subpastas de `Roms` deste console; a primeira aparece nas mensagens. */
  folders: string[];
  extensions: string[];
  /** Extensões que vários consoles usam: só valem dentro da subpasta deste console. */
  folderExtensions?: string[];
  /** Sistemas na base libretro-thumbnails. */
  coverSystems: string[];
  /** Valor de `EJS_core` no EmulatorJS. */
  core: string;
  /** Core de uma subpasta específica, quando difere do padrão do console. */
  folderCores?: Record<string, string>;
  /** Sem `image` e `overlay`, o cartucho vira uma caixa genérica que segue a proporção da capa. */
  image?: string;
  /** Logo e selos da etiqueta, que ficam por cima da capa. */
  overlay?: string;
  /** Tamanho do frame no Figma; as áreas abaixo usam a mesma escala. */
  width: number;
  height: number;
  cover: Area;
  coverClip?: string;
  /** Onde ancorar o corte da capa; o padrão é o centro. */
  coverPosition?: string;
  gloss: boolean;
  /** Faixas da etiqueta pintadas com a cor dominante da capa. */
  labelStrips?: (Area & { radius: string })[];
};

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
    // A arte ocupa o topo da etiqueta na proporção da caixa (deitada); embaixo, faixa na cor da capa.
    cover: { x: 213, y: 54, width: 506, height: 354 },
    // A etiqueta do N64 tem o topo em arco, não cantos arredondados.
    coverClip: "polygon(0 6%, 15% 2.5%, 30% 0.75%, 50% 0, 70% 0.75%, 85% 2.5%, 100% 6%, 100% 100%, 0 100%)",
    labelStrips: [{ x: 213, y: 408, width: 506, height: 173, radius: "0 0 10px 10px" }],
    gloss: true,
  },
  {
    id: "gba",
    name: "Game Boy Advance",
    core: "gba",
    folders: ["GBA"],
    extensions: ["gba"],
    coverSystems: ["Nintendo - Game Boy Advance"],
    image: "/cartridges/gba.png",
    overlay: "/cartridges/gba-overlay.png",
    width: 520,
    height: 400,
    // Abaixo da faixa DESIGN BOY ADVANCE: arte quadrada no meio, como a caixa, entre colunas na cor da capa.
    cover: { x: 132, y: 116, width: 256, height: 256 },
    labelStrips: [
      { x: 32, y: 116, width: 100, height: 256, radius: "0 0 0 8px" },
      { x: 388, y: 116, width: 100, height: 256, radius: "0 0 8px 0" },
    ],
    gloss: true,
  },
  {
    id: "md",
    name: "Mega Drive",
    core: "segaMD",
    folders: ["MD"],
    extensions: ["gen", "smd", "md"],
    folderExtensions: ["bin"],
    coverSystems: ["Sega - Mega Drive - Genesis"],
    image: "/cartridges/md.png",
    overlay: "/cartridges/md-overlay.png",
    width: 440,
    height: 640,
    // Abaixo da faixa MEGA DESIGN; capas de Mega Drive são verticais e cabem quase inteiras.
    cover: { x: 42, y: 92, width: 356, height: 386 },
    coverPosition: "top",
    gloss: true,
  },
  {
    id: "sms",
    name: "Master System",
    core: "segaMS",
    folders: ["SMS"],
    extensions: ["sms"],
    coverSystems: ["Sega - Master System - Mark III"],
    image: "/cartridges/sms.png",
    overlay: "/cartridges/sms-overlay.png",
    width: 460,
    height: 560,
    cover: { x: 52, y: 206, width: 356, height: 306 },
    coverPosition: "top",
    gloss: true,
  },
  {
    id: "gg",
    name: "Game Gear",
    core: "segaGG",
    folders: ["GG"],
    extensions: ["gg"],
    coverSystems: ["Sega - Game Gear"],
    image: "/cartridges/gg.png",
    overlay: "/cartridges/gg-overlay.png",
    width: 480,
    height: 380,
    cover: { x: 34, y: 79, width: 412, height: 245 },
    coverPosition: "top",
    gloss: true,
  },
  {
    id: "nds",
    name: "Nintendo DS",
    core: "nds",
    folders: ["NDS"],
    extensions: ["nds"],
    coverSystems: ["Nintendo - Nintendo DS"],
    image: "/cartridges/nds.png",
    overlay: "/cartridges/nds-overlay.png",
    width: 440,
    height: 420,
    cover: { x: 34, y: 104, width: 372, height: 288 },
    coverPosition: "top",
    gloss: true,
  },
  {
    id: "psx",
    name: "PlayStation",
    core: "psx",
    folders: ["PSX"],
    extensions: ["pbp", "chd"],
    folderExtensions: ["iso", "bin", "cue"],
    coverSystems: ["Sony - PlayStation"],
    // Caixinha de CD: o brilho do plástico vem no overlay, então a capa não leva o brilho do cartucho.
    image: "/cartridges/psx.png",
    overlay: "/cartridges/psx-overlay.png",
    width: 520,
    height: 460,
    cover: { x: 68, y: 10, width: 442, height: 440 },
    gloss: false,
  },
  {
    id: "pce",
    name: "PC Engine",
    core: "pce",
    folders: ["PCE"],
    extensions: ["pce"],
    coverSystems: ["NEC - PC Engine - TurboGrafx 16"],
    image: "/cartridges/pce.png",
    overlay: "/cartridges/pce-overlay.png",
    width: 380,
    height: 560,
    cover: { x: 30, y: 72, width: 320, height: 410 },
    coverPosition: "top",
    gloss: true,
  },
  {
    id: "arcade",
    name: "Arcade",
    core: "arcade",
    // MAME e FBNeo aparecem juntos, mas cada romset abre no emulador da própria pasta.
    folderCores: { MAME: "mame" },
    folders: ["ARCADE", "MAME"],
    extensions: [],
    coverSystems: ["SNK - Neo Geo", "FBNeo - Arcade Games", "MAME"],
    // Sem mockup: caixa genérica que segue a proporção da capa.
    width: 460,
    height: 620,
    // Sobra embaixo para as ranhuras da caixa genérica.
    cover: { x: 30, y: 30, width: 400, height: 510 },
    gloss: true,
  },
];

/** Subpastas criadas em `ArcadeLink/Roms` e `ArcadeLink/Saves` no Drive, como no RetroArch. */
export const romFolders = consoles.flatMap((item) => item.folders);
