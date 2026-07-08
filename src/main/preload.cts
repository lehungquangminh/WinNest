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
  },
  onHandoffState(callback: (state: { installerPath?: string; appId?: string; page?: string }) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => {
      if (state && typeof state === "object") {
        callback(state as { installerPath?: string; appId?: string; page?: string });
      }
    };
    ipcRenderer.on("winnest:handoff-state", listener);
    return () => {
      ipcRenderer.off("winnest:handoff-state", listener);
    };
  }
};

contextBridge.exposeInMainWorld("winnest", api);

export type WinNestApi = typeof api;
