"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useState, useSyncExternalStore } from "react";
import { Carousel } from "@/components/carousel/Carousel";
import { Miniplayer } from "@/components/miniplayer/Miniplayer";
import { TopBar } from "@/components/topbar/TopBar";
import { ButtonIcon } from "@/components/ui/ButtonIcon";
import { consoles, type ConsoleId } from "@/config/consoles";
import { sampleGames } from "@/config/sample-games";
import { wrapIndex } from "@/lib/carousel";
import { useNavigation } from "@/lib/input/useNavigation";
import { cycleTheme, getTheme, subscribeTheme, type Theme } from "@/lib/theme/theme";

const THEME_LABEL: Record<Theme, string> = { system: "Sistema", light: "Claro", dark: "Escuro" };

export function Home() {
  const [consoleIndex, setConsoleIndex] = useState(0);
  const [gameIndexes, setGameIndexes] = useState<Partial<Record<ConsoleId, number>>>({});
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "system" as Theme);

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
    if (action === "left") moveGame(-1);
    if (action === "right") moveGame(1);
    if (action === "l") moveConsole(-1);
    if (action === "r") moveConsole(1);
    if (action === "y") cycleTheme();
  });

  return (
    <MotionConfig reducedMotion="user">
      <main className="home">
        <TopBar
          consoleName={current.name}
          onPreviousConsole={() => moveConsole(-1)}
          onNextConsole={() => moveConsole(1)}
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
              <Carousel config={current} games={games} index={gameIndex} onMove={moveGame} />
            </motion.div>
          </AnimatePresence>
        </section>
        <div className="pill game-title" aria-live="polite">
          <ButtonIcon label="A" />
          <span>{games[gameIndex].title}</span>
        </div>
        <footer className="bottombar">
          {/* shortcut: Y só alterna o tema, vira atalho de ajustes com o painel na etapa 2 (CAR-54) */}
          <button type="button" className="pill theme-pill" onClick={cycleTheme}>
            <ButtonIcon label="Y" />
            <span>Tema: {THEME_LABEL[theme]}</span>
          </button>
          <Miniplayer />
        </footer>
      </main>
    </MotionConfig>
  );
}
