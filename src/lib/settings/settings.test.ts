import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSettings, newerSettings, parseSettings, settingsForConsole } from "./settings.ts";

test("parseSettings troca campos inválidos pelo padrão", () => {
  const parsed = parseSettings({ theme: "roxo", musicVolume: 900, floating: false, romsFolder: { id: 1 } });
  assert.equal(parsed.theme, "system");
  assert.equal(parsed.musicVolume, defaultSettings.musicVolume);
  assert.equal(parsed.floating, false);
  assert.equal(parsed.romsFolder, null);
});

test("parseSettings aguenta entrada que não é objeto", () => {
  assert.deepEqual(parseSettings(null), defaultSettings);
  assert.deepEqual(parseSettings("x"), defaultSettings);
});

test("newerSettings fica com a versão mais recente", () => {
  const local = { ...defaultSettings, updatedAt: 10 };
  const remote = { ...defaultSettings, updatedAt: 20 };
  assert.equal(newerSettings(local, remote), remote);
  assert.equal(newerSettings(remote, local), remote);
  assert.equal(newerSettings(local, { ...local }), local);
});

test("settingsForConsole usa o valor do console quando existe", () => {
  const settings = { ...defaultSettings, gameVolume: 40, consoles: { snes: { gameVolume: 90 } } };
  assert.equal(settingsForConsole(settings, "snes").gameVolume, 90);
  assert.equal(settingsForConsole(settings, "gb").gameVolume, 40);
});
