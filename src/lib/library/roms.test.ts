import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyRoms, consoleForRom, coverKey, dominantColor, pickCover, romTitle } from "./roms.ts";

test("romTitle limpa os nomes reais da biblioteca", () => {
  assert.equal(romTitle("Super Mario World (PT-BR) - [snesforever.com.br].sfc"), "Super Mario World");
  assert.equal(romTitle("The Mask (BR) (www.romsportugues.com).sfc"), "The Mask");
  assert.equal(
    romTitle("Legend of Zelda, The - A Link to the Past (BR) (Hyrule Legends) (www.romsportugues.com).sfc"),
    "The Legend of Zelda - A Link to the Past",
  );
  assert.equal(romTitle("super_metroid.smc"), "super metroid");
});

test("coverKey ignora artigo, acento e pontuação", () => {
  assert.equal(coverKey("The Mask"), coverKey("Mask, The (USA).png"));
  assert.equal(coverKey("Pokémon: Red"), coverKey("Pokemon_ Red (USA).png"));
  assert.equal(
    coverKey("The Legend of Zelda - A Link to the Past"),
    coverKey("Legend of Zelda, The - A Link to the Past (USA).png"),
  );
});

test("pickCover prefere EUA e versão oficial", () => {
  const files = ["Mask, The (Europe).png", "Mask, The (USA) (Beta).png", "Mask, The (USA).png", "Other (USA).png"];
  assert.equal(pickCover(files, "The Mask"), "Mask, The (USA).png");
  assert.equal(pickCover(["Turtles (USA) (Collection).png", "Turtles (USA).png"], "Turtles"), "Turtles (USA).png");
  assert.equal(pickCover(files, "Inexistente"), null);
  assert.equal(pickCover(files, "(BR)"), null);
});

test("consoleForRom usa extensão e, em zip, a subpasta", () => {
  assert.equal(consoleForRom("a.sfc", "NES"), "snes");
  assert.equal(consoleForRom("a.gbc", "GBC"), "gb");
  assert.equal(consoleForRom("a.z64", ""), "n64");
  assert.equal(consoleForRom("a.zip", "snes"), "snes");
  assert.equal(consoleForRom("a.zip", "GBC"), "gb");
  assert.equal(consoleForRom("a.zip", "GBA"), null);
  assert.equal(consoleForRom("a.md", "SNES"), null);
  assert.equal(consoleForRom("a.gba", "GBA"), null);
});

test("classifyRoms conta os ignorados e ordena por título", () => {
  const { roms, ignored } = classifyRoms([
    { id: "1", name: "Zelda.sfc", folder: "SNES" },
    { id: "2", name: "leia-me.md", folder: "SNES" },
    { id: "3", name: "Aladdin.sfc", folder: "SNES" },
  ]);
  assert.deepEqual(roms.map((rom) => rom.id), ["3", "1"]);
  assert.equal(ignored, 1);
});

test("dominantColor pesa os pixels saturados e aguenta imagem vazia", () => {
  const color = dominantColor([255, 0, 0, 255, 128, 128, 128, 255]);
  assert.ok(color?.startsWith("rgb(25"), color ?? "");
  assert.equal(dominantColor([0, 0, 0, 0]), null);
});
