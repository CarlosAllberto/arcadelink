"use client";

import { motion } from "framer-motion";
import { useRef, type WheelEvent } from "react";
import type { ConsoleConfig } from "@/config/consoles";
import type { Game } from "@/config/sample-games";
import { circularOffset } from "@/lib/carousel";
import { Cartridge } from "./Cartridge";

const WHEEL_STEP = 60;
const WHEEL_COOLDOWN = 200;
const spring = { type: "spring", stiffness: 260, damping: 30 } as const;
// Posição por distância do centro, em % da largura: os cartuchos encolhem, então o passo não é linear.
const SLOT_X = [0, 82, 136, 170];

type Props = {
  config: ConsoleConfig;
  games: Game[];
  index: number;
  floating: boolean;
  onMove: (delta: number) => void;
  onPlay: () => void;
};

export function Carousel({ config, games, index, floating, onMove, onPlay }: Props) {
  const wheel = useRef({ total: 0, lockedUntil: 0 });
  const dragging = useRef(false);

  function onWheel(event: WheelEvent) {
    const state = wheel.current;
    if (event.timeStamp < state.lockedUntil) return;
    state.total += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(state.total) < WHEEL_STEP) return;
    onMove(Math.sign(state.total));
    state.total = 0;
    state.lockedUntil = event.timeStamp + WHEEL_COOLDOWN;
  }

  return (
    <motion.div
      className="carousel"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.25}
      dragSnapToOrigin
      onWheel={onWheel}
      onDragStart={() => {
        dragging.current = true;
      }}
      onDragEnd={(_, info) => {
        // O click que encerra o arrasto chega depois deste evento.
        setTimeout(() => {
          dragging.current = false;
        }, 50);
        if (Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 400) {
          onMove(info.offset.x < 0 ? 1 : -1);
        }
      }}
    >
      {games.map((game, i) => {
        const offset = circularOffset(i, index, games.length);
        const distance = Math.abs(offset);
        const centered = offset === 0;
        // Bibliotecas grandes: só existe no DOM o que está perto do centro.
        if (distance > SLOT_X.length - 1) return null;
        return (
          <motion.button
            key={game.id}
            type="button"
            className="carousel-item"
            tabIndex={-1}
            aria-hidden={!centered}
            aria-label={centered ? game.title : undefined}
            style={{ zIndex: 10 - distance, pointerEvents: distance > 2 ? "none" : "auto" }}
            initial={false}
            animate={{
              x: `${Math.sign(offset) * SLOT_X[Math.min(distance, SLOT_X.length - 1)]}%`,
              scale: centered ? 1 : distance === 1 ? 0.62 : 0.42,
              rotateY: centered ? -12 : Math.sign(offset) * -16,
              rotateX: centered ? 6 : 0,
              opacity: distance > 2 ? 0 : distance === 2 ? 0.7 : 1,
              filter: centered ? "blur(0px) brightness(1)" : "blur(3px) brightness(0.72)",
            }}
            transition={spring}
            onClick={() => {
              if (dragging.current) return;
              if (centered) onPlay();
              else onMove(offset);
            }}
          >
            <div className={centered && floating ? "floating" : undefined}>
              <Cartridge key={game.cover} config={config} game={game} priority={distance <= 1} />
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
