import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { buildHelpDialogContent, type HelpSection } from "../../content/helpContent";
import { useI18n } from "../../lib/i18n";
import { getQuickNoteBridge, isNativeQuickNoteHost } from "../../lib/nativeBridge";
import { useSettingsStore } from "../../store/settingsStore";
import {
  ChevronRightIcon,
  CircleHelpIcon,
  KeyboardIcon,
  ListChecksIcon,
  NotebookPenIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  XIcon,
} from "../icons/AppIcons";

type HelpDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SECTION_ICON_MAP: Record<HelpSection["id"], typeof SparklesIcon> = {
  overview: SparklesIcon,
  notes: NotebookPenIcon,
  todos: ListChecksIcon,
  floating: SparklesIcon,
  settings: SlidersHorizontalIcon,
  shortcuts: KeyboardIcon,
};

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const { language, t } = useI18n();
  const hotkey = useSettingsStore((state) => state.hotkey);
  const defaultOpenSection = useSettingsStore((state) => state.defaultOpenSection);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const transitionStyle = useSettingsStore((state) => state.transitionStyle);
  const animationSpeed = useSettingsStore((state) => state.animationSpeed);
  const enableReminderSound = useSettingsStore((state) => state.enableReminderSound);
  const platform = getQuickNoteBridge().platform;
  const content = useMemo(
    () =>
      buildHelpDialogContent({
        appName: t.app.appName,
        defaultSectionLabel:
          defaultOpenSection === "notes"
            ? t.settings.openNotesOnHotkey
            : defaultOpenSection === "todos"
              ? t.settings.openTodosOnHotkey
              : t.settings.openLastStoredSection,
        hotkey,
        isNativeHost: isNativeQuickNoteHost(),
        language,
        motionLabel: `${t.settings.tabTransitionStyle}: ${
          transitionStyle === "lift"
            ? t.settings.transitionLift
            : transitionStyle === "slide"
              ? t.settings.transitionSlide
              : t.settings.transitionPage
        } · ${t.settings.switchSpeed}: ${
          animationSpeed === "rapid"
            ? t.settings.switchSpeedFast
            : animationSpeed === "slow"
              ? t.settings.switchSpeedSlow
              : t.settings.switchSpeedMediate
        }`,
        platform,
        reminderSoundLabel: enableReminderSound ? t.settings.reminderSoundTitle : t.settings.reminderMutedMeta,
        timeFormatLabel: timeFormat === "12h" ? t.settings.timeFormat12Body : t.settings.timeFormat24Body,
        timeZoneLabel: timeZone,
      }),
    [
      animationSpeed,
      defaultOpenSection,
      enableReminderSound,
      hotkey,
      language,
      platform,
      t,
      timeFormat,
      timeZone,
      transitionStyle,
    ],
  );
  const [detailSectionId, setDetailSectionId] = useState<HelpSection["id"] | null>(null);
  const detailSection = content.sections.find((section) => section.id === detailSectionId) ?? null;
  const detailArticle = detailSection?.articles[0] ?? null;

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (detailSectionId) {
        setDetailSectionId(null);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [detailSectionId, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setDetailSectionId(null);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-no-window-drag="true"
          className="quicknote-modal-backdrop fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-4 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={content.title}
            className="paper-panel relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[960px] flex-col overflow-hidden rounded-[28px] p-3 shadow-[0_30px_64px_rgba(30,25,21,0.24)]"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
              <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
              <div className="absolute -left-10 top-8 h-36 w-36 rounded-full bg-[rgba(255,122,89,0.12)] blur-3xl" />
              <div className="absolute right-0 top-20 h-44 w-44 rounded-full bg-[rgba(47,107,255,0.1)] blur-3xl" />
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col gap-3">
              <div className="rounded-[24px] border border-[rgba(213,198,180,0.78)] bg-[linear-gradient(145deg,rgba(255,252,248,0.98),rgba(244,249,252,0.92)_55%,rgba(255,244,232,0.96))] px-4 pb-4 pt-4 shadow-[0_18px_36px_rgba(61,49,34,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="status-chip" data-tone="neutral">
                      <CircleHelpIcon size={11} />
                      {content.heroBadge}
                    </span>
                    <p className="mt-3 font-display text-[24px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                      {content.title}
                    </p>
                    <p className="mt-2 max-w-[62ch] text-[12px] leading-6 text-[var(--muted)]">{content.subtitle}</p>
                  </div>
                  <motion.button
                    type="button"
                    aria-label={t.common.close}
                    data-tooltip={t.common.close}
                    data-no-window-drag="true"
                    className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-[12px]"
                    whileHover={{ y: -1.5, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onClose}
                  >
                    <XIcon size={14} />
                  </motion.button>
                </div>
              </div>

              <div className="paper-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-3 pb-1 md:grid-cols-2 xl:grid-cols-3">
                  {content.sections.map((section) => {
                    const Icon = SECTION_ICON_MAP[section.id];
                    return (
                      <motion.button
                        key={section.id}
                        type="button"
                        aria-label={section.title}
                        className="group rounded-[24px] border border-[rgba(213,198,180,0.78)] bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(248,243,237,0.9))] p-4 text-left shadow-[0_16px_28px_rgba(61,49,34,0.06)]"
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setDetailSectionId(section.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex h-11 w-11 items-center justify-center rounded-[15px] bg-[linear-gradient(180deg,rgba(47,107,255,0.12),rgba(255,122,89,0.08))] text-[#7A5E39]">
                            <Icon size={18} />
                          </span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(213,198,180,0.74)] bg-white/80 text-[var(--muted)] transition-colors group-hover:text-[var(--brown-strong)]">
                            <ChevronRightIcon size={15} />
                          </span>
                        </div>
                        <p className="mt-4 font-display text-[20px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">
                          {section.title}
                        </p>
                        <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">{section.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {section.articles[0]?.highlights.slice(0, 3).map((highlight) => (
                            <span
                              key={highlight}
                              className="inline-flex items-center rounded-full border border-[rgba(156,126,94,0.22)] bg-[rgba(255,255,255,0.82)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--brown-strong)]"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {detailSection && detailArticle ? (
                <motion.div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(30,25,21,0.16)] px-5 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDetailSectionId(null)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={detailArticle.title}
                    className="paper-panel relative flex max-h-[calc(100dvh-4rem)] w-full max-w-[680px] flex-col overflow-y-auto rounded-[26px] p-3 shadow-[0_28px_56px_rgba(30,25,21,0.22)]"
                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.985, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="rounded-[22px] border border-[rgba(213,198,180,0.76)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,248,255,0.92)_52%,rgba(255,245,238,0.94))] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="mt-1 font-display text-[23px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                            {detailArticle.title}
                          </p>
                          <p className="mt-2 text-[12.5px] leading-6 text-[var(--muted)]">{detailArticle.summary}</p>
                        </div>
                        <motion.button
                          type="button"
                          aria-label={t.common.close}
                          data-tooltip={t.common.close}
                          className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-[12px]"
                          whileHover={{ y: -1.5, scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setDetailSectionId(null)}
                        >
                          <XIcon size={14} />
                        </motion.button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3 pb-1">
                      {detailArticle.groups.map((group, index) => (
                        <motion.section
                          key={group.id}
                          className="rounded-[20px] border border-[rgba(213,198,180,0.78)] bg-[rgba(255,255,255,0.72)] px-4 py-4 shadow-[0_16px_32px_rgba(61,49,34,0.05)]"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: index * 0.03 }}
                        >
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{group.title}</p>
                          <div className="mt-3 space-y-2.5">
                            {group.items.map((item) => (
                              <div key={item} className="grid grid-cols-[10px_minmax(0,1fr)] items-start gap-3">
                                <span className="mt-[7px] h-2.5 w-2.5 rounded-full bg-[linear-gradient(180deg,#FF7A59,#F4B942)] shadow-[0_0_0_3px_rgba(255,122,89,0.12)]" />
                                <p className="text-[12.5px] leading-6 text-[var(--dark-text)]">{item}</p>
                              </div>
                            ))}
                          </div>
                        </motion.section>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
