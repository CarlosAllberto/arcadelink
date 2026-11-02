"use client";

import Image from "next/image";
import { useState, type SyntheticEvent } from "react";
import type { ConsoleConfig } from "@/config/consoles";
import type { Game } from "@/config/games";
import { dominantColor } from "@/lib/library/roms";

const SIZES = "(max-width: 700px) 80vw, 620px";
const SAMPLE = 16;

function coverColor(image: HTMLImageElement) {
  const context = Object.assign(document.createElement("canvas"), { width: SAMPLE, height: SAMPLE }).getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0, SAMPLE, SAMPLE);
  return dominantColor(context.getImageData(0, 0, SAMPLE, SAMPLE).data);
}

export function Cartridge({ config, game, priority }: { config: ConsoleConfig; game: Game; priority: boolean }) {
  const { width, height, cover } = config;
  const [failed, setFailed] = useState(false);
  const [labelColor, setLabelColor] = useState(game.color);

  function onCoverLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (config.labelStrips) setLabelColor(coverColor(event.currentTarget) ?? game.color);
  }
  const place = (area: { x: number; y: number; width: number; height: number }) => ({
    left: `${(area.x / width) * 100}%`,
    top: `${(area.y / height) * 100}%`,
    width: `${(area.width / width) * 100}%`,
    height: `${(area.height / height) * 100}%`,
  });

  return (
    <div
      className="cartridge"
      style={{
        aspectRatio: `${width} / ${height}`,
        [width >= height ? "width" : "height"]: "var(--cart-size)",
      }}
    >
      <Image src={config.image} alt="" fill sizes={SIZES} priority={priority} draggable={false} />
      {config.labelStrips?.map((strip) => (
        <span
          key={strip.x}
          className="cartridge-strip"
          style={{ ...place(strip), background: labelColor, borderRadius: strip.radius }}
        />
      ))}
      <div
        className={config.gloss ? "cartridge-cover cartridge-cover-gloss" : "cartridge-cover"}
        style={{ ...place(cover), clipPath: config.coverClip }}
      >
        <Image
          src={failed && game.fallback ? game.fallback : game.cover}
          alt=""
          fill
          unoptimized
          draggable={false}
          onLoad={onCoverLoad}
          onError={() => setFailed(true)}
        />
      </div>
      <Image src={config.overlay} alt="" fill sizes={SIZES} draggable={false} />
    </div>
  );
}
