import { motion } from "framer-motion";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BoldIcon,
  ChevronsUpDownIcon,
  ClearIcon,
  CircleCheckBigIcon,
  CopyIcon,
  GripVerticalIcon,
  ItalicIcon,
  KeyboardIcon,
  MapPinIcon,
  NotebookPenIcon,
  PaintbrushIcon,
  PaletteIcon,
  PasteIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  SquarePenIcon,
  Trash2Icon,
  UnderlineIcon,
} from "./icons";

type PreviewTab = "notes" | "todos";
type Tone = "coral" | "blue" | "jade";

type PreviewNote = {
  id: string;
  title: string;
  tone: Tone;
  expanded: boolean;
  meta: string[];
};

const TONE_STYLES: Record<
  Tone,
  {
    accent: string;
    soft: string;
    glow: string;
  }
> = {
  coral: {
    accent: "#FF7A59",
    soft: "rgba(255, 122, 89, 0.12)",
    glow: "rgba(255, 122, 89, 0.28)",
  },
  blue: {
    accent: "#2F6BFF",
    soft: "rgba(47, 107, 255, 0.11)",
    glow: "rgba(47, 107, 255, 0.22)",
  },
  jade: {
    accent: "#1FA87A",
    soft: "rgba(31, 168, 122, 0.12)",
    glow: "rgba(31, 168, 122, 0.22)",
  },
};

const TOOLBAR_ITEMS: Array<{ label: string; icon: ComponentType<{ size?: number; className?: string }> }> = [
  { label: "Bold", icon: BoldIcon },
  { label: "Italic", icon: ItalicIcon },
  { label: "Underline", icon: UnderlineIcon },
  { label: "Color", icon: PaletteIcon },
  { label: "Brush", icon: PaintbrushIcon },
  { label: "Copy", icon: CopyIcon },
  { label: "Paste", icon: PasteIcon },
  { label: "Clear", icon: ClearIcon },
];

