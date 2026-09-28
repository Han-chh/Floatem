import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { getFloatemBridge, isNativeFloatemHost } from "../../lib/nativeBridge";

type ContextMenuPosition = {
  x: number;
  y: number;
};

const MENU_WIDTH = 184;
const MENU_HEIGHT = 52;
const VIEWPORT_MARGIN = 8;

function clampMenuPosition(clientX: number, clientY: number): ContextMenuPosition {
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(clientX, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN)),
    y: Math.max(VIEWPORT_MARGIN, Math.min(clientY, window.innerHeight - MENU_HEIGHT - VIEWPORT_MARGIN)),
  };
}

export function AppContextMenu() {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  const nativeHost = isNativeFloatemHost();

  useEffect(() => {
    if (!nativeHost || typeof document === "undefined") {
      return;
    }

    const closeMenu = () => setPosition(null);
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setPosition(clampMenuPosition(event.clientX, event.clientY));
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("scroll", closeMenu, true);
    window.addEventListener("blur", closeMenu);
    window.addEventListener("resize", closeMenu);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("blur", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [nativeHost]);

  if (!nativeHost || !position || typeof document === "undefined") {
    return null;
  }

  const quitApplication = () => {
    setPosition(null);
    void getFloatemBridge().quitApplication().catch((error) => {
      console.error("Floatem could not quit from its context menu.", error);
    });
  };

  return createPortal(
    <motion.div
      ref={menuRef}
      role="menu"
      aria-label={t.settings.applicationContextMenu}
      data-no-window-drag="true"
      className="fixed z-[220] w-[184px] rounded-[15px] border border-[rgba(213,198,180,0.94)] bg-[rgba(255,252,247,0.97)] p-1.5 shadow-[0_18px_42px_rgba(30,25,21,0.24)] backdrop-blur-xl"
      style={{ left: position.x, top: position.y }}
      initial={{ opacity: 0, scale: 0.96, y: -3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className="flex w-full items-center rounded-[11px] px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#a84431] outline-none transition-colors hover:bg-[rgba(201,93,68,0.10)] focus-visible:bg-[rgba(201,93,68,0.12)]"
        onClick={quitApplication}
      >
        {t.settings.contextMenuQuitApplication}
      </button>
    </motion.div>,
    document.body,
  );
}
