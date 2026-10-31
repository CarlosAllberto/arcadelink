"use client";

import { useEffect, useRef, useState } from "react";
import { playlist } from "@/lib/playlist";

const PAUSED_KEY = "arcadelink:music-paused";

function readPaused() {
  try {
    return localStorage.getItem(PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writePaused(paused: boolean) {
  try {
    localStorage.setItem(PAUSED_KEY, paused ? "1" : "0");
  } catch {}
}

export function Miniplayer() {
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const resumeOnTrackChange = useRef(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const track = playlist[trackIndex];

  useEffect(() => {
    // O navegador bloqueia áudio até o primeiro gesto na página.
    function start(event: Event) {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      if (root.current?.contains(event.target as Node) || readPaused()) return;
      audio.current?.play().catch(() => {});
    }
    window.addEventListener("pointerdown", start);
    window.addEventListener("keydown", start);
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, []);

  useEffect(() => {
    if (resumeOnTrackChange.current) audio.current?.play().catch(() => {});
  }, [trackIndex]);

  function togglePlay() {
    const element = audio.current;
    if (!element) return;
    writePaused(!element.paused);
    if (element.paused) element.play().catch(() => {});
    else element.pause();
  }

  function nextTrack() {
    resumeOnTrackChange.current = playing;
    setTrackIndex((index) => (index + 1) % playlist.length);
  }

  return (
    <div ref={root} className="pill miniplayer">
      <audio
        ref={audio}
        src={track.src}
        muted={muted}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          resumeOnTrackChange.current = true;
          setTrackIndex((index) => (index + 1) % playlist.length);
        }}
      />
      <button type="button" onClick={togglePlay} aria-label={playing ? "Pausar música" : "Tocar música"}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d={playing ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4v16l13-8z"} />
        </svg>
      </button>
      <span className={playing ? "equalizer equalizer-on" : "equalizer"} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="miniplayer-title">
        <span className={playing ? "miniplayer-title-on" : undefined}>{track.title}</span>
      </span>
      <button type="button" onClick={nextTrack} aria-label="Próxima faixa">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M5 4v16l11-8zM17 4h3v16h-3z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        aria-label={muted ? "Ativar som" : "Silenciar"}
        aria-pressed={muted}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M4 9v6h4l5 5V4L8 9z" />
          {muted ? (
            <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="2" />
          ) : (
            <path d="M16 8.5a5 5 0 0 1 0 7z" />
          )}
        </svg>
      </button>
    </div>
  );
}
