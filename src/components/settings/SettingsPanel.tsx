"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState, type RefObject } from "react";
import { ButtonIcon } from "@/components/ui/ButtonIcon";
import { ControlsSection, SavesSection, VideoSection } from "./GameSections";
import { wrapIndex } from "@/lib/carousel";
import type { NavAction } from "@/lib/input/useNavigation";
import { refreshCovers, scanLibrary, useLibrary } from "@/lib/library/store";
import type { Theme } from "@/lib/settings/settings";
import { updateSettings, useSettings, type SyncStatus } from "@/lib/settings/store";

const TABS = ["Aparência", "Biblioteca", "Áudio", "Controles", "Vídeo", "Saves"] as const;
const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];
const SYNC_LABEL: Record<SyncStatus, string> = {
  off: "Sem conexão com o Drive",
  syncing: "Sincronizando com o Drive",
  ok: "Sincronizado com o Drive",
  reconnect: "Sua conexão com o Google expirou. Reconecte pelo avatar",
  error: "Não foi possível falar com o Drive",
};

/** Navegação só com gamepad ou setas dentro do painel aberto. */
export function handlePanelAction(dialog: HTMLDialogElement, action: NavAction) {
  const active = document.activeElement as HTMLElement | null;

  if (action === "b" || action === "y") return dialog.close();
  if (action === "a") return active?.click();

  if (action === "l" || action === "r") {
    const tabs = [...dialog.querySelectorAll<HTMLElement>("[data-tab]")];
    const selected = tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
    const next = tabs[wrapIndex(selected + (action === "r" ? 1 : -1), tabs.length)];
    next.click();
    return next.focus();
  }

  if (active instanceof HTMLInputElement && active.type === "range" && (action === "left" || action === "right")) {
    if (action === "right") active.stepUp();
    else active.stepDown();
    active.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (active instanceof HTMLSelectElement && (action === "left" || action === "right")) {
    active.selectedIndex = wrapIndex(active.selectedIndex + (action === "right" ? 1 : -1), active.options.length);
    active.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  const items = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input, select")];
  const delta = action === "up" || action === "left" ? -1 : 1;
  items[wrapIndex(items.indexOf(active as HTMLElement) + delta, items.length)]?.focus();
}

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  open: boolean;
  onClose: () => void;
  user: User | null;
  syncStatus: SyncStatus;
};

export function SettingsPanel({ dialogRef, open, onClose, user, syncStatus }: Props) {
  const settings = useSettings();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const library = useLibrary();
  const romsFolderId = settings.romsFolder?.id;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open, dialogRef]);

  const librarySummary = library.scanning
    ? "Lendo a biblioteca"
    : library.failed
      ? "Não foi possível ler a biblioteca"
      : library.roms
        ? `${library.roms.length} jogos, ${library.ignored} arquivos ignorados`
        : "Biblioteca ainda não lida";

  return (
    <dialog
      ref={dialogRef}
      className="settings"
      aria-label="Configurações"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className="settings-body">
        <div className="settings-tabs">
          <ButtonIcon label="L" />
          <div className="settings-tab-list" role="tablist">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                data-tab
                aria-selected={tab === name}
                onClick={(event) => {
                  setTab(name);
                  event.currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <ButtonIcon label="R" />
        </div>

        {tab === "Aparência" && (
          <section className="settings-section" aria-label="Aparência">
            <h2>Tema</h2>
            <div className="settings-choice">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.theme === value}
                  onClick={() => updateSettings({ theme: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="settings-row">
              Reduzir movimento
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(event) => updateSettings({ reduceMotion: event.target.checked })}
              />
            </label>
            <label className="settings-row">
              Flutuação dos cartuchos
              <input
                type="checkbox"
                checked={settings.floating}
                onChange={(event) => updateSettings({ floating: event.target.checked })}
              />
            </label>
          </section>
        )}

        {tab === "Biblioteca" && (
          <section className="settings-section" aria-label="Biblioteca">
            <h2>Conta</h2>
            <p role="status">{SYNC_LABEL[syncStatus]}</p>
            <h2>Pasta de ROMs</h2>
            <p>ArcadeLink/Roms, com uma pasta por console</p>
            <p role="status">{librarySummary}</p>
            <div className="settings-choice">
              <button
                type="button"
                disabled={!user || !romsFolderId || library.scanning}
                onClick={() => romsFolderId && scanLibrary(romsFolderId)}
              >
                Reescanear
              </button>
              <button type="button" disabled={!library.roms} onClick={refreshCovers}>
                Atualizar capas
              </button>
            </div>
            <h2>Pasta de saves</h2>
            <p>ArcadeLink/Saves, com uma pasta por console</p>
          </section>
        )}

        {tab === "Áudio" && (
          <section className="settings-section" aria-label="Áudio">
            <label className="settings-row">
              Volume do jogo
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.gameVolume}
                onChange={(event) => updateSettings({ gameVolume: event.target.valueAsNumber })}
              />
            </label>
            <label className="settings-row">
              Volume do miniplayer
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.musicVolume}
                onChange={(event) => updateSettings({ musicVolume: event.target.valueAsNumber })}
              />
            </label>
          </section>
        )}

        {tab === "Controles" && <ControlsSection />}
        {tab === "Vídeo" && <VideoSection />}
        {tab === "Saves" && <SavesSection />}

        <button type="button" className="settings-close" onClick={() => dialogRef.current?.close()}>
          <ButtonIcon label="B" />
          Fechar
        </button>
      </div>
    </dialog>
  );
}
