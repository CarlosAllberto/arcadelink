const VERSION = "4.2.3";
const DATA_PATH = `https://cdn.emulatorjs.org/${VERSION}/data/`;

/** Só o que usamos do EmulatorJS, que não tem tipos. */
export type Emulator = {
  controls: Record<number, Record<number, { value?: number; value2?: string }>>;
  pause: (...args: unknown[]) => void;
  gameManager: {
    FS: {
      analyzePath(path: string): { exists: boolean };
      mkdir(path: string): void;
      unlink(path: string): void;
      writeFile(path: string, data: Uint8Array): void;
    };
    getSaveFilePath(): string;
    getSaveFile(): Uint8Array | null;
    loadSaveFiles(): void;
    getState(): Uint8Array;
    loadState(state: Uint8Array): void;
    supportsStates(): boolean;
  };
};

type Options = {
  core: string;
  title: string;
  rom: File;
  volume: number;
  shader: string;
  onStart: (emulator: Emulator) => void;
  onSaveState: (state: Uint8Array) => void;
  onSaveBattery: (data: Uint8Array) => void;
  onLoadState: (emulator: Emulator) => void;
};

/** O core pede para manter a tela acesa e não trata a recusa do navegador, que é inofensiva. */
function ignoreWakeLockDenial() {
  const { wakeLock } = navigator;
  if (!wakeLock) return;
  const request = wakeLock.request.bind(wakeLock);
  wakeLock.request = (type) => {
    const sentinel = request(type);
    sentinel.catch(() => {});
    return sentinel;
  };
}

export function startEmulator(options: Options) {
  const emulator = () => (window as unknown as { EJS_emulator: Emulator }).EJS_emulator;
  ignoreWakeLockDenial();

  Object.assign(window, {
    EJS_player: "#game",
    EJS_core: options.core,
    EJS_gameName: options.title,
    EJS_gameUrl: options.rom,
    EJS_pathtodata: DATA_PATH,
    EJS_language: "pt-BR",
    EJS_startOnLoaded: true,
    EJS_volume: options.volume / 100,
    // As configurações moram no settings.json; o EmulatorJS não guarda as dele.
    EJS_disableLocalStorage: true,
    EJS_defaultOptions: { shader: options.shader },
    EJS_Buttons: {
      exitEmulation: false,
      netplay: false,
      cacheManager: false,
      saveSavFiles: false,
      loadSavFiles: false,
      screenRecord: false,
    },
    EJS_onGameStart: () => options.onStart(emulator()),
    EJS_onSaveState: ({ state }: { state: Uint8Array }) => options.onSaveState(state),
    EJS_onSaveSave: ({ save }: { save: Uint8Array | null }) => save && options.onSaveBattery(save),
    EJS_onLoadState: () => options.onLoadState(emulator()),
  });

  const script = document.createElement("script");
  script.src = `${DATA_PATH}loader.js`;
  document.body.append(script);
}

/** Mesmo caminho que o botão de carregar save do EmulatorJS usa. */
export function loadBatterySave({ gameManager }: Emulator, data: Uint8Array) {
  const { FS } = gameManager;
  const path = gameManager.getSaveFilePath();
  let dir = "";
  for (const part of path.split("/").slice(0, -1).filter(Boolean)) {
    dir += `/${part}`;
    if (!FS.analyzePath(dir).exists) FS.mkdir(dir);
  }
  if (FS.analyzePath(path).exists) FS.unlink(path);
  FS.writeFile(path, data);
  gameManager.loadSaveFiles();
}
