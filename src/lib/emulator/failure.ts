export type LoadFailure = "bios" | "failed";

const FBNEO_REQUIRED = /\[FBNeo\] ROM at index (\d+) .* is required/;
// No FBNeo, os arquivos da placa (BIOS, como o neogeo.zip) vêm depois do índice 0x80 do driver.
const FBNEO_BOARD_INDEX = 0x80;

/** Lê o log do RetroArch até o início do jogo. O core pode abrir mesmo sem conseguir carregar nada. */
export function loadFailure(log: string[]): LoadFailure | null {
  const required = log.flatMap((line) => FBNEO_REQUIRED.exec(line)?.[1] ?? []).map(Number);
  if (required.length) return required.every((index) => index >= FBNEO_BOARD_INDEX) ? "bios" : "failed";
  // Romset desconhecido no FBNeo não gera erro no log: ele só mostra a tela própria e nem procura os arquivos.
  const fbneo = log.some((line) => line.includes("[FBNeo]"));
  if (fbneo && !log.some((line) => line.includes("[FBNeo] Searching all possible locations"))) return "failed";
  if (log.some((line) => line.includes("Failed to load content"))) return "failed";
  return null;
}

/** `core` é o do EmulatorJS: "arcade" é o FBNeo da pasta ARCADE, "mame" é o MAME 2003-Plus da pasta MAME. */
export function failureMessage(failure: LoadFailure | null, core: string) {
  if (failure === "bios") return "Este jogo precisa de uma BIOS. Coloque o neogeo.zip na pasta ArcadeLink/Bios do Drive e tente de novo.";
  if (!failure) return "Não foi possível iniciar o emulador. Volte e tente de novo.";
  if (core === "arcade") return "O romset não é compatível com o emulador desta pasta (FBNeo). Tente colocá-lo na pasta MAME.";
  if (core === "mame") return "O romset não é compatível com o emulador desta pasta (MAME 2003-Plus). Tente colocá-lo na pasta ARCADE.";
  return "O emulador não conseguiu abrir este jogo. O arquivo pode estar corrompido ou ser de outro console.";
}
