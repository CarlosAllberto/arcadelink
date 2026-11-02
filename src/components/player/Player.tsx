"use client";

import { useEffect, useRef, useState } from "react";
import { consoles } from "@/config/consoles";
import { loadBatterySave, startEmulator, type Emulator } from "@/lib/emulator/emulator";
import { createSaveQueue } from "@/lib/emulator/saves";
import { downloadRom, readSaveFile } from "@/lib/google/drive";
import { ReconnectError } from "@/lib/google/token";
import { romTitle, saveFolderFor } from "@/lib/library/roms";
import { getRom } from "@/lib/library/store";
import { settingsForConsole } from "@/lib/settings/settings";
import { getSettings } from "@/lib/settings/store";

type Stage = "loading" | "playing" | "saving" | "saveFailed" | "error";

// Recarrega de propósito: é o que libera a memória do emulador, que não tem como ser desligado.
function leave() {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/";
}

const SELECT = 8;
const START = 9;

function applyControls(emulator: Emulator) {
  const { controls } = getSettings();
  for (const [player, buttons] of Object.entries(controls)) {
    for (const [button, binding] of Object.entries(buttons)) {
      const target = (emulator.controls[Number(player)][Number(button)] ??= {});
      if (binding.keyCode !== undefined) target.value = binding.keyCode;
      if (binding.pad) target.value2 = binding.pad;
    }
  }
}

function saveNow(emulator: Emulator, saves: ReturnType<typeof createSaveQueue>, withState: boolean) {
  const { gameManager } = emulator;
  const battery = gameManager.getSaveFile();
  if (battery) saves.battery(battery);
  if (withState && gameManager.supportsStates()) saves.state(gameManager.getState());
}

export function Player({ romId }: { romId: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadFailed, setUploadFailed] = useState(false);
  const started = useRef(false);
  const session = useRef<{ exit: () => void } | null>(null);

  useEffect(() => {
    // O efeito roda duas vezes em desenvolvimento, e só pode existir um emulador por página.
    if (started.current) return;
    started.current = true;

    async function begin() {
      const rom = getRom(romId);
      const config = consoles.find((item) => item.id === rom?.console);
      if (!rom || !config) return { error: "Jogo não encontrado. Volte e reescaneie a biblioteca." };

      const folder = saveFolderFor(rom.name, config.folders);
      const [file, battery, state] = await Promise.all([
        downloadRom(rom.id, rom.name, setProgress),
        readSaveFile(`${rom.name}.srm`, folder),
        readSaveFile(`${rom.name}.state`, folder),
      ]);
      const settings = getSettings();
      const saves = createSaveQueue(rom.name, folder, () => setUploadFailed(true));
      if (battery) saves.setLastBattery(battery);
      let emulator: Emulator | null = null;

      async function exit() {
        if (!emulator) return;
        setStage("saving");
        emulator.pause();
        try {
          saveNow(emulator, saves, settings.autoStateOnExit);
        } catch (failure) {
          console.error("Falha ao ler o save do emulador:", failure);
          return setStage("saveFailed");
        }
        if (await saves.flush()) leave();
        else setStage("saveFailed");
      }
      session.current = { exit };

      startEmulator({
        core: config.core,
        title: romTitle(rom.name),
        rom: file,
        volume: settingsForConsole(settings, config.id).gameVolume,
        shader: settingsForConsole(settings, config.id).shader,
        onSaveState: (data) => saves.state(data),
        onSaveBattery: (data) => saves.battery(data),
        onLoadState: async (current) => {
          const saved = await readSaveFile(`${rom.name}.state`, folder);
          if (saved) current.gameManager.loadState(saved);
        },
        onStart(current) {
          emulator = current;
          applyControls(current);
          if (battery) loadBatterySave(current, battery);
          if (state && current.gameManager.supportsStates()) current.gameManager.loadState(state);

          const sync = (withState: boolean) => {
            try {
              saveNow(current, saves, withState);
            } catch (failure) {
              console.error("Falha ao ler o save do emulador:", failure);
            }
          };
          // O EmulatorJS não avisa quando pausa.
          const pause = current.pause;
          current.pause = (...args) => {
            pause(...args);
            sync(false);
          };
          if (settings.saveInterval) setInterval(() => sync(false), settings.saveInterval * 60_000);
          document.addEventListener("visibilitychange", () => {
            if (document.hidden) sync(settings.autoStateOnExit);
          });
          setStage("playing");
        },
      });
      return null;
    }

    begin()
      .then((result) => {
        if (result) {
          setError(result.error);
          setStage("error");
        }
      })
      .catch((failure) => {
        console.error("Falha ao abrir o jogo:", failure);
        setError(
          failure instanceof ReconnectError
            ? "Sua conexão com o Google expirou. Volte e reconecte na Biblioteca."
            : "Não foi possível baixar o jogo do Drive.",
        );
        setStage("error");
      });
  }, [romId]);

  useEffect(() => {
    let frame = 0;
    let held = false;
    function poll() {
      const chord = navigator
        .getGamepads()
        .some((pad) => pad?.buttons[SELECT]?.pressed && pad.buttons[START]?.pressed);
      if (chord && !held) session.current?.exit();
      held = chord;
      frame = requestAnimationFrame(poll);
    }
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="player">
      <div id="game" />
      {stage === "playing" && (
        <button type="button" className="pill player-exit" onClick={() => session.current?.exit()}>
          Sair
        </button>
      )}
      {uploadFailed && stage === "playing" && (
        <p className="pill player-warning" role="alert">
          Falha ao salvar no Drive. Tentaremos de novo ao sair.
        </p>
      )}
      {stage !== "playing" && (
        <div className="player-status" role="status">
          {stage === "loading" && <p>Baixando do Drive: {progress}%</p>}
          {stage === "saving" && <p>Salvando no Drive</p>}
          {stage === "error" && <p>{error}</p>}
          {stage === "saveFailed" && (
            <>
              <p>Não foi possível salvar no Drive. Seu progresso desta sessão pode se perder.</p>
              <button type="button" className="settings-action" onClick={() => session.current?.exit()}>
                Tentar de novo
              </button>
            </>
          )}
          {(stage === "error" || stage === "saveFailed") && (
            <button type="button" className="settings-action" onClick={leave}>
              {stage === "error" ? "Voltar" : "Sair sem salvar"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
