import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import {
  dispatchTextColorPanelOpen,
  getQuickNoteBridge,
  isNativeQuickNoteHost,
  subscribeToTextColorPanelChange,
  subscribeToTextColorPanelClose,
} from "../../lib/nativeBridge";
import { FilledPaletteIcon } from "../icons/AppIcons";
import { TEXT_COLOR_MORE_PRESETS, TEXT_COLOR_PRESETS } from "./textFormatting";

const COMPACT_COLOR_PALETTE_WIDTH = 168;
const EXPANDED_COLOR_PALETTE_WIDTH = 216;
const COMPACT_COLOR_PALETTE_FALLBACK_HEIGHT = 112;
const EXPANDED_COLOR_PALETTE_FALLBACK_HEIGHT = 246;
const COLOR_PALETTE_GAP = 10;
const COLOR_PALETTE_MARGIN = 12;

type ColorPaletteMode = "compact" | "expanded";

type ColorPickerPopoverProps = {
  activeColor: string | null;
  anchorRef: RefObject<HTMLElement | null>;
  dataTestId?: string;
  isOpen: boolean;
  onApplyColor: (color: string) => void;
  onClose: () => void;
  onPreviewColor?: (color: string) => void;
  zIndexClassName?: string;
};

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

function createColorPanelRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `text-color-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ColorPickerPopover({
  activeColor,
  anchorRef,
  dataTestId = "note-text-color-palette",
  isOpen,
  onApplyColor,
  onClose,
  onPreviewColor,
  zIndexClassName = "z-[80]",
}: ColorPickerPopoverProps) {
  const { t } = useI18n();
  const htmlColorInputRef = useRef<HTMLInputElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const activeColorPanelRequestIdRef = useRef<string | null>(null);
  const [colorPaletteMode, setColorPaletteMode] = useState<ColorPaletteMode>("compact");
  const [colorPaletteStyle, setColorPaletteStyle] = useState<CSSProperties | null>(null);
  const colorPaletteMetrics = getColorPaletteMetrics(colorPaletteMode);

  const syncColorPalettePosition = () => {
    if (!anchorRef.current || typeof window === "undefined") {
      return;
    }

    const paletteHeight = paletteRef.current?.getBoundingClientRect().height ?? colorPaletteMetrics.fallbackHeight;
    setColorPaletteStyle(
      buildColorPaletteStyle(anchorRef.current.getBoundingClientRect(), colorPaletteMetrics.width, paletteHeight),
    );
  };

  const closeColorPalette = () => {
    setColorPaletteStyle(null);
    setColorPaletteMode("compact");
    onClose();
  };

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (anchorRef.current?.contains(event.target)) {
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
  }, [anchorRef, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setColorPaletteMode("compact");
      setColorPaletteStyle(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
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
  }, [colorPaletteMetrics.fallbackHeight, colorPaletteMetrics.width, colorPaletteMode, isOpen]);

  useEffect(() => {
    const unsubscribeChange = subscribeToTextColorPanelChange(({ color, requestId }) => {
      if (requestId !== activeColorPanelRequestIdRef.current) {
        return;
      }

      onPreviewColor?.(color);
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

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        ref={paletteRef}
        data-no-window-drag="true"
        data-testid={dataTestId}
        className={`${zIndexClassName} rounded-[16px] border border-[rgba(213,198,180,0.94)] bg-[rgba(255,251,246,0.98)] p-2 shadow-[0_18px_32px_rgba(61,49,34,0.16)] backdrop-blur-sm`}
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
                  data-tooltip={t.notes.useColor(color)}
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
              data-tooltip={t.notes.moreColors}
              className="relative inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-[9px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,240,229,0.94))] shadow-[0_8px_16px_rgba(61,49,34,0.08)]"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setColorPaletteMode("expanded");
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
                    data-tooltip={t.notes.useColor(color)}
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
              data-tooltip={t.notes.showColors}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-[11px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,240,229,0.96))] px-3 text-[11px] font-semibold text-[rgba(42,32,23,0.88)] shadow-[0_8px_16px_rgba(61,49,34,0.08)]"
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
      </div>
      <input
        ref={htmlColorInputRef}
        type="color"
        className="sr-only"
        tabIndex={-1}
        value={activeColor ?? TEXT_COLOR_PRESETS[0]}
        onChange={(event) => onApplyColor(event.currentTarget.value)}
      />
    </>,
    document.body,
  );
}
