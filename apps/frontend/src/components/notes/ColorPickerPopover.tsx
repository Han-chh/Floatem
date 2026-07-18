import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { canPickScreenColor, pickScreenColor } from "../../lib/screenColorPicker";
import { FilledPaletteIcon, PaintbrushIcon } from "../icons/AppIcons";
import { TEXT_COLOR_MORE_PRESETS, TEXT_COLOR_PRESETS } from "./textFormatting";

const COMPACT_COLOR_PALETTE_WIDTH = 168;
const EXPANDED_COLOR_PALETTE_WIDTH = 216;
const ADVANCED_COLOR_PALETTE_WIDTH = 288;
const COMPACT_COLOR_PALETTE_FALLBACK_HEIGHT = 112;
const EXPANDED_COLOR_PALETTE_FALLBACK_HEIGHT = 246;
const ADVANCED_COLOR_PALETTE_FALLBACK_HEIGHT = 356;
const COLOR_PALETTE_GAP = 10;
const COLOR_PALETTE_MARGIN = 12;

type ColorPaletteMode = "compact" | "expanded" | "advanced";

type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

type RgbColor = {
  blue: number;
  green: number;
  red: number;
};

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
  if (mode === "advanced") {
    return {
      fallbackHeight: ADVANCED_COLOR_PALETTE_FALLBACK_HEIGHT,
      width: ADVANCED_COLOR_PALETTE_WIDTH,
    };
  }

  if (mode === "expanded") {
    return {
      fallbackHeight: EXPANDED_COLOR_PALETTE_FALLBACK_HEIGHT,
      width: EXPANDED_COLOR_PALETTE_WIDTH,
    };
  }

  return {
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
  const viewportBoundedHeight = Math.min(paletteHeight, window.innerHeight - COLOR_PALETTE_MARGIN * 2);
  const fitsBelow =
    anchorRect.bottom + COLOR_PALETTE_GAP + viewportBoundedHeight <= window.innerHeight - COLOR_PALETTE_MARGIN;
  const top = fitsBelow
    ? anchorRect.bottom + COLOR_PALETTE_GAP
    : Math.max(COLOR_PALETTE_MARGIN, anchorRect.top - viewportBoundedHeight - COLOR_PALETTE_GAP);

  return {
    left,
    maxHeight: Math.max(1, window.innerHeight - top - COLOR_PALETTE_MARGIN),
    overflowY: "auto",
    position: "fixed",
    top,
    transformOrigin: `center ${fitsBelow ? "top" : "bottom"}`,
    width: paletteWidth,
  };
}

function normalizeHexColor(color: string | null | undefined) {
  if (!color) {
    return TEXT_COLOR_PRESETS[0];
  }

  const trimmedColor = color.trim();
  const shortHexMatch = /^#?([0-9a-f]{3})$/i.exec(trimmedColor);
  if (shortHexMatch) {
    return `#${shortHexMatch[1]
      .split("")
      .map((channel) => channel + channel)
      .join("")
      .toUpperCase()}`;
  }

  const longHexMatch = /^#?([0-9a-f]{6})$/i.exec(trimmedColor);
  if (longHexMatch) {
    return `#${longHexMatch[1].toUpperCase()}`;
  }

  return TEXT_COLOR_PRESETS[0];
}

function componentToHex(value: number) {
  return clampValue(Math.round(value), 0, 255).toString(16).padStart(2, "0").toUpperCase();
}

