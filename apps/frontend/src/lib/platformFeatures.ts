import type { HostPlatform } from "@quicknote/native-bridge";
import { getQuickNoteBridge } from "./nativeBridge";

export type PlatformFloatingFeatures = {
  floatingNotes: boolean;
  floatingTodos: boolean;
};

export const platformFeatures: Record<HostPlatform, PlatformFloatingFeatures> = {
  macos: {
    floatingNotes: true,
    floatingTodos: true,
  },
  windows: {
    floatingNotes: false,
    floatingTodos: false,
  },
  web: {
    floatingNotes: false,
    floatingTodos: false,
  },
};

export function getPlatformFeatures(platform: HostPlatform = getQuickNoteBridge().platform) {
  return platformFeatures[platform] ?? platformFeatures.web;
}

export function canUseFloatingNotes() {
  return getPlatformFeatures().floatingNotes;
}

export function canUseFloatingTodos() {
  return getPlatformFeatures().floatingTodos;
}
