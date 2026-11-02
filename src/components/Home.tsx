"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Carousel } from "@/components/carousel/Carousel";
import { Miniplayer } from "@/components/miniplayer/Miniplayer";
import { handlePanelAction, SettingsPanel } from "@/components/settings/SettingsPanel";
import { TopBar } from "@/components/topbar/TopBar";
import { ButtonIcon } from "@/components/ui/ButtonIcon";
import { consoles, type ConsoleId } from "@/config/consoles";
import { generatedCover, type Game } from "@/config/games";
import { wrapIndex } from "@/lib/carousel";
import { useNavigation } from "@/lib/input/useNavigation";
import { romTitle } from "@/lib/library/roms";
import { useLibrary, useLibraryScan, type Library } from "@/lib/library/store";
import { useDriveSync, useSettings } from "@/lib/settings/store";
import { useUser } from "@/lib/supabase/useUser";

function gamesByConsole({ roms, coversVersion }: Library) {
  const games = {} as Record<ConsoleId, Game[]>;
  for (const { id } of consoles) {
    games[id] = (roms ?? [])
      .filter((rom) => rom.console === id)
      .map((rom) => {
        const title = romTitle(rom.name);
        const { color, cover } = generatedCover(title);
        const params = new URLSearchParams({ name: title, v: String(coversVersion) });
        return { id: rom.id, title, color, cover: `/api/cover/${id}?${params}`, fallback: cover };
      });
  }
  return games;
}

export function Home() {
  const [consoleIndex, setConsoleIndex] = useState(0);
  const [gameIndexes, setGameIndexes] = useState<Partial<Record<ConsoleId, number>>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const user = useUser();
  const syncStatus = useDriveSync(user?.id);
  const settings = useSettings();
  const library = useLibrary();
  useLibraryScan(syncStatus === "ok" ? settings.romsFolder?.id : undefined);
  const allGames = useMemo(() => gamesByConsole(library), [library]);

  const current = consoles[consoleIndex];
  const games = allGames[current.id];
  // A biblioteca pode encolher depois de um reescaneamento.
  const gameIndex = games.length ? wrapIndex(gameIndexes[current.id] ?? 0, games.length) : 0;
  const game: Game | undefined = games[gameIndex];
  const notice = library.roms
    ? `Nenhuma ROM em Roms/${current.folders[0]}`
    : syncStatus === "reconnect"
      ? "Sua conexão com o Google expirou. Reconecte pelo avatar"
      : library.failed || syncStatus === "error"
        ? "Não foi possível ler a biblioteca"
        : null;

  function moveGame(delta: number) {
    if (!games.length) return;
    setGameIndexes((indexes) => ({
      ...indexes,
      [current.id]: wrapIndex((indexes[current.id] ?? 0) + delta, games.length),
    }));
  }

  function moveConsole(delta: number) {
    setConsoleIndex((index) => wrapIndex(index + delta, consoles.length));
  }

  function play() {
    if (!game) return;
    // O clique ou a tecla que abre o jogo já vale como gesto; o A do gamepad não.
    document.documentElement.requestFullscreen?.().catch(() => {});
    router.push(`/play/${game.id}`);
  }

  useNavigation((action) => {
    if (dialog.current?.open) return handlePanelAction(dialog.current, action);
    if (action === "left") moveGame(-1);
    if (action === "right") moveGame(1);
    if (action === "l") moveConsole(-1);
    if (action === "r") moveConsole(1);
    if (action === "y") setSettingsOpen(true);
    if (action === "a") play();
  });

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>
      <main className="home" data-reduce-motion={settings.reduceMotion}>
        <TopBar
          consoleName={current.name}
          user={user}
          syncStatus={syncStatus}
          onPreviousConsole={() => moveConsole(-1)}
          onNextConsole={() => moveConsole(1)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <section className="stage" aria-label={`Jogos de ${current.name}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              className="stage-inner"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.16 }}
            >
              {game ? (
                <Carousel
                  config={current}
                  games={games}
                  index={gameIndex}
                  floating={settings.floating}
                  onMove={moveGame}
                  onPlay={play}
                />
              ) : (
                <div className="stage-notice" role="status">
                  {notice ?? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Lendo sua biblioteca
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
        {game && (
          <button type="button" className="pill game-title" aria-live="polite" onClick={play}>
            <ButtonIcon label="A" />
            <span>{game.title}</span>
          </button>
        )}
        <footer className="bottombar">
          <button type="button" className="pill theme-pill" onClick={() => setSettingsOpen(true)}>
            <ButtonIcon label="Y" />
            <span>Ajustes</span>
          </button>
          <Miniplayer />
        </footer>
        <SettingsPanel
          dialogRef={dialog}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          syncStatus={syncStatus}
        />
      </main>
    </MotionConfig>
  );
}
