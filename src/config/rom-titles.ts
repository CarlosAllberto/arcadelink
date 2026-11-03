type RomTitle = string | { title: string; cover: string };

/** ROMs de arcade usam códigos no nome do arquivo. `cover` busca a capa de outro título, como o jogo original de um bootleg. */
export const romTitles: Record<string, RomTitle> = {
  kf2k2mp2: { title: "The King of Fighters 2002 Magic Plus II", cover: "The King of Fighters 2002" },
  sfiii3: "Street Fighter III 3rd Strike",
  // A capa japonesa traz a arte dos personagens; as outras são panfletos de venda.
  sfiii3n: {
    title: "Street Fighter III 3rd Strike",
    cover: "Street Fighter III 3rd Strike_ Fight for the Future (Japan 990512)",
  },
  simpsons: "The Simpsons",
};
