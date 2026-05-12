import { describe, expect, it } from "vitest";
import { captureShortcutFromKeyEvent, getShortcutDisplayLabel } from "../../src/lib/hotkeyCapture";

describe("hotkeyCapture", () => {
  it("formats modifier combinations into app shortcut strings", () => {
    const result = captureShortcutFromKeyEvent({
      altKey: false,
      code: "KeyK",
      ctrlKey: false,
      isComposing: false,
      key: "k",
      metaKey: true,
      repeat: false,
      shiftKey: true,
    });

    expect(result).toEqual({ shortcut: "Cmd+Shift+K" });
  });

  it("ignores modifier-only keydown events while recording", () => {
    const result = captureShortcutFromKeyEvent({
      altKey: false,
      code: "MetaLeft",
      ctrlKey: false,
      isComposing: false,
      key: "Meta",
      metaKey: true,
      repeat: false,
      shiftKey: false,
    });

    expect(result).toEqual({ ignored: true });
  });

  it("rejects shortcuts that do not include a modifier", () => {
    const result = captureShortcutFromKeyEvent({
      altKey: false,
      code: "KeyP",
      ctrlKey: false,
      isComposing: false,
      key: "p",
      metaKey: false,
      repeat: false,
      shiftKey: false,
    });

    expect(result).toEqual({
      errorCode: "needsModifier",
    });
  });

  it("maps supported navigation keys using their parser labels", () => {
    const result = captureShortcutFromKeyEvent({
      altKey: true,
      code: "ArrowUp",
      ctrlKey: false,
      isComposing: false,
      key: "ArrowUp",
      metaKey: false,
      repeat: false,
      shiftKey: false,
    });

    expect(result).toEqual({ shortcut: "Option+Up" });
  });

  it("returns an unsupported code for keys outside the supported map", () => {
    const result = captureShortcutFromKeyEvent({
      altKey: false,
      code: "F13",
      ctrlKey: false,
      isComposing: false,
      key: "F13",
      metaKey: true,
      repeat: false,
      shiftKey: false,
    });

    expect(result).toEqual({ errorCode: "unsupported" });
  });

  it("falls back to the default display label when the shortcut is empty", () => {
    expect(getShortcutDisplayLabel("")).toBe("Shift+Space");
  });
});
