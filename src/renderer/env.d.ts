import type { WinNestApi } from "@/main/preload.js";

declare global {
  interface Window {
    winnest: WinNestApi;
  }
}

export {};
