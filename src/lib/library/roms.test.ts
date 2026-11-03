import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyRoms, consoleForRom, coverKey, coverTitle, dominantColor, pickBios, pickCover, romTitle, saveFolderFor } from "./roms.ts";

test("romTitle limpa os nomes reais da biblioteca", () => {
  assert.equal(romTitle("Super Mario World (PT-BR) - [snesforever.com.br].sfc"), "Super Mario World");
  assert.equal(romTitle("The Mask (BR) (www.romsportugues.com).sfc"), "The Mask");
  assert.equal(
    romTitle("Legend of Zelda, The - A Link to the Past (BR) (Hyrule Legends) (www.romsportugues.com).sfc"),
    "The Legend of Zelda - A Link to the Past",
  );
  assert.equal(romTitle("super_metroid.smc"), "super metroid");
  assert.equal(romTitle("0997 - Castlevania - Aria of Sorrow (E)(Eurasia).gba"), "Castlevania - Aria of Sorrow");
  assert.equal(romTitle("1943 - The Battle of Midway (USA).nes"), "1943 - The Battle of Midway");
  assert.equal(romTitle("kf2k2mp2.zip"), "The King of Fighters 2002 Magic Plus II");
  assert.equal(coverTitle("kf2k2mp2.zip"), "The King of Fighters 2002");
  assert.equal(coverTitle("Sonic (USA).md"), romTitle("Sonic (USA).md"));
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
  const neoGeo = ["The King of Fighters 2002 (bootleg).png", "The King of Fighters 2002 (NGM-2650)(NGH-2650).png"];
  assert.equal(pickCover(neoGeo, "The King of Fighters 2002"), neoGeo[1]);
  assert.equal(pickCover(files, "(BR)"), null);
  assert.equal(pickCover(files, "Mask, The (Europe)"), "Mask, The (Europe).png");
});

test("pickCover trata numeral e aceita nome sem subtítulo", () => {
  const files = ["Street Fighter III 3rd Strike - Fight for the Future (USA).png", "Simpsons, The (World).png", "Pac-Man (USA).png"];
  assert.equal(pickCover(files, "Street Fighter 3 3rd Strike"), files[0]);
  assert.equal(pickCover(files, "simpsons"), files[1]);
  assert.equal(pickCover(files, "Pac"), null);
  assert.equal(coverKey("Mega Man 2"), coverKey("Mega Man II (USA).png"));
  assert.equal(coverKey("3 Ninjas"), coverKey("III Ninjas (USA).png"));
});

test("consoleForRom usa extensão e, em zip, a subpasta", () => {
  assert.equal(consoleForRom("a.sfc", "NES"), "snes");
  assert.equal(consoleForRom("a.gbc", "GBC"), "gb");
  assert.equal(consoleForRom("a.z64", ""), "n64");
  assert.equal(consoleForRom("a.zip", "snes"), "snes");
  assert.equal(consoleForRom("a.zip", "GBC"), "gb");
  assert.equal(consoleForRom("a.zip", "GBA"), "gba");
  assert.equal(consoleForRom("a.gba", "GBA"), "gba");
  assert.equal(consoleForRom("a.md", "MD"), "md");
  assert.equal(consoleForRom("a.zip", "MAME"), "arcade");
  assert.equal(consoleForRom("a.zip", "ARCADE"), "arcade");
  assert.equal(consoleForRom("a.bin", "MD"), "md");
  assert.equal(consoleForRom("a.bin", "PSX"), "psx");
  assert.equal(consoleForRom("a.bin", ""), null);
  assert.equal(consoleForRom("a.zip", "OUTRA"), null);
  assert.equal(consoleForRom("a.txt", "SNES"), null);
});

test("classifyRoms conta os ignorados e ordena por título", () => {
  const { roms, ignored } = classifyRoms([
    { id: "1", name: "Zelda.sfc", folder: "SNES" },
    { id: "2", name: "leia-me.txt", folder: "SNES" },
    { id: "3", name: "Aladdin.sfc", folder: "SNES" },
  ]);
  assert.deepEqual(roms.map((rom) => rom.id), ["3", "1"]);
  assert.equal(roms[0].folder, "SNES");
  assert.equal(ignored, 1);
});

test("dominantColor pesa os pixels saturados e aguenta imagem vazia", () => {
  const color = dominantColor([255, 0, 0, 255, 128, 128, 128, 255]);
  assert.ok(color?.startsWith("rgb(25"), color ?? "");
  assert.equal(dominantColor([0, 0, 0, 0]), null);
});

test("saveFolderFor separa GBC de GB e usa a pasta principal nos demais", () => {
  assert.equal(saveFolderFor("a.gbc", ["GB", "GBC"]), "GBC");
  assert.equal(saveFolderFor("a.gb", ["GB", "GBC"]), "GB");
  assert.equal(saveFolderFor("a.zip", ["GB", "GBC"]), "GB");
  assert.equal(saveFolderFor("a.sfc", ["SNES"]), "SNES");
});

test("pickBios segue a prioridade e ignora maiúsculas", () => {
  const files = [{ name: "SCPH1001.BIN" }, { name: "scph5501.bin" }, { name: "outro.bin" }];
  assert.deepEqual(pickBios(files, ["scph5501.bin", "scph1001.bin"]), { file: files[1], name: "scph5501.bin" });
  assert.deepEqual(pickBios(files, ["scph7001.bin", "scph1001.bin"]), { file: files[0], name: "scph1001.bin" });
  assert.equal(pickBios(files, ["neogeo.zip"]), null);
});
