import { motion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import {
  dispatchTextColorPanelOpen,
  getQuickNoteBridge,
  isNativeQuickNoteHost,
  subscribeToTextColorPanelChange,
  subscribeToTextColorPanelClose,
} from "../../lib/nativeBridge";
import {
  BoldIcon,
  ClearIcon,
  CopyIcon,
  FilledPaletteIcon,
  ItalicIcon,
  PaletteIcon,
  PasteIcon,
  UnderlineIcon,
} from "../icons/AppIcons";
import { TEXT_COLOR_MORE_PRESETS, TEXT_COLOR_PRESETS, TEXT_FORMAT_SHORTCUTS, type TextFormat } from "./textFormatting";

const COMPACT_COLOR_PALETTE_WIDTH = 168;
const EXPANDED_COLOR_PALETTE_WIDTH = 216;
const COMPACT_COLOR_PALETTE_FALLBACK_HEIGHT = 112;
const EXPANDED_COLOR_PALETTE_FALLBACK_HEIGHT = 246;
const COLOR_PALETTE_GAP = 10;
const COLOR_PALETTE_MARGIN = 12;

type ColorPaletteMode = "compact" | "expanded";

function clampValue(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getColorPaletteMetrics(mode: ColorPaletteMode) {
  return mode === "expanded"
    ? {
        fallbackHeight: EXPANDED_COLOR_PALETTE_FALLBACK_HEIGHT,
        width: EXPANDED_COLOR_PALETTE_WIDTH,
      }
    : {
        fallbackHeight: COMPACT_COLOR_PALETTE_FALLBACK_HEIGHT,
        width: COMPACT_COLOR_PALETTE_WIDTH,
      };
}

function buildColorPaletteStyle(anchorRect: DOMRect, paletteWidth: number, paletteHeight: number): CSSProperties {
  const maxLeft = Math.max(COLOR_PALETTE_MARGIN, window.innerWidth - paletteWidth - COLOR_PALETTE_MARGIN);
  const left = clampValue(
    anchorRect.left + anchorRect.width / 2 - paletteWidth / 2,
    COLOR_PALETTE_MARGIN,
    maxLeft,
  );
  const fitsBelow = anchorRect.bottom + COLOR_PALETTE_GAP + paletteHeight <= window.innerHeight - COLOR_PALETTE_MARGIN;
  const top = fitsBelow
    ? anchorRect.bottom + COLOR_PALETTE_GAP
    : Math.max(COLOR_PALETTE_MARGIN, anchorRect.top - paletteHeight - COLOR_PALETTE_GAP);

  return {
    left,
    position: "fixed",
    top,
    transformOrigin: `center ${fitsBelow ? "top" : "bottom"}`,
    width: paletteWidth,
  };
}

type ToolbarItem = {
  action?: "clear" | "color" | "copy" | "paste";
  activeTone?: string;
  format?: TextFormat;
  icon: ComponentType<{ size?: number }>;
  label: string;
  shortcut?: string;
  tone: string;
  tooltipClassName?: string;
};

type ToolbarProps = {
  activeColor: string | null;
  activeFormats: Record<TextFormat, boolean>;
  isColorPaletteOpen: boolean;
  onApplyColor: (color: string) => void;
  onClearFormatting: () => void;
  onCloseColorPalette: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onPreviewColor: (color: string) => void;
  onToggleColorPalette: () => void;
  onToggleFormat: (format: TextFormat) => void;
};

function createColorPanelRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `text-color-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function Toolbar({
  activeColor,
  activeFormats,
  isColorPaletteOpen,
  onApplyColor,
  onClearFormatting,
  onCloseColorPalette,
  onCopy,
  onPaste,
  onPreviewColor,
  onToggleColorPalette,
  onToggleFormat,
}: ToolbarProps) {
  const { t } = useI18n();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
  const htmlColorInputRef = useRef<HTMLInputElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const activeColorPanelRequestIdRef = useRef<string | null>(null);
  const [colorPaletteMode, setColorPaletteMode] = useState<ColorPaletteMode>("compact");
  const [colorPaletteStyle, setColorPaletteStyle] = useState<CSSProperties | null>(null);
  const colorPaletteMetrics = getColorPaletteMetrics(colorPaletteMode);
  const toolItems: ToolbarItem[] = [
    {
      label: t.notes.bold,
      icon: BoldIcon,
      tone: "text-[#1E1915] bg-white/88",
      activeTone:
        "border-[rgba(30,25,21,0.58)] bg-[#1E1915] text-white shadow-[0_12px_24px_rgba(30,25,21,0.22)]",
      format: "bold",
      shortcut: TEXT_FORMAT_SHORTCUTS.bold,
      tooltipClassName: "left-[calc(50%+10px)] -translate-x-1/2",
    },
    {
      label: t.notes.italic,
      icon: ItalicIcon,
      tone: "text-[#5D44D4] bg-[rgba(123,92,250,0.10)]",
      activeTone:
        "border-[rgba(93,68,212,0.48)] bg-[#5D44D4] text-white shadow-[0_12px_24px_rgba(93,68,212,0.24)]",
      format: "italic",
      shortcut: TEXT_FORMAT_SHORTCUTS.italic,
    },
    {
      label: t.notes.underline,
      icon: UnderlineIcon,
      tone: "text-[#B64B2E] bg-[rgba(255,122,89,0.10)]",
      activeTone:
        "border-[rgba(182,75,46,0.46)] bg-[#B64B2E] text-white shadow-[0_12px_24px_rgba(182,75,46,0.22)]",
      format: "underline",
      shortcut: TEXT_FORMAT_SHORTCUTS.underline,
    },
    {
      action: "color",
      label: t.notes.color,
      icon: PaletteIcon,
      tone: "text-[#2853C7] bg-[rgba(47,107,255,0.10)]",
    },
    {
      action: "copy",
      label: t.notes.copy,
      icon: CopyIcon,
      shortcut: "Cmd+C",
      tone: "text-[#8752C8] bg-[rgba(159,101,255,0.12)]",
    },
    {
      action: "paste",
      label: t.notes.paste,
      icon: PasteIcon,
      shortcut: "Cmd+V",
      tone: "text-[#23786A] bg-[rgba(38,170,133,0.12)]",
    },
    {
      action: "clear",
      label: t.notes.toolbarClear,
      icon: ClearIcon,
      tone: "text-[#A24A2D] bg-[rgba(255,122,89,0.12)]",
    },
  ];

  const syncColorPalettePosition = () => {
    if (!colorButtonRef.current || typeof window === "undefined") {
      return;
    }

    const paletteHeight = paletteRef.current?.getBoundingClientRect().height ?? colorPaletteMetrics.fallbackHeight;
    setColorPaletteStyle(
      buildColorPaletteStyle(colorButtonRef.current.getBoundingClientRect(), colorPaletteMetrics.width, paletteHeight),
    );
  };

  const closeColorPalette = () => {
    setColorPaletteStyle(null);
    setColorPaletteMode("compact");
    onCloseColorPalette();
  };

  const expandColorPalette = () => {
    setColorPaletteStyle(null);
    setColorPaletteMode("expanded");
  };

  useEffect(() => {
    if (!isColorPaletteOpen || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (toolbarRef.current?.contains(event.target)) {
        return;
      }

      if (paletteRef.current?.contains(event.target)) {
        return;
      }

      closeColorPalette();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isColorPaletteOpen, onCloseColorPalette]);

  useEffect(() => {
    if (!isColorPaletteOpen) {
      setColorPaletteMode("compact");
    }
  }, [isColorPaletteOpen]);

  useEffect(() => {
    if (!isColorPaletteOpen || typeof window === "undefined") {
      setColorPaletteStyle(null);
      return;
    }

    const handleReposition = () => {
      syncColorPalettePosition();
    };
    const animationFrame = window.requestAnimationFrame(handleReposition);

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [colorPaletteMode, isColorPaletteOpen]);

  useEffect(() => {
    const unsubscribeChange = subscribeToTextColorPanelChange(({ color, requestId }) => {
      if (requestId !== activeColorPanelRequestIdRef.current) {
        return;
      }

      onPreviewColor(color);
    });
    const unsubscribeClose = subscribeToTextColorPanelClose(({ requestId }) => {
      if (requestId !== activeColorPanelRequestIdRef.current) {
        return;
      }

      activeColorPanelRequestIdRef.current = null;
    });

    return () => {
      unsubscribeChange();
      unsubscribeClose();
    };
  }, [onPreviewColor]);

  const handleOpenSystemColorPanel = async () => {
    if (isNativeQuickNoteHost()) {
      const requestId = createColorPanelRequestId();
      activeColorPanelRequestIdRef.current = requestId;
      dispatchTextColorPanelOpen();
      await getQuickNoteBridge().openTextColorPanel({
        color: activeColor ?? TEXT_COLOR_PRESETS[0],
        requestId,
      });
      closeColorPalette();
      return;
    }

    const colorInput = htmlColorInputRef.current;
    if (!colorInput) {
      return;
    }

    colorInput.value = activeColor ?? TEXT_COLOR_PRESETS[0];

    if (typeof colorInput.showPicker === "function") {
      colorInput.showPicker();
      closeColorPalette();
      return;
    }

    colorInput.click();
    closeColorPalette();
  };

  const handleAction = (action?: ToolbarItem["action"]) => {
    if (action === "color") {
      setColorPaletteStyle(null);
      setColorPaletteMode("compact");

      if (!isColorPaletteOpen) {
        syncColorPalettePosition();
      }

      onToggleColorPalette();
      return;
    }

    if (action === "copy") {
      onCopy();
      return;
    }

    if (action === "paste") {
      onPaste();
      return;
    }

    if (action === "clear") {
      onClearFormatting();
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="paper-card note-toolbar-grid relative rounded-[15px] bg-[rgba(255,250,244,0.66)] px-1.25 py-1.25"
    >
      {toolItems.map(({ action, activeTone, format, label, icon: Icon, shortcut, tone, tooltipClassName }, index) => {
        const isActive =
          format ? activeFormats[format] : action === "color" ? Boolean(activeColor) || isColorPaletteOpen : false;

        return (
          <motion.button
            key={label}
            type="button"
            ref={action === "color" ? colorButtonRef : undefined}
            aria-label={label}
            aria-pressed={format ? isActive : undefined}
            onPointerDown={
              format
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggleFormat(format);
                  }
                : (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleAction(action);
                  }
            }
            onClick={
              format || action
                ? (event) => {
                    if (event.detail !== 0) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    if (format) {
                      onToggleFormat(format);
                      return;
                    }

                    handleAction(action);
                  }
                : undefined
            }
            className={`group relative inline-flex h-7 w-7 items-center justify-center rounded-[9px] border border-[rgba(213,198,180,0.86)] shadow-[0_6px_12px_rgba(61,49,34,0.05)] transition-[background-color,border-color,color,box-shadow] ${
              isActive && activeTone ? activeTone : tone
            }`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: 0.02 * index }}
            whileHover={{ y: -1.5, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            >
              <Icon size={12} />
              {action === "color" ? (
                <span
                  className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white/75"
                  style={{ backgroundColor: activeColor ?? TEXT_COLOR_PRESETS[0] }}
                />
              ) : null}
              <span
                className={`pointer-events-none absolute -top-8 z-10 inline-flex items-center gap-1.5 rounded-full bg-[rgba(30,25,21,0.94)] px-2 py-1 text-[10px] font-semibold leading-none tracking-[0.01em] whitespace-nowrap text-white opacity-0 shadow-[0_10px_20px_rgba(30,25,21,0.18)] transition-all duration-75 ease-out group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100 ${
                  tooltipClassName ?? "left-1/2 -translate-x-1/2"
              }`}
            >
              <span>{label}</span>
              {shortcut ? <span className="text-white/72">{shortcut}</span> : null}
            </span>
          </motion.button>
        );
      })}

      {isColorPaletteOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={paletteRef}
              data-no-window-drag="true"
              data-testid="note-text-color-palette"
              className="z-[80] rounded-[16px] border border-[rgba(213,198,180,0.94)] bg-[rgba(255,251,246,0.98)] p-2 shadow-[0_18px_32px_rgba(61,49,34,0.16)] backdrop-blur-sm"
              style={
                colorPaletteStyle
                  ? { ...colorPaletteStyle, width: colorPaletteMetrics.width }
                  : {
                      left: COLOR_PALETTE_MARGIN,
                      opacity: 0,
                      pointerEvents: "none",
                      position: "fixed",
                      top: COLOR_PALETTE_MARGIN,
                      width: colorPaletteMetrics.width,
                    }
              }
            >
              {colorPaletteMode === "compact" ? (
                <div className="grid grid-cols-5 gap-2">
                  {TEXT_COLOR_PRESETS.map((color) => {
                    const isSelected = activeColor === color;

                    return (
                      <button
                        key={color}
                        type="button"
                        aria-label={t.notes.useColor(color)}
                        aria-pressed={isSelected}
                        className={`group relative inline-flex h-6 w-6 items-center justify-center rounded-full border transition-transform ${
                          isSelected
                            ? "scale-[1.08] border-[rgba(30,25,21,0.42)] shadow-[0_8px_16px_rgba(61,49,34,0.16)]"
                            : "border-[rgba(213,198,180,0.92)]"
                        }`}
                        style={{ backgroundColor: color }}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onApplyColor(color);
                        }}
                      >
                        <span className="pointer-events-none absolute inset-[-3px] rounded-full border-2 border-white/92 opacity-0 shadow-[0_0_0_1px_rgba(61,49,34,0.16)] transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100" />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-label={t.notes.moreColors}
                    className="relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-[9px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,240,229,0.94))] shadow-[0_8px_16px_rgba(61,49,34,0.08)]"
                    title={t.notes.moreColors}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      expandColorPalette();
                    }}
                  >
                    <span className="pointer-events-none absolute inset-[1px] rounded-[8px] bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.95),rgba(255,255,255,0.18)_42%,transparent_70%),linear-gradient(135deg,rgba(255,122,89,0.36),rgba(244,185,66,0.3),rgba(31,168,122,0.28),rgba(47,107,255,0.28),rgba(123,92,250,0.28))]" />
                    <FilledPaletteIcon
                      size={12}
                      className="relative text-[rgba(42,32,23,0.88)] drop-shadow-[0_1px_1px_rgba(255,255,255,0.22)]"
                    />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-8 gap-1">
                    {TEXT_COLOR_MORE_PRESETS.map((color) => {
                      const isSelected = activeColor === color;

                      return (
                        <button
                          key={color}
                          type="button"
                          aria-label={t.notes.useColor(color)}
                          aria-pressed={isSelected}
                          className={`group relative inline-flex h-4 w-4 items-center justify-center rounded-[3px] border transition-transform ${
                            isSelected
                              ? "scale-[1.06] border-[rgba(30,25,21,0.62)] shadow-[0_6px_12px_rgba(61,49,34,0.14)]"
                              : "border-[rgba(213,198,180,0.92)]"
                          }`}
                          style={{ backgroundColor: color }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onApplyColor(color);
                          }}
                        >
                          <span className="pointer-events-none absolute inset-[-2px] rounded-[4px] border-2 border-white/92 opacity-0 shadow-[0_0_0_1px_rgba(61,49,34,0.16)] transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    aria-label={t.notes.showColors}
                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[11px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,240,229,0.96))] px-3 text-[11px] font-semibold text-[rgba(42,32,23,0.88)] shadow-[0_8px_16px_rgba(61,49,34,0.08)]"
                    title={t.notes.showColors}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void handleOpenSystemColorPanel();
                    }}
                  >
                    <FilledPaletteIcon size={12} className="text-[rgba(42,32,23,0.88)]" />
                    <span>{t.notes.showColors}</span>
                  </button>
                </div>
              )}
              <input
                ref={htmlColorInputRef}
                type="color"
                aria-label={`${t.notes.showColors}: ${activeColor ?? TEXT_COLOR_PRESETS[0]}`}
                tabIndex={-1}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                value={activeColor ?? TEXT_COLOR_PRESETS[0]}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onChange={(event) => {
                  onApplyColor(event.currentTarget.value);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
