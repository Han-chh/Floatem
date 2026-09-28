import { getFloatemBridge, isNativeFloatemHost } from "./nativeBridge";

export type RichTextClipboardContent = {
  html: string;
  text: string;
};

function normalizeRichTextClipboardContent(value: Partial<RichTextClipboardContent> | undefined): RichTextClipboardContent {
  return {
    html: typeof value?.html === "string" ? value.html : "",
    text: typeof value?.text === "string" ? value.text : "",
  };
}

export async function writeRichTextToClipboard({ html, text }: RichTextClipboardContent) {
  if (!text) {
    return false;
  }

  if (isNativeFloatemHost()) {
    try {
      const bridge = getFloatemBridge();

      if (bridge.writeClipboardRichText) {
        await bridge.writeClipboardRichText(html, text);
        return true;
      }
    } catch {
      // Fall through to the browser clipboard helpers.
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        }),
      ]);
      return true;
    }
  } catch {
    // Fall through to the plain-text clipboard helper.
  }

  return writePlainTextToClipboard(text);
}

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

export async function readRichTextFromClipboard(): Promise<RichTextClipboardContent> {
  if (isNativeFloatemHost()) {
    try {
      const bridge = getFloatemBridge();

      if (bridge.readClipboardRichText) {
        return normalizeRichTextClipboardContent(await bridge.readClipboardRichText());
      }
    } catch {
      // Fall through to the browser clipboard helpers.
    }
  }

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.read) {
      const [item] = await navigator.clipboard.read();

      if (item) {
        const html = item.types.includes("text/html")
          ? await (await item.getType("text/html")).text()
          : "";
        const text = item.types.includes("text/plain")
          ? await (await item.getType("text/plain")).text()
          : "";

        if (html || text) {
          return { html, text };
        }
      }
    }
  } catch {
    // Clipboard reads can fail in preview environments without permission.
  }

  return { html: "", text: await readPlainTextFromClipboard() };
}
