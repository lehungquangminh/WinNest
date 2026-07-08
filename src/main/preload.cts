import { contextBridge, ipcRenderer } from "electron";
import type { IpcAction } from "./ipc.js";

const api = {
  async invoke<T>(action: IpcAction, payload?: unknown): Promise<T> {
    return (await ipcRenderer.invoke("winnest:invoke", action, payload)) as T;
  },
  onInstallPath(callback: (installerPath: string) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, installerPath: unknown) => {
      if (typeof installerPath === "string") {
        callback(installerPath);
      }
    };
    ipcRenderer.on("winnest:install-path", listener);
    return () => {
      ipcRenderer.off("winnest:install-path", listener);
    };
  }
};

contextBridge.exposeInMainWorld("winnest", api);

export type WinNestApi = typeof api;
