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
    restart(): void;
    screenshot(): Promise<Uint8Array>;
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

const SAMPLE = 32;
const BLACK = 3;

/** Lê o quadro do próprio core, sem depender do que está visível na página. */
export async function isBlackFrame({ gameManager }: Emulator) {
  const url = URL.createObjectURL(new Blob([(await gameManager.screenshot()) as BlobPart]));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: SAMPLE, height: SAMPLE });
    const context = canvas.getContext("2d");
    if (!context) return false;
    context.drawImage(image, 0, 0, SAMPLE, SAMPLE);
    const { data } = context.getImageData(0, 0, SAMPLE, SAMPLE);
    let total = 0;
    for (let i = 0; i < data.length; i += 4) total += data[i] + data[i + 1] + data[i + 2];
    return total / (SAMPLE * SAMPLE * 3) < BLACK;
  } finally {
    URL.revokeObjectURL(url);
  }
}
