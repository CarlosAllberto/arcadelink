"use client";

import { useState } from "react";
import { consoles } from "@/config/consoles";
import { gameButtons, menuActions, shaderOptions } from "@/lib/emulator/options";
import { captureKey, capturePad } from "@/lib/input/capture";
import type { Controls } from "@/lib/settings/settings";
import { updateSettings, useSettings } from "@/lib/settings/store";

const PLAYERS = [0, 1];
const SAVE_INTERVALS = [
  { value: 0, label: "Só ao pausar ou sair" },
  { value: 1, label: "1 minuto" },
  { value: 5, label: "5 minutos" },
  { value: 15, label: "15 minutos" },
];

export function ControlsSection() {
  const { controls, menuKeys } = useSettings();
  const [player, setPlayer] = useState(0);
  const [waiting, setWaiting] = useState("");

  function bind(button: number, patch: Controls[number][number]) {
    const own = controls[player] ?? {};
    updateSettings({
      controls: { ...controls, [player]: { ...own, [button]: { ...own[button], ...patch } } },
    });
  }

  async function bindKey(button: number) {
    setWaiting(`key-${button}`);
    const result = await captureKey();
    setWaiting("");
    if (result) bind(button, result);
  }

  async function bindPad(button: number) {
    setWaiting(`pad-${button}`);
    const pad = await capturePad();
    setWaiting("");
    if (pad) bind(button, { pad });
  }

  async function bindMenu(action: string) {
    setWaiting(`menu-${action}`);
    const result = await captureKey();
    setWaiting("");
    if (result) updateSettings({ menuKeys: { ...menuKeys, [action]: result.key } });
  }

  return (
    <section className="settings-section" aria-label="Controles">
      <h2>Jogo</h2>
      <div className="settings-choice">
        {PLAYERS.map((id) => (
          <button key={id} type="button" aria-pressed={player === id} onClick={() => setPlayer(id)}>
            Jogador {id + 1}
          </button>
        ))}
      </div>
      <p>Toque em um campo e aperte a tecla ou o botão. Sem escolha, vale o padrão do EmulatorJS.</p>
      <div className="settings-grid">
        {gameButtons.map(({ id, label }) => (
          <div key={id} className="settings-row">
            <span>{label}</span>
            <span className="settings-bindings">
              <button type="button" aria-label={`Tecla de ${label}`} onClick={() => bindKey(id)}>
                {waiting === `key-${id}` ? "Aperte" : (controls[player]?.[id]?.key ?? "Padrão")}
              </button>
              <button type="button" aria-label={`Botão de ${label}`} onClick={() => bindPad(id)}>
                {waiting === `pad-${id}` ? "Aperte" : (controls[player]?.[id]?.pad ?? "Padrão")}
              </button>
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="settings-action"
        onClick={() => updateSettings({ controls: { ...controls, [player]: {} } })}
      >
        Restaurar jogador {player + 1}
      </button>
      <p>Zona morta do analógico: fixa em 0,5 nesta versão do EmulatorJS.</p>
      <h2>Menu</h2>
      <div className="settings-grid">
        {menuActions.map(({ id, label, key }) => (
          <div key={id} className="settings-row">
            <span>{label}</span>
            <span className="settings-bindings">
              <button type="button" aria-label={`Tecla de ${label}`} onClick={() => bindMenu(id)}>
                {waiting === `menu-${id}` ? "Aperte" : (menuKeys[id] ?? key)}
              </button>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className="settings-action" onClick={() => updateSettings({ menuKeys: {} })}>
        Restaurar menu
      </button>
    </section>
  );
}

export function VideoSection() {
  const settings = useSettings();

  return (
    <section className="settings-section" aria-label="Vídeo e shaders">
      <label className="settings-row">
        Shader padrão
        <select value={settings.shader} onChange={(event) => updateSettings({ shader: event.target.value })}>
          {shaderOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <h2>Por console</h2>
      {consoles.map(({ id, name }) => (
        <label key={id} className="settings-row">
          {name}
          <select
            value={settings.consoles[id]?.shader ?? ""}
            onChange={(event) => {
              const own = { ...settings.consoles[id] };
              if (event.target.value) own.shader = event.target.value;
              else delete own.shader;
              updateSettings({ consoles: { ...settings.consoles, [id]: own } });
            }}
          >
            <option value="">Usar o padrão</option>
            {shaderOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <p>Vale a partir do próximo jogo aberto. Escala inteira e proporção de tela não existem nesta versão do EmulatorJS.</p>
    </section>
  );
}

export function SavesSection() {
  const { saveInterval, autoStateOnExit } = useSettings();

  return (
    <section className="settings-section" aria-label="Saves">
      <label className="settings-row">
        Sincronizar save
        <select
          value={saveInterval}
          onChange={(event) => updateSettings({ saveInterval: Number(event.target.value) })}
        >
          {SAVE_INTERVALS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-row">
        Save state automático ao sair
        <input
          type="checkbox"
          checked={autoStateOnExit}
          onChange={(event) => updateSettings({ autoStateOnExit: event.target.checked })}
        />
      </label>
      <p>Os saves ficam em ArcadeLink/Saves no seu Drive, separados por console. No jogo, Select + Start no gamepad também sai salvando.</p>
    </section>
  );
}
