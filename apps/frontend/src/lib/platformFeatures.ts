import type { HostPlatform } from "@floatem/native-bridge";
import { getFloatemBridge } from "./nativeBridge";

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

export function getPlatformFeatures(platform: HostPlatform = getFloatemBridge().platform) {
  return platformFeatures[platform] ?? platformFeatures.web;
}

export function canUseFloatingNotes() {
  return getPlatformFeatures().floatingNotes;
}

export function canUseFloatingTodos() {
  return getPlatformFeatures().floatingTodos;
}
