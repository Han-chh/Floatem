import { getFloatemBridge, isNativeFloatemHost } from "./nativeBridge";

export async function writePlainTextToClipboard(text: string) {
  if (!text) {
    return false;
  }

  if (isNativeFloatemHost()) {
    try {
      await getFloatemBridge().writeClipboardText(text);
      return true;
    } catch {
      // Fall through to the browser clipboard helpers.
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path.
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  textarea.style.inset = "0";
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    return Boolean(document.execCommand?.("copy"));
  } finally {
    textarea.remove();
  }
}

export async function readPlainTextFromClipboard() {
  if (isNativeFloatemHost()) {
    try {
      return await getFloatemBridge().readClipboardText();
    } catch {
      // Fall through to the browser clipboard helpers.
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
  } catch {
    // Clipboard reads can fail in preview environments without permission.
  }

  return "";
}
