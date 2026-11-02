"use client";

import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { ButtonIcon } from "@/components/ui/ButtonIcon";

function subscribeClock(listener: () => void) {
  const timer = setInterval(listener, 1000);
  return () => clearInterval(timer);
}

function readClock() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  consoleName: string;
  user: User | null;
  onPreviousConsole: () => void;
  onNextConsole: () => void;
  onOpenSettings: () => void;
};

export function TopBar({ consoleName, user, onPreviousConsole, onNextConsole, onOpenSettings }: Props) {
  const clock = useSyncExternalStore(subscribeClock, readClock, () => "");
  const avatar: string | undefined = user?.user_metadata.avatar_url;

  return (
    <header className="topbar">
      <time className="pill topbar-clock">{clock}</time>
      <div className="pill console-pill">
        <button type="button" onClick={onPreviousConsole} aria-label="Console anterior">
          <ButtonIcon label="L" />
        </button>
        <span className="console-name" aria-live="polite">
          {consoleName}
        </span>
        <button type="button" onClick={onNextConsole} aria-label="Próximo console">
          <ButtonIcon label="R" />
        </button>
      </div>
      <div className="topbar-right">
        <span className="round-button" role="img" aria-label="Perfil">
          {avatar ? (
            // O Google recusa a foto quando recebe referrer.
            <Image src={avatar} alt="" width={40} height={40} unoptimized referrerPolicy="no-referrer" />
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.4-8 5.3V21h16v-1.7c0-2.9-3.6-5.3-8-5.3Z" />
            </svg>
          )}
        </span>
        <button type="button" className="round-button" aria-label="Configurações" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3.4h-4l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6ZM13 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
