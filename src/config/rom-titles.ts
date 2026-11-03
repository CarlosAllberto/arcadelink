type RomTitle = string | { title: string; cover: string };

/** ROMs de arcade usam códigos no nome do arquivo. `cover` busca a capa de outro título, como o jogo original de um bootleg. */
export const romTitles: Record<string, RomTitle> = {
  kf2k2mp2: { title: "The King of Fighters 2002 Magic Plus II", cover: "The King of Fighters 2002" },
  sfiii3: "Street Fighter III 3rd Strike",
  simpsons: "The Simpsons",
};
