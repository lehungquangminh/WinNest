import { contextBridge, ipcRenderer } from "electron";
import type { IpcAction } from "@/main/ipc.js";

const api = {
  invoke: async <T>(action: IpcAction, payload?: unknown): Promise<T> => {
    return (await ipcRenderer.invoke("winnest:invoke", action, payload)) as T;
  }
};

contextBridge.exposeInMainWorld("winnest", api);

export type WinNestApi = typeof api;
