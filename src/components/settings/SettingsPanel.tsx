import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import {
  CircleCheckBigIcon,
  KeyboardIcon,
  MapPinIcon,
  NotebookPenIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  XIcon,
} from "../icons/AppIcons";

type SettingsPanelProps = {
  onClose: () => void;
};

function OptionButton({
  selected,
  icon,
  children,
  onClick,
}: {
  selected: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className={`flex min-w-0 items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left text-[13px] font-semibold ${
        selected
          ? "border-[rgba(47,107,255,0.18)] bg-[rgba(47,107,255,0.10)] text-[#2853C7]"
          : "border-[rgba(213,198,180,0.9)] bg-white/88 text-[var(--dark-text)]"
      }`}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon}
        <span className="wrap-anywhere">{children}</span>
      </span>
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          selected ? "bg-[var(--accent-cobalt)]" : "bg-[rgba(30,25,21,0.12)]"
        }`}
      />
    </motion.button>
  );
}

function ToggleButton({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={enabled}
      className={`relative inline-flex h-8 w-14 items-center rounded-full border transition-colors ${
        enabled
          ? "border-[rgba(31,168,122,0.2)] bg-[rgba(31,168,122,0.18)]"
          : "border-[rgba(213,198,180,0.9)] bg-[rgba(30,25,21,0.06)]"
      }`}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      <motion.span
        animate={{ x: enabled ? 24 : 4 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={`absolute top-[3px] inline-flex h-6 w-6 rounded-full shadow-[0_6px_12px_rgba(61,49,34,0.14)] ${
          enabled ? "bg-[var(--accent-jade)]" : "bg-white"
        }`}
      />
    </motion.button>
  );
}

function SettingsCard({
  icon,
  title,
  subtitle,
  children,
  wide = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`paper-card rounded-[28px] p-5 ${wide ? "settings-wide-card" : ""}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(47,107,255,0.10)] text-[#2853C7]">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-[18px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
            {title}
          </h3>
          {subtitle ? <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const hotkey = useSettingsStore((state) => state.hotkey);
  const panelPosition = useSettingsStore((state) => state.panelPosition);
  const activeTab = useSettingsStore((state) => state.activeTab);
  const transitionStyle = useSettingsStore((state) => state.transitionStyle);
  const animationSpeed = useSettingsStore((state) => state.animationSpeed);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const setHotkey = useSettingsStore((state) => state.setHotkey);
  const setActiveTab = useSettingsStore((state) => state.setActiveTab);
  const setTransitionStyle = useSettingsStore((state) => state.setTransitionStyle);
  const setAnimationSpeed = useSettingsStore((state) => state.setAnimationSpeed);
  const setEnableParticles = useSettingsStore((state) => state.setEnableParticles);
  const [draftHotkey, setDraftHotkey] = useState(hotkey);

  useEffect(() => {
    setDraftHotkey(hotkey);
  }, [hotkey]);

  return (
    <main
      data-testid="settings-panel"
      className="h-screen overflow-hidden bg-[linear-gradient(180deg,var(--base-bg)_0%,var(--base-bg-deep)_100%)] text-[var(--dark-text)]"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="window-shell flex h-full min-h-0 flex-col p-3"
      >
        <div className="paper-panel flex h-full min-h-0 flex-col rounded-[32px] p-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="status-chip" data-tone="blue">
                  <SlidersHorizontalIcon size={12} />
                  Settings
                </span>
                <span className="status-chip" data-tone="neutral">local only</span>
              </div>
              <p className="font-display text-[26px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                QuickNote
              </p>
              <p className="mt-1 max-w-[58ch] text-[13px] leading-6 text-[var(--muted)]">
                Configure how the tray panel opens, switches between Notes and Todos, and how much motion feedback you want while working.
              </p>
            </div>

            <motion.button
              type="button"
              aria-label="Close"
              className="paper-icon-button shrink-0"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              onClick={onClose}
            >
              <XIcon size={16} />
            </motion.button>
          </div>

          <div className="paper-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="settings-grid">
              <SettingsCard
                wide
                icon={<SparklesIcon size={18} />}
                title="About QuickNote"
                subtitle="A tray-first capture surface for fast notes and timed todos on macOS."
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                    <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
                      <NotebookPenIcon size={15} />
                      Notes
                    </p>
                    <p className="text-[12px] leading-6 text-[var(--muted)]">
                      Card-based notes with drag sorting, color tags, and a compact editor surface.
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                    <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
                      <CircleCheckBigIcon size={15} />
                      Todos
                    </p>
                    <p className="text-[12px] leading-6 text-[var(--muted)]">
                      Status-colored tasks with reminders, fast entry, and quicker scanning in narrow windows.
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                    <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
                      <SlidersHorizontalIcon size={15} />
                      Tray flow
                    </p>
                    <p className="text-[12px] leading-6 text-[var(--muted)]">
                      Open from the global shortcut, keep the panel floating, and tune motion to match your pace.
                    </p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<KeyboardIcon size={18} />}
                title="Launch and navigation"
                subtitle="Control how the panel opens and which section should be ready first."
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[12px] font-semibold text-[var(--brown-strong)]">Global shortcut</span>
                    <input
                      value={draftHotkey}
                      placeholder="Fn+Space"
                      onChange={(event) => setDraftHotkey(event.currentTarget.value)}
                      onBlur={() => setHotkey(draftHotkey)}
                      className="surface-field w-full rounded-[18px] px-4 py-3 text-[14px] font-medium text-[var(--dark-text)] outline-none"
                    />
                    <span className="mt-2 block text-[11px] leading-5 text-[var(--muted)]">
                      Default launch shortcut: Fn+Space
                    </span>
                  </label>

                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">Default section</p>
                    <div className="grid gap-2">
                      <OptionButton
                        selected={activeTab === "notes"}
                        icon={<NotebookPenIcon size={16} />}
                        onClick={() => setActiveTab("notes")}
                      >
                        Open Notes by default
                      </OptionButton>
                      <OptionButton
                        selected={activeTab === "todos"}
                        icon={<CircleCheckBigIcon size={16} />}
                        onClick={() => setActiveTab("todos")}
                      >
                        Open Todos by default
                      </OptionButton>
                    </div>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<SparklesIcon size={18} />}
                title="Motion and feedback"
                subtitle="Tune transition style, switching pace, and whether particle bursts stay on."
              >
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">Tab transition style</p>
                    <div className="grid gap-2">
                      <OptionButton
                        selected={transitionStyle === "page"}
                        icon={<NotebookPenIcon size={16} />}
                        onClick={() => setTransitionStyle("page")}
                      >
                        Page turn
                      </OptionButton>
                      <OptionButton
                        selected={transitionStyle === "slide"}
                        icon={<SlidersHorizontalIcon size={16} />}
                        onClick={() => setTransitionStyle("slide")}
                      >
                        Slide
                      </OptionButton>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">Switch speed</p>
                    <div className="grid gap-2">
                      <OptionButton
                        selected={animationSpeed === "faster"}
                        icon={<SparklesIcon size={16} />}
                        onClick={() => setAnimationSpeed("faster")}
                      >
                        Faster
                      </OptionButton>
                      <OptionButton
                        selected={animationSpeed === "fast"}
                        icon={<SparklesIcon size={16} />}
                        onClick={() => setAnimationSpeed("fast")}
                      >
                        Fast
                      </OptionButton>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--brown-strong)]">Particle feedback</p>
                      <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                        Show burst effects when notes and todos are added, completed, or removed.
                      </p>
                    </div>
                    <ToggleButton enabled={enableParticles} onClick={() => setEnableParticles(!enableParticles)} />
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<MapPinIcon size={18} />}
                title="Panel status"
                subtitle="Current runtime details from the desktop shell."
              >
                <div className="space-y-3">
                  <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-4">
                    <p className="text-[12px] font-semibold text-[var(--brown-strong)]">Last saved position</p>
                    <p className="font-display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                      {panelPosition ? `x ${panelPosition.x}  y ${panelPosition.y}` : "Unset"}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-4">
                    <p className="text-[12px] font-semibold text-[var(--brown-strong)]">Data scope</p>
                    <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                      Notes, todos, and settings are stored locally in the app data directory and auto-saved after edits.
                    </p>
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={<PaletteIcon size={18} />}
                title="Visual palette"
                subtitle="The active surface style used by the app right now."
              >
                <div className="flex flex-wrap gap-3">
                  <span className="h-10 w-10 rounded-full bg-[var(--accent-coral)] shadow-[0_10px_18px_rgba(255,122,89,0.18)]" />
                  <span className="h-10 w-10 rounded-full bg-[var(--accent-cobalt)] shadow-[0_10px_18px_rgba(47,107,255,0.16)]" />
                  <span className="h-10 w-10 rounded-full bg-[var(--accent-jade)] shadow-[0_10px_18px_rgba(31,168,122,0.16)]" />
                  <span className="h-10 w-10 rounded-full bg-[var(--accent-marigold)] shadow-[0_10px_18px_rgba(244,185,66,0.18)]" />
                  <span className="h-10 w-10 rounded-full bg-[var(--accent-plum)] shadow-[0_10px_18px_rgba(123,92,250,0.16)]" />
                </div>
              </SettingsCard>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
