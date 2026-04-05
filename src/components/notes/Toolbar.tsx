import { motion } from "framer-motion";
import { useRef, type ComponentType } from "react";
import { useI18n } from "../../lib/i18n";
import {
  BoldIcon,
  ClearIcon,
  CopyIcon,
  ItalicIcon,
  PaletteIcon,
  PasteIcon,
  UnderlineIcon,
} from "../icons/AppIcons";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { TEXT_COLOR_PRESETS, TEXT_FORMAT_SHORTCUTS, type TextFormat } from "./textFormatting";

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
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
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

  const handleAction = (action?: ToolbarItem["action"]) => {
    if (action === "color") {
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

      <ColorPickerPopover
        activeColor={activeColor}
        anchorRef={colorButtonRef}
        isOpen={isColorPaletteOpen}
        onApplyColor={onApplyColor}
        onClose={onCloseColorPalette}
        onPreviewColor={onPreviewColor}
      />
    </div>
  );
}
