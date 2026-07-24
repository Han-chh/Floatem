import type { ScreenColorPickResult } from "@floatem/native-bridge";
import { getFloatemBridge, isNativeFloatemHost, type FloatemNativeBridge } from "./nativeBridge";

type BrowserScreenColorPicker = {
  open: () => Promise<ScreenColorPickResult>;
};

type BrowserScreenColorPickerConstructor = {
  new (): BrowserScreenColorPicker;
};

declare global {
  interface Window {
    EyeDropper?: BrowserScreenColorPickerConstructor;
  }
}

function getNativeScreenColorPicker() {
  if (!isNativeFloatemHost()) {
    return null;
  }

  const bridge = getFloatemBridge() as Partial<FloatemNativeBridge>;
  return typeof bridge.pickScreenColor === "function" ? bridge.pickScreenColor.bind(bridge) : null;
}

export function canPickScreenColor() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(getNativeScreenColorPicker() || typeof window.EyeDropper === "function");
}

export async function pickScreenColor() {
  const nativePickScreenColor = getNativeScreenColorPicker();
  if (nativePickScreenColor) {
    return await nativePickScreenColor();
  }

  if (typeof window === "undefined" || typeof window.EyeDropper !== "function") {
    return null;
  }

  return await new window.EyeDropper().open();
}
