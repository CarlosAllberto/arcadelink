import { writeSaveFile } from "@/lib/google/drive";

function sameBytes(a: Uint8Array | null, b: Uint8Array) {
  return a?.length === b.length && a.every((value, i) => value === b[i]);
}

/** Envia saves em fila: dois envios simultâneos criariam arquivos duplicados no Drive. */
export function createSaveQueue(romName: string, folder: string, onFailure: () => void) {
  let queue: Promise<unknown> = Promise.resolve();
  let lastBattery: Uint8Array | null = null;
  const failing = new Set<string>();

  function upload(name: string, data: Uint8Array, onDone?: () => void) {
    queue = queue.then(() =>
      writeSaveFile(name, folder, data).then(
        () => {
          failing.delete(name);
          onDone?.();
        },
        (error) => {
          console.error("Falha ao enviar save:", error);
          failing.add(name);
          onFailure();
        },
      ),
    );
  }

  return {
    battery(data: Uint8Array) {
      if (sameBytes(lastBattery, data)) return;
      const copy = data.slice();
      upload(`${romName}.srm`, copy, () => {
        lastBattery = copy;
      });
    },
    state(data: Uint8Array) {
      upload(`${romName}.state`, data.slice());
    },
    setLastBattery(data: Uint8Array) {
      lastBattery = data;
    },
    /** Espera a fila e diz se todos os arquivos estão salvos, não só o último enviado. */
    async flush() {
      await queue;
      return failing.size === 0;
    },
  };
}
