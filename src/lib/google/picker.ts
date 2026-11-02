import type { Folder } from "@/lib/settings/settings";
import { getAccessToken } from "./token";

type PickerResponse = { action: string; docs?: { id: string; name: string }[] };

// Só o que usamos da API do Picker, que não tem tipos instalados.
declare global {
  interface Window {
    gapi?: { load(api: string, callback: () => void): void };
    google?: {
      picker: {
        Action: { PICKED: string; CANCEL: string };
        ViewId: { FOLDERS: string };
        DocsView: new (view: string) => {
          setSelectFolderEnabled(value: boolean): unknown;
          setIncludeFolders(value: boolean): unknown;
          setMimeTypes(types: string): unknown;
        };
        PickerBuilder: new () => {
          addView(view: unknown): PickerBuilder;
          setOAuthToken(token: string): PickerBuilder;
          setDeveloperKey(key: string): PickerBuilder;
          setAppId(id: string): PickerBuilder;
          setTitle(title: string): PickerBuilder;
          setCallback(callback: (response: PickerResponse) => void): PickerBuilder;
          build(): { setVisible(value: boolean): void };
        };
      };
    };
  }
}

type PickerBuilder = InstanceType<NonNullable<Window["google"]>["picker"]["PickerBuilder"]>;

function loadPicker() {
  return new Promise<void>((resolve, reject) => {
    const ready = () => window.gapi!.load("picker", resolve);
    if (window.gapi) return ready();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = ready;
    script.onerror = () => reject(new Error("Não foi possível carregar o Google Picker"));
    document.head.append(script);
  });
}

export async function pickFolder(): Promise<Folder | null> {
  const [token] = await Promise.all([getAccessToken(), loadPicker()]);
  const { picker } = window.google!;

  const view = new picker.DocsView(picker.ViewId.FOLDERS);
  view.setSelectFolderEnabled(true);
  view.setIncludeFolders(true);
  view.setMimeTypes("application/vnd.google-apps.folder");

  return new Promise((resolve) => {
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(token)
      .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY!)
      .setAppId(process.env.NEXT_PUBLIC_GOOGLE_APP_ID!)
      .setTitle("Escolha a pasta de ROMs")
      .setCallback((response) => {
        if (response.action === picker.Action.CANCEL) resolve(null);
        if (response.action === picker.Action.PICKED) {
          const { id, name } = response.docs![0];
          resolve({ id, name });
        }
      })
      .build()
      .setVisible(true);
  });
}
