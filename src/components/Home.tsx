"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useRef, useState } from "react";
import { Carousel } from "@/components/carousel/Carousel";
import { Miniplayer } from "@/components/miniplayer/Miniplayer";
import { handlePanelAction, SettingsPanel } from "@/components/settings/SettingsPanel";
import { TopBar } from "@/components/topbar/TopBar";
import { ButtonIcon } from "@/components/ui/ButtonIcon";
import { consoles, type ConsoleId } from "@/config/consoles";
import { sampleGames } from "@/config/sample-games";
import { wrapIndex } from "@/lib/carousel";
import { useNavigation } from "@/lib/input/useNavigation";
import { useDriveSync, useSettings } from "@/lib/settings/store";
import { useUser } from "@/lib/supabase/useUser";

export function Home() {
  const [consoleIndex, setConsoleIndex] = useState(0);
  const [gameIndexes, setGameIndexes] = useState<Partial<Record<ConsoleId, number>>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const user = useUser();
  const syncStatus = useDriveSync(user?.id);
  const settings = useSettings();

  const current = consoles[consoleIndex];
  const games = sampleGames[current.id];
  const gameIndex = gameIndexes[current.id] ?? 0;

  function moveGame(delta: number) {
    setGameIndexes((indexes) => ({
      ...indexes,
      [current.id]: wrapIndex((indexes[current.id] ?? 0) + delta, games.length),
    }));
  }

  function moveConsole(delta: number) {
    setConsoleIndex((index) => wrapIndex(index + delta, consoles.length));
  }

  useNavigation((action) => {
    if (dialog.current?.open) return handlePanelAction(dialog.current, action);
    if (action === "left") moveGame(-1);
    if (action === "right") moveGame(1);
    if (action === "l") moveConsole(-1);
    if (action === "r") moveConsole(1);
    if (action === "y") setSettingsOpen(true);
  });

  return (
    <MotionConfig reducedMotion={settings.reduceMotion ? "always" : "user"}>
      <main className="home" data-reduce-motion={settings.reduceMotion}>
        <TopBar
          consoleName={current.name}
          user={user}
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
              <Carousel
                config={current}
                games={games}
                index={gameIndex}
                floating={settings.floating}
                onMove={moveGame}
              />
            </motion.div>
          </AnimatePresence>
        </section>
        <div className="pill game-title" aria-live="polite">
          <ButtonIcon label="A" />
          <span>{games[gameIndex].title}</span>
        </div>
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
