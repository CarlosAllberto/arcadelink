import assert from "node:assert/strict";
import { test } from "node:test";
import { failureMessage, loadFailure } from "./failure.ts";

// Linhas reais do EmulatorJS 4.2.3 com romsets quebrados.
const FBNEO = "[libretro INFO] [FBNeo] Timing set to 60.000000 Hz";
const SEARCH = "[libretro INFO] [FBNeo] Searching all possible locations for romset mslug";
const required = (index: number) =>
  `[libretro ERROR] [FBNeo] ROM at index ${index} with name 201-p1.p1 and CRC 0x08d8daa5 is required`;

test("loadFailure reconhece as falhas do FBNeo", () => {
  assert.equal(loadFailure([FBNEO]), "failed", "romset desconhecido não procura arquivos");
  assert.equal(loadFailure([SEARCH, required(0), required(128), FBNEO]), "failed");
  assert.equal(loadFailure([SEARCH, required(128), required(167), FBNEO]), "bios");
  assert.equal(loadFailure([SEARCH, "[libretro INFO] [FBNeo] Using ROM with known crc 0x6feb0314", FBNEO]), null);
});

test("loadFailure reconhece o conteúdo recusado por qualquer core", () => {
  const mame = [
    "[libretro ERROR] [MAME 2003+] Driver index counter: 5240. Game driver not found for x!",
    "[ERROR] [Content]: Failed to load content",
  ];
  assert.equal(loadFailure(mame), "failed");
  assert.equal(loadFailure(["[INFO] [Content]: Loading content file: \"/jogo.sfc\"."]), null);
  assert.equal(loadFailure([]), null);
});

test("failureMessage sugere a outra pasta de arcade", () => {
  assert.match(failureMessage("failed", "arcade"), /FBNeo.*pasta MAME/);
  assert.match(failureMessage("failed", "mame"), /MAME 2003-Plus.*pasta ARCADE/);
  assert.match(failureMessage("bios", "arcade"), /BIOS/);
  assert.match(failureMessage("failed", "snes"), /não conseguiu abrir/);
  assert.match(failureMessage(null, "snes"), /iniciar o emulador/);
  for (const core of ["arcade", "mame", "snes"]) assert.doesNotMatch(failureMessage("failed", core), /—|–/);
});
