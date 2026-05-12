type CapturableKeyboardEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "isComposing" | "key" | "metaKey" | "repeat" | "shiftKey"
>;

type HotkeyCaptureResult =
  | { ignored: true }
  | { errorCode: "needsModifier" | "unsupported"; ignored?: false; shortcut?: undefined }
  | { error?: undefined; ignored?: false; shortcut: string };

const MODIFIER_KEYS = new Set(["Alt", "Control", "Meta", "Shift"]);

const CODE_TO_KEY_LABEL: Record<string, string> = {
  Backquote: "`",
  Backslash: "\\",
  Backspace: "Delete",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Delete: "Delete",
  Enter: "Return",
  Equal: "=",
  Escape: "Escape",
  Minus: "-",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
  Space: "Space",
  Tab: "Tab",
};

export function getShortcutDisplayLabel(shortcut: string) {
  return shortcut || "Shift+Space";
}

function resolveKeyLabel(event: CapturableKeyboardEvent) {
  if (event.code in CODE_TO_KEY_LABEL) {
    return CODE_TO_KEY_LABEL[event.code]!;
  }

  if (event.code.startsWith("Key")) {
    return event.code.slice(3).toUpperCase();
  }

  if (event.code.startsWith("Digit")) {
    return event.code.slice(5);
  }

  if (event.code.startsWith("Arrow")) {
    return event.code.slice(5);
  }

  if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
    return event.key.toUpperCase();
  }

  return null;
}

export function captureShortcutFromKeyEvent(event: CapturableKeyboardEvent): HotkeyCaptureResult {
  if (event.isComposing || event.repeat) {
    return { ignored: true };
  }

  if (MODIFIER_KEYS.has(event.key)) {
    return { ignored: true };
  }

  const keyLabel = resolveKeyLabel(event);

  if (!keyLabel) {
    return { errorCode: "unsupported" };
  }

  const modifiers = [
    event.metaKey ? "Cmd" : null,
    event.shiftKey ? "Shift" : null,
    event.altKey ? "Option" : null,
    event.ctrlKey ? "Ctrl" : null,
  ].filter(Boolean) as string[];

  if (modifiers.length === 0) {
    return { errorCode: "needsModifier" };
  }

  return { shortcut: [...modifiers, keyLabel].join("+") };
}