function DesignTag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "coral" | "blue" | "jade" | "plum";
}) {
  const styles =
    tone === "coral"
      ? "bg-[rgba(255,122,89,0.12)] text-[#B64B2E]"
      : tone === "blue"
        ? "bg-[rgba(47,107,255,0.12)] text-[#2853C7]"
        : tone === "jade"
          ? "bg-[rgba(31,168,122,0.14)] text-[#0F7A58]"
          : tone === "plum"
            ? "bg-[rgba(123,92,250,0.12)] text-[#5D44D4]"
            : "bg-[rgba(30,25,21,0.06)] text-[#5E554D]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function IconAction({
  icon: Icon,
  label,
  tone = "neutral",
  wide = true,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  tone?: "neutral" | "primary" | "secondary" | "danger";
  wide?: boolean;
}) {
  const styles =
    tone === "primary"
      ? "bg-[#1E1915] text-white shadow-[0_12px_24px_rgba(30,25,21,0.18)]"
      : tone === "secondary"
        ? "bg-[rgba(47,107,255,0.10)] text-[#2853C7]"
        : tone === "danger"
          ? "bg-[rgba(255,122,89,0.12)] text-[#C14D31]"
          : "bg-white/80 text-[#1E1915]";

  return (
    <motion.button
      type="button"
      data-tooltip={label}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-[14px] border border-[rgba(213,198,180,0.92)] px-3 py-2 text-[12px] font-semibold ${styles}`}
    >
      <Icon size={16} />
      {wide ? <span className="truncate">{label}</span> : null}
    </motion.button>
  );
}

function ToneDot({ tone }: { tone: Tone }) {
  return (
    <span
      className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full border border-white/70 shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
      style={{ backgroundColor: TONE_STYLES[tone].accent }}
    />
  );
}

function FrameTexture() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(rgba(30,25,21,0.045) 0.8px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.2) 0.6px, transparent 0.6px)",
          backgroundPosition: "0 0, 14px 14px",
          backgroundSize: "18px 18px, 28px 28px",
          maskImage: "linear-gradient(180deg, black, rgba(0,0,0,0.2))",
        }}
      />
      <div className="pointer-events-none absolute -right-10 top-10 h-40 w-40 rounded-full bg-[rgba(255,122,89,0.22)] blur-3xl" />
      <div className="pointer-events-none absolute left-[-2rem] top-28 h-32 w-32 rounded-full bg-[rgba(47,107,255,0.14)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-14 right-6 h-24 w-24 rounded-full bg-[rgba(31,168,122,0.18)] blur-2xl" />
    </>
  );
}

function HeroCard({ compact, noteCount }: { compact: boolean; noteCount: number }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[rgba(28,24,22,0.08)] bg-[linear-gradient(145deg,#fff2de_0%,#ffffff_55%,#f6f4ff_100%)] px-4 py-4 shadow-[0_18px_38px_rgba(61,49,34,0.10)]">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#FF7A59,#2F6BFF,#1FA87A)]" />
      <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[rgba(123,92,250,0.12)] blur-2xl" />

      <div className={`relative ${compact ? "space-y-4" : "grid gap-4"}`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <DesignTag tone="plum">
              <SparklesIcon size={13} />
              Focus mode
            </DesignTag>
            <DesignTag tone="coral">{noteCount} active cards</DesignTag>
          </div>
          <h2 className="max-w-[14ch] text-[24px] font-semibold leading-[1.05] tracking-[-0.04em] text-[#1E1915]">
            Notes, without the clutter.
          </h2>
          <p className="max-w-[28ch] text-[13px] leading-6 text-[#5E554D]">
            Strong color, clear hierarchy, and icon-led actions that keep note work light.
          </p>
        </div>

        <div className={`flex ${compact ? "flex-col" : "flex-wrap"} gap-2`}>
          <IconAction icon={SquarePenIcon} label="New note" tone="primary" />
          <IconAction icon={SparklesIcon} label="Sort" tone="secondary" />
        </div>
      </div>
    </section>
  );
}

function NoteCardPreview({
  note,
  compact,
}: {
  note: PreviewNote;
  compact: boolean;
}) {
  const tone = TONE_STYLES[note.tone];

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[rgba(213,198,180,0.92)] bg-[rgba(255,249,240,0.98)] shadow-[0_14px_34px_rgba(61,49,34,0.08)]">
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${tone.accent}, rgba(255,255,255,0.95), ${tone.accent})` }} />
      <div className="space-y-3 px-4 py-4">
        <div className={`${compact ? "space-y-3" : "grid gap-3"}`}>
          <div className="flex items-start gap-3">
            <ToneDot tone={note.tone} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {note.meta.map((item, index) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      color: index === 0 ? tone.accent : "#5E554D",
                      backgroundColor: index === 0 ? tone.soft : "rgba(30,25,21,0.06)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div
                className="rounded-[18px] border border-[rgba(213,198,180,0.88)] bg-white/80 px-3 py-3 text-[15px] font-semibold leading-6 text-[#1E1915]"
                style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 18px ${tone.glow}` }}
              >
                {note.title}
              </div>
            </div>
          </div>

          <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
            <IconAction icon={GripVerticalIcon} label="Move" />
            <IconAction icon={ChevronsUpDownIcon} label={note.expanded ? "Fold" : "Open"} />
            <IconAction icon={Trash2Icon} label="Delete" tone="danger" wide={!compact} />
          </div>
        </div>

        {note.expanded ? (
          <>
            <div className={`grid ${compact ? "grid-cols-3" : "grid-cols-4 xl:grid-cols-7"} gap-2`}>
              {TOOLBAR_ITEMS.map(({ label, icon: Icon }) => (
                <motion.button
                  key={label}
                  type="button"
                  data-tooltip={label}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex min-h-10 items-center justify-center gap-1 rounded-[14px] border border-[rgba(213,198,180,0.86)] bg-white/82 px-2 py-2 text-[11px] font-semibold text-[#41352D] shadow-[0_10px_18px_rgba(61,49,34,0.06)]"
                >
                  <Icon size={15} />
                  {!compact ? <span>{label}</span> : null}
                </motion.button>
              ))}
            </div>

            <div className="rounded-[20px] border border-[rgba(213,198,180,0.86)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,243,235,0.94))] px-4 py-4">
              <p className="text-[13px] leading-6 text-[#433930]">
                Shape the note with contrast, icon-first tools, and bright accents instead of dense text controls.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function SettingsSheet({ compact }: { compact: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="absolute inset-3 z-20 rounded-[26px] border border-[rgba(213,198,180,0.96)] bg-[rgba(255,251,246,0.96)] p-4 shadow-[0_24px_60px_rgba(30,25,21,0.22)] backdrop-blur-xl"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <DesignTag tone="neutral">Settings</DesignTag>
            <DesignTag tone="blue">Overlay</DesignTag>
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-[#1E1915]">Panel preferences</h3>
        </div>
        <button
          type="button"
          data-tooltip="Close settings"
          className="rounded-full border border-[rgba(30,25,21,0.08)] bg-white/84 px-2.5 py-1 text-[11px] font-semibold text-[#5E554D]"
        >
          Esc
        </button>
      </div>

      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="rounded-[20px] border border-[rgba(213,198,180,0.92)] bg-white/84 p-4">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[#41352D]">
            <KeyboardIcon size={16} />
            Global shortcut
          </div>
          <div className="rounded-[16px] border border-[rgba(213,198,180,0.88)] bg-[rgba(247,242,232,0.8)] px-3 py-3 text-[13px] font-semibold text-[#1E1915]">
            Option + Space
          </div>
        </div>

        <div className="rounded-[20px] border border-[rgba(213,198,180,0.92)] bg-white/84 p-4">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[#41352D]">
            <MapPinIcon size={16} />
            Panel position
          </div>
          <div className="rounded-[16px] border border-[rgba(213,198,180,0.88)] bg-[rgba(247,242,232,0.8)] px-3 py-3 text-[13px] font-semibold text-[#1E1915]">
            x 326  y 118
          </div>
        </div>

        <div className={`rounded-[20px] border border-[rgba(213,198,180,0.92)] bg-white/84 p-4 ${compact ? "" : "col-span-2"}`}>
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-[#41352D]">
            <PaletteIcon size={16} />
            Theme preview
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="h-9 w-9 rounded-full bg-[#FF7A59]" />
            <span className="h-9 w-9 rounded-full bg-[#2F6BFF]" />
            <span className="h-9 w-9 rounded-full bg-[#1FA87A]" />
            <span className="h-9 w-9 rounded-full bg-[#F4B942]" />
            <span className="h-9 w-9 rounded-full bg-[#7B5CFA]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TodosPlaceholder({ compact }: { compact: boolean }) {
  return (
    <div className="space-y-3">
      <section className="relative overflow-hidden rounded-[24px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(150deg,#eef5ff_0%,#ffffff_40%,#ecfff8_100%)] px-4 py-4 shadow-[0_18px_38px_rgba(61,49,34,0.10)]">
        <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(47,107,255,0.12)] blur-3xl" />
        <div className="space-y-2">
          <DesignTag tone="blue">
            <CircleCheckBigIcon size={13} />
            Todo flow
          </DesignTag>
          <h2 className="max-w-[14ch] text-[22px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#1E1915]">
            Tasks stay vivid, too.
          </h2>
          <p className="max-w-[26ch] text-[13px] leading-6 text-[#5E554D]">
            The prototype keeps Todos aligned with the same icon-rich language.
          </p>
        </div>
      </section>

      {[1, 2].map((item) => (
        <section
          key={item}
          className="rounded-[24px] border border-[rgba(213,198,180,0.92)] bg-[rgba(255,249,240,0.98)] px-4 py-4 shadow-[0_14px_34px_rgba(61,49,34,0.08)]"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(31,168,122,0.12)] text-[#0F7A58]">
              <CircleCheckBigIcon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap gap-2">
                <DesignTag tone="jade">{item === 1 ? "today" : "upcoming"}</DesignTag>
                <DesignTag tone="neutral">{item === 1 ? "11:30" : "tomorrow"}</DesignTag>
              </div>
              <p className="text-[14px] font-semibold leading-6 text-[#1E1915]">
                {item === 1 ? "Refine icon sizing across compact states" : "Stage motion tokens for prototype export"}
              </p>
              {!compact ? (
                <p className="mt-1 text-[12px] leading-5 text-[#5E554D]">
                  Balance contrast, color, and speed without introducing visual noise.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function NotesHomeFrame({
  width,
  height,
  activeTab,
  showSettings,
  notes,
  noteCount,
}: {
  width: number;
  height: number;
  activeTab: PreviewTab;
  showSettings: boolean;
  notes: PreviewNote[];
  noteCount: number;
}) {
  const compact = width <= 320;
  const regular = width <= 380;

  return (
    <div
      className="relative overflow-hidden rounded-[34px] border border-[rgba(30,25,21,0.12)] bg-[linear-gradient(180deg,#f7f2e8_0%,#fbf8f2_100%)] shadow-[0_30px_90px_rgba(42,34,29,0.18)]"
      style={{ width, height }}
    >
      <FrameTexture />
      <div className="relative flex h-full min-h-0 flex-col p-3">
        <div className="rounded-[26px] border border-[rgba(213,198,180,0.9)] bg-[rgba(255,249,240,0.9)] px-4 py-4 shadow-[0_16px_34px_rgba(61,49,34,0.08)] backdrop-blur-xl">
          <div className={`flex ${compact ? "items-start" : "items-center"} justify-between gap-3`}>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <DesignTag tone="coral">QuickNote</DesignTag>
                {!compact ? <DesignTag tone="neutral">Notes home</DesignTag> : null}
              </div>
              <h1 className="text-[24px] font-semibold tracking-[-0.05em] text-[#1E1915]">QuickNote</h1>
              {!compact ? <p className="mt-1 text-[12px] text-[#5E554D]">Fast notes with visual clarity</p> : null}
            </div>

            <motion.button
              type="button"
              data-tooltip="Settings"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] border border-[rgba(213,198,180,0.92)] bg-white/90 text-[#1E1915] shadow-[0_12px_24px_rgba(61,49,34,0.08)]"
            >
              <SlidersHorizontalIcon size={18} />
            </motion.button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-[20px] border border-[rgba(213,198,180,0.8)] bg-[rgba(30,25,21,0.05)] p-1.5">
            {[
              { id: "notes" as const, label: "Notes", icon: NotebookPenIcon },
              { id: "todos" as const, label: "Todos", icon: CircleCheckBigIcon },
            ].map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <div
                  key={id}
                  className={`flex items-center justify-center gap-2 rounded-[16px] px-3 py-2.5 text-[12px] font-semibold ${
                    active
                      ? "bg-white text-[#1E1915] shadow-[0_10px_18px_rgba(61,49,34,0.10)]"
                      : "text-[#5E554D]"
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[rgba(213,198,180,0.9)] bg-[rgba(255,250,244,0.82)] p-3 shadow-[0_18px_40px_rgba(61,49,34,0.08)] backdrop-blur-lg">
          <div className="paper-scroll h-full overflow-y-auto">
            <div className="space-y-3 pr-1">
              {activeTab === "notes" ? (
                <>
                  <HeroCard compact={compact} noteCount={noteCount} />
                  {notes.map((note) => (
                    <NoteCardPreview key={note.id} note={note} compact={compact || regular} />
                  ))}
                  <section className="rounded-[22px] border border-[rgba(213,198,180,0.92)] bg-[linear-gradient(145deg,#fffaf3_0%,#ffffff_100%)] px-4 py-3 shadow-[0_12px_24px_rgba(61,49,34,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(123,92,250,0.12)] text-[#5D44D4]">
                        <SquarePenIcon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#7B5CFA]">Utility rail</p>
                        <p className="text-[13px] font-semibold text-[#1E1915]">Capture before it fades</p>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <TodosPlaceholder compact={compact || regular} />
              )}
            </div>
          </div>

          {showSettings ? <SettingsSheet compact={compact || regular} /> : null}
        </div>
      </div>
    </div>
  );
}

function PreviewFrameTile({
  width,
  height,
  label,
  activeTab = "notes",
  showSettings = false,
}: {
  width: number;
  height: number;
  label: string;
  activeTab?: PreviewTab;
  showSettings?: boolean;
}) {
  const notes = useMemo<PreviewNote[]>(
    () => [
      {
        id: "primary",
        title: "Refine note hierarchy with icon-first controls and faster visual scanning.",
        tone: "coral",
        expanded: true,
        meta: ["Pinned", "Edited 2m ago"],
      },
      {
        id: "secondary",
        title: "Release sprint alignment and launch copy",
        tone: "blue",
        expanded: false,
        meta: ["Shared", "Draft"],
      },
      {
        id: "third",
        title: "Customer interview fragments and follow-ups",
        tone: "jade",
        expanded: false,
        meta: ["Today", "Ready"],
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-[#5E554D]">
        <span className="rounded-full bg-white/80 px-2.5 py-1">{label}</span>
        <span className="rounded-full bg-[rgba(30,25,21,0.05)] px-2.5 py-1">
          {width} x {height}
        </span>
      </div>
      <NotesHomeFrame
        width={width}
        height={height}
        activeTab={activeTab}
        showSettings={showSettings}
        notes={notes}
        noteCount={3}
      />
    </div>
  );
}

function TokenSwatch({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[rgba(213,198,180,0.84)] bg-white/78 p-3">
      <div className="mb-3 h-16 rounded-[16px] border border-black/5" style={{ background: value }} />
      <p className="text-[12px] font-semibold text-[#1E1915]">{name}</p>
      <p className="text-[11px] text-[#5E554D]">{value}</p>
    </div>
  );
}

function ComponentCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[rgba(213,198,180,0.88)] bg-white/78 p-4 shadow-[0_16px_28px_rgba(61,49,34,0.05)]">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5E554D]">{title}</p>
      {children}
    </div>
  );
}

export function FigmaNotesHomePreview() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("notes");
  const [showSettings, setShowSettings] = useState(false);
  const [expandedPrimary, setExpandedPrimary] = useState(true);
  const [extraNote, setExtraNote] = useState(false);

  const prototypeNotes = useMemo<PreviewNote[]>(
    () => [
      {
        id: "prototype-primary",
        title: "Refine note hierarchy with icon-first controls and faster visual scanning.",
        tone: "coral",
        expanded: expandedPrimary,
        meta: ["Pinned", "Edited 2m ago"],
      },
      {
        id: "prototype-secondary",
        title: extraNote ? "New note structure for the launch checklist" : "Release sprint alignment and launch copy",
        tone: extraNote ? "jade" : "blue",
        expanded: false,
        meta: extraNote ? ["New", "Draft"] : ["Shared", "Draft"],
      },
      {
        id: "prototype-third",
        title: "Customer interview fragments and follow-ups",
        tone: "jade",
        expanded: false,
        meta: ["Today", "Ready"],
      },
    ],
    [expandedPrimary, extraNote],
  );

  const noteCount = extraNote ? 4 : 3;

  return (
    <div
      data-testid="figma-preview-board"
      className="min-h-screen bg-[linear-gradient(180deg,#ece8e0_0%,#f5f1ea_100%)] px-6 py-8 text-[#1E1915]"
    >
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-6 rounded-[32px] border border-[rgba(30,25,21,0.08)] bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(250,245,236,0.88))] p-6 shadow-[0_24px_70px_rgba(61,49,34,0.10)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <DesignTag tone="coral">QuickNote</DesignTag>
                <DesignTag tone="blue">Notes Home</DesignTag>
                <DesignTag tone="jade">icon-rich</DesignTag>
                <DesignTag tone="plum">animated</DesignTag>
              </div>
              <h1 className="max-w-[16ch] text-[clamp(32px,4vw,54px)] font-semibold leading-[0.95] tracking-[-0.06em] text-[#1E1915]">
                Figma-style Notes home preview board
              </h1>
              <p className="mt-3 max-w-[60ch] text-[14px] leading-7 text-[#5E554D]">
                High-contrast, color-forward, texture-light, and icon-first. This preview mirrors the planned Figma file structure while the real Figma MCP is unavailable in this environment.
              </p>
            </div>

            <div className="grid gap-2 rounded-[24px] border border-[rgba(213,198,180,0.92)] bg-white/82 p-4 text-[12px] text-[#5E554D] shadow-[0_16px_32px_rgba(61,49,34,0.06)]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF7A59]" />
                QuickNote Notes Home v1
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2F6BFF]" />
                00 Cover / 01 Tokens / 02 Components / 03 Notes Home / 04 Prototype
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-[28px] border border-[rgba(213,198,180,0.9)] bg-[linear-gradient(180deg,rgba(255,249,240,0.96),rgba(255,255,255,0.82))] p-5 shadow-[0_18px_36px_rgba(61,49,34,0.06)]">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#5E554D]">01 Tokens</p>
              <div className="grid grid-cols-2 gap-3">
                <TokenSwatch name="Coral accent" value="#FF7A59" />
                <TokenSwatch name="Cobalt accent" value="#2F6BFF" />
                <TokenSwatch name="Jade accent" value="#1FA87A" />
                <TokenSwatch name="Plum accent" value="#7B5CFA" />
              </div>
              <div className="mt-4 rounded-[20px] border border-[rgba(213,198,180,0.84)] bg-white/72 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5E554D]">Typography</p>
                <p className="mt-3 text-[28px] font-semibold tracking-[-0.05em] text-[#1E1915]">Sora</p>
                <p className="text-[13px] text-[#5E554D]">Display / headings</p>
                <p className="mt-4 text-[15px] font-semibold text-[#1E1915]">Manrope / PingFang SC</p>
                <p className="text-[13px] text-[#5E554D]">UI / body / supporting text</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-[rgba(213,198,180,0.9)] bg-[linear-gradient(180deg,rgba(255,249,240,0.96),rgba(255,255,255,0.82))] p-5 shadow-[0_18px_36px_rgba(61,49,34,0.06)]">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#5E554D]">02 Components</p>
              <div className="space-y-3">
                <ComponentCard title="IconTab">
                  <div className="grid grid-cols-2 gap-2 rounded-[18px] bg-[rgba(30,25,21,0.05)] p-1.5">
                    <div className="flex items-center justify-center gap-2 rounded-[14px] bg-white px-3 py-2.5 text-[12px] font-semibold text-[#1E1915] shadow-[0_10px_18px_rgba(61,49,34,0.10)]">
                      <NotebookPenIcon size={16} />
                      Notes
                    </div>
                    <div className="flex items-center justify-center gap-2 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[#5E554D]">
                      <CircleCheckBigIcon size={16} />
                      Todos
                    </div>
                  </div>
                </ComponentCard>

                <ComponentCard title="Action Buttons">
                  <div className="flex flex-wrap gap-2">
                    <IconAction icon={SquarePenIcon} label="New note" tone="primary" />
                    <IconAction icon={SparklesIcon} label="Sort" tone="secondary" />
                    <IconAction icon={Trash2Icon} label="Delete" tone="danger" />
                  </div>
                </ComponentCard>

                <ComponentCard title="Status Chips">
                  <div className="flex flex-wrap gap-2">
                    <DesignTag tone="coral">Pinned</DesignTag>
                    <DesignTag tone="blue">Shared</DesignTag>
                    <DesignTag tone="jade">Ready</DesignTag>
                    <DesignTag tone="plum">Focus</DesignTag>
                  </div>
                </ComponentCard>
              </div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="rounded-[32px] border border-[rgba(213,198,180,0.9)] bg-[linear-gradient(180deg,rgba(255,249,240,0.94),rgba(255,255,255,0.78))] p-6 shadow-[0_20px_40px_rgba(61,49,34,0.08)]">
              <div className="mb-5 flex flex-col gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#5E554D]">03 Notes Home</p>
                <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[#1E1915]">Responsive screens</h2>
              </div>
              <div className="grid gap-6 2xl:grid-cols-2">
                <PreviewFrameTile width={300} height={560} label="Compact" />
                <PreviewFrameTile width={360} height={560} label="Default" />
                <PreviewFrameTile width={420} height={640} label="Wide" showSettings />
                <PreviewFrameTile width={560} height={760} label="Expanded" />
              </div>
            </section>

            <section className="rounded-[32px] border border-[rgba(213,198,180,0.9)] bg-[linear-gradient(180deg,rgba(255,249,240,0.94),rgba(255,255,255,0.78))] p-6 shadow-[0_20px_40px_rgba(61,49,34,0.08)]">
              <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#5E554D]">04 Prototype</p>
                  <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[#1E1915]">Interactive notes home</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <IconAction
                    icon={activeTab === "notes" ? NotebookPenIcon : CircleCheckBigIcon}
                    label={activeTab === "notes" ? "Switch to Todos" : "Switch to Notes"}
                    tone="secondary"
                    wide
                  />
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <ComponentCard title="Prototype Controls">
                    <div className="grid gap-2">
                      <button
                        type="button"
                        data-tooltip="Toggle tab"
                        onClick={() => setActiveTab((current) => (current === "notes" ? "todos" : "notes"))}
                        className="flex items-center justify-between rounded-[18px] border border-[rgba(213,198,180,0.9)] bg-white/88 px-4 py-3 text-left text-[13px] font-semibold text-[#1E1915]"
                      >
                        <span>Toggle tab</span>
                        {activeTab === "notes" ? <CircleCheckBigIcon size={16} /> : <NotebookPenIcon size={16} />}
                      </button>
                      <button
                        type="button"
                        data-tooltip={showSettings ? "Hide settings" : "Show settings"}
                        onClick={() => setShowSettings((current) => !current)}
                        className="flex items-center justify-between rounded-[18px] border border-[rgba(213,198,180,0.9)] bg-white/88 px-4 py-3 text-left text-[13px] font-semibold text-[#1E1915]"
                      >
                        <span>{showSettings ? "Hide settings" : "Show settings"}</span>
                        <SlidersHorizontalIcon size={16} />
                      </button>
                      <button
                        type="button"
                        data-tooltip={expandedPrimary ? "Collapse main card" : "Expand main card"}
                        onClick={() => setExpandedPrimary((current) => !current)}
                        className="flex items-center justify-between rounded-[18px] border border-[rgba(213,198,180,0.9)] bg-white/88 px-4 py-3 text-left text-[13px] font-semibold text-[#1E1915]"
                      >
                        <span>{expandedPrimary ? "Collapse main card" : "Expand main card"}</span>
                        <ChevronsUpDownIcon size={16} />
                      </button>
                      <button
                        type="button"
                        data-tooltip={extraNote ? "Remove extra note" : "Add note state"}
                        onClick={() => setExtraNote((current) => !current)}
                        className="flex items-center justify-between rounded-[18px] border border-[rgba(213,198,180,0.9)] bg-white/88 px-4 py-3 text-left text-[13px] font-semibold text-[#1E1915]"
                      >
                        <span>{extraNote ? "Remove extra note" : "Add note state"}</span>
                        <SquarePenIcon size={16} />
                      </button>
                    </div>
                  </ComponentCard>

                  <ComponentCard title="Motion Spec">
                    <div className="space-y-3 text-[13px] leading-6 text-[#5E554D]">
                      <p>
                        <span className="font-semibold text-[#1E1915]">Tab switch:</span> smart animate, 220ms ease-out
                      </p>
                      <p>
                        <span className="font-semibold text-[#1E1915]">Card lift:</span> 160ms hover lift
                      </p>
                      <p>
                        <span className="font-semibold text-[#1E1915]">Settings sheet:</span> fade + slide, 240ms
                      </p>
                    </div>
                  </ComponentCard>
                </div>

                <div className="overflow-x-auto">
                  <div data-testid="figma-prototype-frame" className="inline-block">
                    <NotesHomeFrame
                      width={420}
                      height={640}
                      activeTab={activeTab}
                      showSettings={showSettings}
                      notes={prototypeNotes}
                      noteCount={noteCount}
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
