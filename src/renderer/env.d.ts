import type { WinNestApi } from "@/main/preload.cjs";

declare global {
  interface Window {
    winnest: WinNestApi;
  }
}

export {};
