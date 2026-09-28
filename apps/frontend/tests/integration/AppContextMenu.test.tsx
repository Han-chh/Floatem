import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppContextMenu } from "../../src/components/layout/AppContextMenu";
import { useSettingsStore } from "../../src/store/settingsStore";

const originalHostBridge = window.floatemHost;
const originalNativeBridge = window.floatemNative;

describe("AppContextMenu", () => {
  afterEach(() => {
    window.floatemHost = originalHostBridge;
    window.floatemNative = originalNativeBridge;
  });

  it("shows the localized Quit Floatem action and invokes the native quit bridge", async () => {
    const quitApplication = vi.fn(async () => {});
    window.floatemHost = {
      loadAllData: vi.fn(),
      quitApplication,
    } as unknown as NonNullable<typeof window.floatemHost>;
    useSettingsStore.setState({ language: "en" });
    const user = userEvent.setup();

    render(<AppContextMenu />);
    fireEvent.contextMenu(document.body, { clientX: 120, clientY: 160 });

    expect(screen.getByRole("menu", { name: "Floatem actions" })).toHaveClass("w-[136px]", "rounded-[12px]", "p-1");
    const quitItem = screen.getByRole("menuitem", { name: "Quit Floatem" });
    expect(quitItem).toHaveClass("min-h-8", "text-[11.5px]", "px-2.5", "py-1.5");
    await user.click(quitItem);
    expect(quitApplication).toHaveBeenCalledOnce();
  });

  it("keeps an editor focused while the context menu is open", () => {
    window.floatemHost = {
      loadAllData: vi.fn(),
      quitApplication: vi.fn(async () => {}),
    } as unknown as NonNullable<typeof window.floatemHost>;
    useSettingsStore.setState({ language: "en" });

    render(
      <>
        <input aria-label="Note editor" />
        <AppContextMenu />
      </>,
    );
    const editor = screen.getByRole("textbox", { name: "Note editor" });
    editor.focus();
    fireEvent.contextMenu(editor, { clientX: 120, clientY: 160 });

    expect(editor).toHaveFocus();
    expect(screen.getByRole("menu", { name: "Floatem actions" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Floatem actions" })).not.toBeInTheDocument();
  });

  it("does not add a context menu outside a native Floatem host", () => {
    delete window.floatemHost;
    delete window.floatemNative;
    useSettingsStore.setState({ language: "zh-CN" });

    render(<AppContextMenu />);
    fireEvent.contextMenu(document.body, { clientX: 120, clientY: 160 });

    expect(screen.queryByRole("menu", { name: "Floatem 操作" })).not.toBeInTheDocument();
  });
});
