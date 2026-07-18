import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { useI18n } from "../../lib/i18n";
import {
  getNoteToolbarStateKey,
  NOTE_TOOLBAR_STATE_EVENT,
  readNoteToolbarCollapsed,
  writeNoteToolbarCollapsed,
} from "../../lib/noteToolbarState";
import {
  BoldIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClearIcon,
  CopyIcon,
  ItalicIcon,
  PaletteIcon,
  PasteIcon,
  RedoIcon,
  UndoIcon,
  UnderlineIcon,
} from "../icons/AppIcons";
import { ColorPickerPopover } from "./ColorPickerPopover";
import { TEXT_COLOR_PRESETS, TEXT_FORMAT_SHORTCUTS, TEXT_HISTORY_SHORTCUTS, type TextFormat } from "./textFormatting";

type ToolbarItem = {
  action?: "clear" | "color" | "copy" | "paste" | "redo" | "undo";
  activeTone?: string;
  disabled?: boolean;
  format?: TextFormat;
  icon: ComponentType<{ size?: number }>;
  label: string;
  shortcut?: string;
  tone: string;
  tooltipAlign?: "left" | "right";
};

type ToolbarProps = {
  activeColor: string | null;
  activeFormats: Record<TextFormat, boolean>;
  canRedo: boolean;
  canUndo: boolean;
  attached?: boolean;
  instant?: boolean;
  isColorPaletteOpen: boolean;
  onApplyColor: (color: string) => void;
  onClearFormatting: () => void;
  onCloseColorPalette: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onPreviewColor: (color: string) => void;
  onRedo: () => void;
  onToggleColorPalette: () => void;
  onToggleFormat: (format: TextFormat) => void;
  onUndo: () => void;
  noteId?: string;
  visualOnly?: boolean;
};

