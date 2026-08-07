import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { formatLocalDateKey } from "../../src/lib/models";
import { PANEL_WILL_OPEN_EVENT, SHORTCUT_INVOKED_EVENT } from "../../src/lib/nativeBridge";
import { useTodosStore } from "../../src/store/todosStore";

describe("FloatemApp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns Todo to today only when a global shortcut summons the panel", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T10:00:00"));
    render(<App />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(useTodosStore.getState().isLoaded).toBe(true);

    act(() => {
      useTodosStore.getState().selectDate("2026-08-12");
      window.dispatchEvent(new Event(PANEL_WILL_OPEN_EVENT));
    });
    expect(useTodosStore.getState().selectedDateKey).toBe("2026-08-12");

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SHORTCUT_INVOKED_EVENT, { detail: { shortcut: "Shift+Space" } }),
      );
    });
    expect(useTodosStore.getState().selectedDateKey).toBe(formatLocalDateKey(new Date()));
  });
});
