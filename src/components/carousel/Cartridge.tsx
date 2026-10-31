import Image from "next/image";
import type { ConsoleConfig } from "@/config/consoles";
import type { Game } from "@/config/sample-games";

const SIZES = "(max-width: 700px) 80vw, 620px";

export function Cartridge({ config, game, priority }: { config: ConsoleConfig; game: Game; priority: boolean }) {
  const { width, height, cover } = config;
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
          style={{ ...place(strip), background: game.color, borderRadius: strip.radius }}
        />
      ))}
      <div
        className={config.gloss ? "cartridge-cover cartridge-cover-gloss" : "cartridge-cover"}
        style={{ ...place(cover), clipPath: config.coverClip }}
      >
        <Image src={game.cover} alt="" fill unoptimized draggable={false} />
      </div>
      <Image src={config.overlay} alt="" fill sizes={SIZES} draggable={false} />
    </div>
  );
}
