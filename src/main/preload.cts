import { contextBridge, ipcRenderer } from "electron";
import type { IpcAction } from "./ipc.js";

const api = {
  async invoke<T>(action: IpcAction, payload?: unknown): Promise<T> {
    return (await ipcRenderer.invoke("winnest:invoke", action, payload)) as T;
  }
};

contextBridge.exposeInMainWorld("winnest", api);

export type WinNestApi = typeof api;