export function Toolbar({
  activeColor,
  activeFormats,
  attached = false,
  canRedo,
  canUndo,
  instant = false,
  isColorPaletteOpen,
  onApplyColor,
  onClearFormatting,
  onCloseColorPalette,
  onCopy,
  onPaste,
  onPreviewColor,
  onRedo,
  onToggleColorPalette,
  onToggleFormat,
  onUndo,
  noteId,
  visualOnly = false,
}: ToolbarProps) {
  const { t } = useI18n();
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => readNoteToolbarCollapsed(noteId));
  const toolItems: ToolbarItem[] = [
    {
      label: t.notes.bold,
      icon: BoldIcon,
      tone: "text-[#1E1915] bg-white/88",
      activeTone:
        "border-[rgba(30,25,21,0.58)] bg-[#1E1915] text-white shadow-[0_12px_24px_rgba(30,25,21,0.22)]",
      format: "bold",
      shortcut: TEXT_FORMAT_SHORTCUTS.bold,
      tooltipAlign: "right",
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
    {
      action: "undo",
      disabled: !canUndo,
      label: t.notes.undo,
      icon: UndoIcon,
      shortcut: TEXT_HISTORY_SHORTCUTS.undo,
      tone: "text-[#7A5E39] bg-[rgba(191,155,101,0.12)]",
    },
    {
      action: "redo",
      disabled: !canRedo,
      label: t.notes.redo,
      icon: RedoIcon,
      shortcut: TEXT_HISTORY_SHORTCUTS.redo,
      tone: "text-[#3B6D8A] bg-[rgba(63,156,168,0.12)]",
      tooltipAlign: "left",
    },
  ];

  const handleAction = (action?: ToolbarItem["action"], disabled?: boolean) => {
    if (disabled) {
      return;
    }

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

    if (action === "undo") {
      onUndo();
      return;
    }

    if (action === "redo") {
      onRedo();
      return;
    }

    if (action === "clear") {
      onClearFormatting();
    }
  };

  const toggleCollapsed = () => {
    if (visualOnly) {
      return;
    }

    if (!isCollapsed) {
      onCloseColorPalette();
    }
    const next = !isCollapsed;
    setIsCollapsed(next);
    writeNoteToolbarCollapsed(noteId, next);
  };

  useEffect(() => {
    setIsCollapsed(readNoteToolbarCollapsed(noteId));

    if (!noteId || typeof window === "undefined") {
      return;
    }

    const storageKey = getNoteToolbarStateKey(noteId);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setIsCollapsed(event.newValue === "true");
      }
    };
    const handleToolbarState = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed: boolean; noteId: string }>).detail;
      if (detail?.noteId === noteId) {
        setIsCollapsed(detail.collapsed);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(NOTE_TOOLBAR_STATE_EVENT, handleToolbarState);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(NOTE_TOOLBAR_STATE_EVENT, handleToolbarState);
    };
  }, [noteId]);

  return (
    <motion.div
      className={`${attached ? "note-toolbar-attached" : "paper-card"} note-toolbar-grid relative transition-[width] duration-200 ease-out ${
        isCollapsed
          ? attached
            ? "note-toolbar-attached--collapsed"
            : "w-8 rounded-[14px] bg-[rgba(255,250,244,0.66)] px-1 py-1"
          : attached
            ? "note-toolbar-attached--expanded"
            : "w-full rounded-[14px] bg-[rgba(255,250,244,0.66)] px-1 py-1"
      }`}
      layout
      transition={{ layout: { duration: instant ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] } }}
    >
      {!isCollapsed ? toolItems.map(({ action, activeTone, disabled, format, label, icon: Icon, shortcut, tone, tooltipAlign }, index) => {
        const isActive =
          format ? activeFormats[format] : action === "color" ? Boolean(activeColor) || isColorPaletteOpen : false;

        return (
          <motion.button
            key={label}
            type="button"
            ref={action === "color" ? colorButtonRef : undefined}
            aria-label={label}
            aria-disabled={disabled ? "true" : "false"}
            aria-pressed={format ? isActive : undefined}
            data-tooltip={shortcut ? `${label} ${shortcut}` : label}
            data-tooltip-align={tooltipAlign}
            onPointerDown={
              visualOnly
                ? undefined
                : format
                ? (event) => {
                    if (disabled) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    onToggleFormat(format);
                  }
                : (event) => {
                    if (disabled) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    handleAction(action, disabled);
                  }
            }
            onClick={
              !visualOnly && (format || action)
                ? (event) => {
                    if (disabled) {
                      return;
                    }

                    if (event.detail !== 0) {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    if (format) {
                      onToggleFormat(format);
                      return;
                    }

                    handleAction(action, disabled);
                  }
                : undefined
            }
            className={`group relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(213,198,180,0.86)] shadow-[0_5px_10px_rgba(61,49,34,0.05)] transition-[background-color,border-color,color,box-shadow] ${
              isActive && activeTone ? activeTone : tone
            } ${
              disabled ? "opacity-45 saturate-75" : ""
            }`}
            initial={instant ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={instant ? { duration: 0 } : { duration: 0.18, delay: 0.02 * index }}
            whileHover={visualOnly || disabled ? undefined : { y: -1.5, scale: 1.03 }}
            whileTap={visualOnly || disabled ? undefined : { scale: 0.97 }}
          >
            <Icon size={11} />
            {action === "color" ? (
              <span
                className="pointer-events-none absolute bottom-[3px] right-[3px] h-1.5 w-1.5 rounded-full border border-white/75"
                style={{ backgroundColor: activeColor ?? TEXT_COLOR_PRESETS[0] }}
              />
            ) : null}
          </motion.button>
        );
      }) : null}

      <motion.button
        type="button"
        aria-label={isCollapsed ? t.notes.expandToolbar : t.notes.collapseToolbar}
        aria-expanded={!isCollapsed}
        data-tooltip={isCollapsed ? t.notes.expandToolbar : t.notes.collapseToolbar}
        data-tooltip-align="left"
        onPointerDown={
          visualOnly
            ? undefined
            : (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleCollapsed();
              }
        }
        onClick={
          visualOnly
            ? undefined
            : (event) => {
                if (event.detail !== 0) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                toggleCollapsed();
              }
        }
        className={`note-toolbar-toggle relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border shadow-[0_5px_10px_rgba(61,49,34,0.06)] transition-colors ${
          isCollapsed
            ? "border-[rgba(123,92,250,0.38)] bg-[rgba(123,92,250,0.13)] text-[#5D44D4]"
            : "border-[rgba(213,198,180,0.86)] bg-white/72 text-[#665B50]"
        }`}
        whileHover={visualOnly ? undefined : { y: -1.5, scale: 1.03 }}
        whileTap={visualOnly ? undefined : { scale: 0.96 }}
      >
        {isCollapsed ? <ChevronUpIcon size={11} /> : <ChevronDownIcon size={13} />}
      </motion.button>

      <ColorPickerPopover
        activeColor={activeColor}
        anchorRef={colorButtonRef}
        isOpen={isColorPaletteOpen}
        onApplyColor={onApplyColor}
        onClose={onCloseColorPalette}
        onPreviewColor={onPreviewColor}
      />
    </motion.div>
  );
}
