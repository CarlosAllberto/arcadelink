const VERSION = "4.2.3";
const DATA_PATH = `https://cdn.emulatorjs.org/${VERSION}/data/`;

/** Só o que usamos do EmulatorJS, que não tem tipos. */
export type Emulator = {
  controls: Record<number, Record<number, { value?: number; value2?: string }>>;
  pause: (...args: unknown[]) => void;
  on(event: "saveDatabaseLoaded", handler: (fs: Emulator["gameManager"]["FS"]) => void): void;
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
  bios?: { name: string; data: Uint8Array } | null;
  volume: number;
  shader: string;
  /** `log` é o que o RetroArch escreveu até o jogo abrir, para `loadFailure`. */
  onStart: (emulator: Emulator, log: string[]) => void;
  /** O próprio EmulatorJS desistiu e mostra o erro dele, sem chamar `onStart`. */
  onFail: (log: string[]) => void;
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

type EmulatorClass = {
  prototype: { initModule(...args: unknown[]): unknown; startGameError(message: string): void };
};

/**
 * O EmulatorJS só repassa o log do RetroArch no modo debug, que também desliga o cache dos cores.
 * Então trocamos o print do Module quando o emulator.js publica `window.EmulatorJS`.
 * Devolve o log até agora e para de guardar: o que importa sai antes do jogo abrir.
 */
function watchEmulator(onFail: (log: string[]) => void) {
  const lines: string[] = [];
  let capturing = true;
  const print = (line: string) => {
    if (capturing) lines.push(line);
  };
  const takeLog = () => {
    capturing = false;
    return lines;
  };
  let current: EmulatorClass | undefined;
  Object.defineProperty(window, "EmulatorJS", {
    configurable: true,
    get: () => current,
    set(next: EmulatorClass) {
      current = next;
      const { initModule, startGameError } = next.prototype;
      next.prototype.initModule = function (...args) {
        const page = window as unknown as { EJS_Runtime: unknown };
        const runtime = page.EJS_Runtime;
        if (typeof runtime === "function") {
          // Sem -v (que o EmulatorJS só passa no debug) o RetroArch não escreve nem os erros.
          page.EJS_Runtime = async (module: object) => {
            const ready = await runtime({ ...module, print, printErr: print });
            const callMain = ready.callMain;
            ready.callMain = (args: string[]) => callMain(["-v", ...args]);
            return ready;
          };
        }
        return initModule.apply(this, args);
      };
      // Download, core ou content recusado: o EmulatorJS mostra o erro dele e não chama onGameStart.
      next.prototype.startGameError = function (message) {
        startGameError.call(this, message);
        onFail(takeLog());
      };
    },
  });
  return takeLog;
}

export function startEmulator(options: Options) {
  const emulator = () => (window as unknown as { EJS_emulator: Emulator }).EJS_emulator;
  ignoreWakeLockDenial();
  const takeLog = watchEmulator(options.onFail);

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
    // O EJS_biosUrl da 4.2.3 trava com File e troca o nome de URLs blob, então a BIOS vai direto para
    // a pasta do jogo antes de o core abrir. O "ready" sai bem antes, enquanto o core ainda baixa.
    EJS_ready: () => {
      const { bios } = options;
      if (bios) emulator().on("saveDatabaseLoaded", (FS) => FS.writeFile(`/${bios.name}`, bios.data));
    },
    EJS_onGameStart: () => options.onStart(emulator(), takeLog()),
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
