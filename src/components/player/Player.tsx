"use client";

import { useEffect, useRef, useState } from "react";
import { FullscreenOnGesture } from "@/components/ui/FullscreenOnGesture";
import { consoles } from "@/config/consoles";
import { isBlackFrame, loadBatterySave, startEmulator, type Emulator } from "@/lib/emulator/emulator";
import { failureMessage, loadFailure, type LoadFailure } from "@/lib/emulator/failure";
import { createSaveQueue } from "@/lib/emulator/saves";
import { downloadBios, downloadRom, readSaveFiles } from "@/lib/google/drive";
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

const RESUME_CHECKS = 3;
const RESUME_CHECK_DELAY = 2000;
const NOTICE_TIME = 10_000;

/** Alguns jogos, como Super Bomberman 4, ficam pretos ao retomar um save state no snes9x. */
async function resumeFailed(emulator: Emulator) {
  for (let i = 0; i < RESUME_CHECKS; i++) {
    await new Promise((resolve) => setTimeout(resolve, RESUME_CHECK_DELAY));
    if (!(await isBlackFrame(emulator).catch(() => false))) return false;
  }
  return true;
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
  if (!withState || !gameManager.supportsStates()) return;
  try {
    saves.state(gameManager.getState());
  } catch (error) {
    // O core lança "Size is zero" enquanto ainda não tem estado, como logo após abrir o jogo.
    // Sem state, o save de bateria segue e a saída não pode travar por isso.
    console.warn("Save state indisponível agora:", error);
  }
}

export function Player({ romId }: { romId: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadFailed, setUploadFailed] = useState(false);
  const [stateIgnored, setStateIgnored] = useState(false);
  const started = useRef(false);
  const session = useRef<{ exit: () => Promise<void> } | null>(null);
  const launched = useRef(false);
  const running = useRef(false);

  useEffect(() => {
    // O efeito roda duas vezes em desenvolvimento, e só pode existir um emulador por página.
    if (started.current) return;
    started.current = true;

    async function begin() {
      const rom = getRom(romId);
      const config = consoles.find((item) => item.id === rom?.console);
      if (!rom || !config) return { error: "Jogo não encontrado. Volte e reescaneie a biblioteca." };

      const folder = saveFolderFor(rom.name, config.folders);
      const [file, [battery, state], bios] = await Promise.all([
        downloadRom(rom, setProgress),
        readSaveFiles([`${rom.name}.srm`, `${rom.name}.state`], folder),
        // Sem BIOS, quem não precisa dela abre normalmente.
        config.bios
          ? downloadBios(config.bios).catch((failure) => {
              console.warn("BIOS indisponível:", failure);
              return null;
            })
          : null,
      ]);
      // A pessoa pode ter voltado à tela inicial durante o download.
      if (!document.getElementById("game")) return null;
      const settings = getSettings();
      const saves = createSaveQueue(rom.name, folder, () => setUploadFailed(true));
      if (battery) saves.setLastBattery(battery);
      let emulator: Emulator | null = null;
      // Sem isso, sair regravaria o state preto por cima do arquivo.
      let saveState = settings.autoStateOnExit;
      const core = config.folderCores?.[rom.folder?.toUpperCase() ?? ""] ?? config.core;
      // Jogo que não abriu não tem o que salvar, e enviar agora apagaria o save bom do Drive.
      let failed = false;
      function fail(failure: LoadFailure | null) {
        failed = true;
        setError(failureMessage(failure, core));
        setStage("error");
      }

      async function exit() {
        if (!emulator) return;
        setStage("saving");
        emulator.pause();
        try {
          saveNow(emulator, saves, saveState);
        } catch (failure) {
          console.error("Falha ao ler o save do emulador:", failure);
          return setStage("saveFailed");
        }
        if (await saves.flush()) leave();
        else setStage("saveFailed");
      }
      session.current = { exit };

      launched.current = true;
      startEmulator({
        core,
        title: romTitle(rom.name),
        rom: file,
        bios,
        volume: settingsForConsole(settings, config.id).gameVolume,
        shader: settingsForConsole(settings, config.id).shader,
        onSaveState: (data) => failed || saves.state(data),
        onSaveBattery: (data) => failed || saves.battery(data),
        onFail: (log) => fail(loadFailure(log)),
        onLoadState: async (current) => {
          const [saved] = await readSaveFiles([`${rom.name}.state`], folder);
          if (saved) current.gameManager.loadState(saved);
        },
        onStart(current, log) {
          const failure = loadFailure(log);
          if (failure) {
            current.pause();
            return fail(failure);
          }
          emulator = current;
          running.current = true;
          applyControls(current);
          if (battery) loadBatterySave(current, battery);
          if (state && current.gameManager.supportsStates()) {
            current.gameManager.loadState(state);
            resumeFailed(current).then((failed) => {
              if (!failed) return;
              saveState = false;
              current.gameManager.restart();
              if (battery) loadBatterySave(current, battery);
              setStateIgnored(true);
              setTimeout(() => setStateIgnored(false), NOTICE_TIME);
            });
          }

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
            if (document.hidden) sync(saveState);
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
            ? "Sua conexão com o Google expirou. Volte e reconecte pelo avatar."
            : "Não foi possível baixar o jogo do Drive.",
        );
        setStage("error");
      });
  }, [romId]);

  // Saída pelo Voltar do navegador: salva e recarrega, senão o emulador segue rodando sem tela.
  useEffect(
    () => () => {
      if (running.current) session.current?.exit().finally(leave);
      else if (launched.current) leave();
    },
    [],
  );

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
      <FullscreenOnGesture />
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
      {stateIgnored && stage === "playing" && (
        <p className="pill player-warning" role="alert">
          Este jogo não retomou do save state. Reiniciamos, e seu save de bateria foi mantido.
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