function rgbToHex({ blue, green, red }: RgbColor) {
  return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`;
}

function hexToRgb(color: string): RgbColor {
  const normalizedColor = normalizeHexColor(color);
  return {
    red: parseInt(normalizedColor.slice(1, 3), 16),
    green: parseInt(normalizedColor.slice(3, 5), 16),
    blue: parseInt(normalizedColor.slice(5, 7), 16),
  };
}

function rgbToHsv({ blue, green, red }: RgbColor): HsvColor {
  const normalizedRed = red / 255;
  const normalizedGreen = green / 255;
  const normalizedBlue = blue / 255;
  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === normalizedRed) {
      hue = ((normalizedGreen - normalizedBlue) / delta) % 6;
    } else if (max === normalizedGreen) {
      hue = (normalizedBlue - normalizedRed) / delta + 2;
    } else {
      hue = (normalizedRed - normalizedGreen) / delta + 4;
    }
  }

  hue = Math.round(hue * 60);
  if (hue < 0) {
    hue += 360;
  }

  return {
    hue,
    saturation: max === 0 ? 0 : Math.round((delta / max) * 100),
    value: Math.round(max * 100),
  };
}

function hsvToRgb({ hue, saturation, value }: HsvColor): RgbColor {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = clampValue(saturation, 0, 100) / 100;
  const normalizedValue = clampValue(value, 0, 100) / 100;
  const chroma = normalizedValue * normalizedSaturation;
  const huePrime = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = normalizedValue - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return {
    red: (red + match) * 255,
    green: (green + match) * 255,
    blue: (blue + match) * 255,
  };
}

function getHsvFromColor(color: string | null) {
  return rgbToHsv(hexToRgb(normalizeHexColor(color)));
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
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const [colorPaletteMode, setColorPaletteMode] = useState<ColorPaletteMode>("compact");
  const [colorPaletteStyle, setColorPaletteStyle] = useState<CSSProperties | null>(null);
  const [advancedHsvColor, setAdvancedHsvColor] = useState<HsvColor>(() => getHsvFromColor(activeColor));
  const [hexDraft, setHexDraft] = useState(() => normalizeHexColor(activeColor));
  const [isPickingScreenColor, setIsPickingScreenColor] = useState(false);
  const colorPaletteMetrics = getColorPaletteMetrics(colorPaletteMode);
  const advancedHexColor = rgbToHex(hsvToRgb(advancedHsvColor));
  const hueColor = rgbToHex(hsvToRgb({ hue: advancedHsvColor.hue, saturation: 100, value: 100 }));
  const isScreenColorPickerAvailable = canPickScreenColor();

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
      setAdvancedHsvColor(getHsvFromColor(activeColor));
      setHexDraft(normalizeHexColor(activeColor));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const normalizedActiveColor = normalizeHexColor(activeColor);
    setAdvancedHsvColor(getHsvFromColor(normalizedActiveColor));
    setHexDraft(normalizedActiveColor);
  }, [activeColor, isOpen]);

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

  const previewAdvancedColor = (nextHsvColor: HsvColor) => {
    const normalizedHsvColor = {
      hue: Math.round(clampValue(nextHsvColor.hue, 0, 359)),
      saturation: Math.round(clampValue(nextHsvColor.saturation, 0, 100)),
      value: Math.round(clampValue(nextHsvColor.value, 0, 100)),
    };
    const nextHexColor = rgbToHex(hsvToRgb(normalizedHsvColor));
    setAdvancedHsvColor(normalizedHsvColor);
    setHexDraft(nextHexColor);
    onPreviewColor?.(nextHexColor);
  };

  const handleSaturationValueChange = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const saturation = ((event.clientX - rect.left) / rect.width) * 100;
    const value = (1 - (event.clientY - rect.top) / rect.height) * 100;
    previewAdvancedColor({
      hue: advancedHsvColor.hue,
      saturation,
      value,
    });
  };

  const handleHexDraftChange = (value: string) => {
    const prefixedValue = value.startsWith("#") ? value : `#${value}`;
    setHexDraft(prefixedValue.toUpperCase());

    if (!/^#[0-9A-F]{6}$/i.test(prefixedValue)) {
      return;
    }

    const normalizedHexColor = normalizeHexColor(prefixedValue);
    setAdvancedHsvColor(getHsvFromColor(normalizedHexColor));
    onPreviewColor?.(normalizedHexColor);
  };

  const applyAdvancedColor = () => {
    const normalizedHexDraft = normalizeHexColor(hexDraft);
    onApplyColor(/^#[0-9A-F]{6}$/i.test(hexDraft) ? normalizedHexDraft : advancedHexColor);
  };

  const handlePickScreenColor = async () => {
    if (!isScreenColorPickerAvailable || isPickingScreenColor) {
      return;
    }

    setIsPickingScreenColor(true);

    try {
      const result = await pickScreenColor();
      if (!result) {
        return;
      }

      const normalizedHexColor = normalizeHexColor(result.sRGBHex);
      setAdvancedHsvColor(getHsvFromColor(normalizedHexColor));
      setHexDraft(normalizedHexColor);
      onPreviewColor?.(normalizedHexColor);
    } catch {
      // The browser rejects when the user cancels screen color picking.
    } finally {
      setIsPickingScreenColor(false);
    }
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
        ) : colorPaletteMode === "expanded" ? (
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
                setAdvancedHsvColor(getHsvFromColor(activeColor));
                setHexDraft(normalizeHexColor(activeColor));
                setColorPaletteMode("advanced");
              }}
            >
              <FilledPaletteIcon size={12} className="text-[rgba(42,32,23,0.88)]" />
              <span>{t.notes.showColors}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3" data-testid={`${dataTestId}-advanced`}>
            <div className="flex items-center gap-2">
              <span
                className="h-8 w-8 shrink-0 rounded-[8px] border border-[rgba(213,198,180,0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_8px_14px_rgba(61,49,34,0.12)]"
                style={{ backgroundColor: advancedHexColor }}
              />
              <label className="grid min-w-0 flex-1 gap-1">
                <span className="text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-[var(--muted)]">
                  HEX
                </span>
                <input
                  aria-label="Hex color"
                  className="surface-field h-8 min-w-0 rounded-[9px] px-2 font-mono text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                  maxLength={7}
                  spellCheck={false}
                  value={hexDraft}
                  onChange={(event) => handleHexDraftChange(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyAdvancedColor();
                    }
                  }}
                />
              </label>
              <button
                type="button"
                aria-label={t.notes.pickScreenColor}
                data-tooltip={
                  isScreenColorPickerAvailable ? t.notes.pickScreenColor : t.notes.screenColorPickerUnavailable
                }
                disabled={!isScreenColorPickerAvailable || isPickingScreenColor}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border text-[rgba(42,32,23,0.88)] shadow-[0_8px_14px_rgba(61,49,34,0.1)] ${
                  isScreenColorPickerAvailable
                    ? "border-[rgba(213,198,180,0.92)] bg-[rgba(255,255,255,0.76)] hover:border-[rgba(156,126,94,0.72)]"
                    : "cursor-not-allowed border-[rgba(213,198,180,0.54)] bg-[rgba(248,240,229,0.58)] opacity-55"
                }`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handlePickScreenColor();
                }}
              >
                <PaintbrushIcon size={14} />
              </button>
            </div>

            <div
              role="slider"
              aria-label="Saturation and brightness"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={advancedHsvColor.saturation}
              tabIndex={0}
              className="relative h-[142px] overflow-hidden rounded-[12px] border border-[rgba(213,198,180,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_10px_18px_rgba(61,49,34,0.1)]"
              style={{
                backgroundColor: hueColor,
                backgroundImage:
                  "linear-gradient(90deg, #fff, rgba(255,255,255,0)), linear-gradient(0deg, #000, rgba(0,0,0,0))",
                touchAction: "none",
              }}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 10 : 2;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  previewAdvancedColor({ ...advancedHsvColor, saturation: advancedHsvColor.saturation - step });
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  previewAdvancedColor({ ...advancedHsvColor, saturation: advancedHsvColor.saturation + step });
                } else if (event.key === "ArrowDown") {
                  event.preventDefault();
                  previewAdvancedColor({ ...advancedHsvColor, value: advancedHsvColor.value - step });
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  previewAdvancedColor({ ...advancedHsvColor, value: advancedHsvColor.value + step });
                }
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                handleSaturationValueChange(event);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                  return;
                }

                event.preventDefault();
                handleSaturationValueChange(event);
              }}
            >
              <span
                className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(30,25,21,0.62),0_4px_8px_rgba(30,25,21,0.18)]"
                style={{
                  left: `${advancedHsvColor.saturation}%`,
                  top: `${100 - advancedHsvColor.value}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>

            <div className="grid gap-1.5">
              <input
                aria-label="Hue"
                className="color-hue-slider h-4 w-full appearance-none rounded-full border border-[rgba(213,198,180,0.94)] bg-[linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] shadow-[inset_0_1px_0_rgba(255,255,255,0.52)]"
                max={359}
                min={0}
                style={{ color: hueColor }}
                type="range"
                value={advancedHsvColor.hue}
                onChange={(event) =>
                  previewAdvancedColor({
                    ...advancedHsvColor,
                    hue: Number(event.currentTarget.value),
                  })
                }
              />
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[var(--muted)]">
                <span>H {advancedHsvColor.hue}</span>
                <span>S {advancedHsvColor.saturation}</span>
                <span>V {advancedHsvColor.value}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t.notes.returnToColors}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-[10px] border border-[rgba(213,198,180,0.92)] bg-[rgba(255,255,255,0.7)] px-3 text-[11px] font-semibold text-[var(--muted)]"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setColorPaletteMode("expanded");
                }}
              >
                {t.notes.returnToColors}
              </button>
              <button
                type="button"
                aria-label={t.common.save}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-[10px] border border-[rgba(30,25,21,0.88)] bg-[rgba(30,25,21,0.96)] px-3 text-[11px] font-semibold text-white shadow-[0_10px_18px_rgba(30,25,21,0.16)]"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  applyAdvancedColor();
                }}
              >
                {t.common.save}
              </button>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
