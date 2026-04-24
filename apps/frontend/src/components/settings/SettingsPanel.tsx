import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { registerHotkey } from "../../hooks/usePlatform";
import { captureShortcutFromKeyEvent, getShortcutDisplayLabel } from "../../lib/hotkeyCapture";
import { useI18n } from "../../lib/i18n";
import { DEFAULT_SETTINGS } from "../../lib/models";
import { getQuickNoteBridge, isNativeQuickNoteHost } from "../../lib/nativeBridge";
import { getSettingsMenuMotionConfig, type TransitionDirection } from "../../lib/transitionMotion";
import { useSettingsStore } from "../../store/settingsStore";
import {
  ChevronDownIcon,
  ChineseLanguageIcon,
  CircleCheckBigIcon,
  Clock3Icon,
  CornerDownLeftIcon,
  EnglishLanguageIcon,
  FastForwardIcon,
  GaugeIcon,
  HourglassIcon,
  KeyboardIcon,
  MapPinIcon,
  NotebookPenIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  XIcon,
} from "../icons/AppIcons";

type SettingsPanelProps = {
  onClose: () => void;
};

type FeedbackTone = "error" | "info" | "success";

type HotkeyFeedback = {
  text: string;
  tone: FeedbackTone;
};

type SettingsCategoryId = "general" | "shortcuts" | "motion" | "notifications" | "system";

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
      className={`relative inline-flex h-8 w-14 shrink-0 items-center overflow-visible rounded-full border transition-colors ${
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
        className={`absolute left-0 top-[3px] inline-flex h-6 w-6 rounded-full shadow-[0_6px_12px_rgba(61,49,34,0.14)] ${
          enabled ? "bg-[var(--accent-jade)]" : "bg-white"
        }`}
      />
    </motion.button>
  );
}

function feedbackClassName(tone: FeedbackTone) {
  if (tone === "success") {
    return "text-[#0f7a58]";
  }

  if (tone === "error") {
    return "text-[#b64b2e]";
  }

  return "text-[var(--muted)]";
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="paper-card rounded-[24px] p-4">
      <div className="mb-3 min-w-0">
        <h3 className="font-display text-[17px] font-semibold tracking-normal text-[var(--brown-strong)]">
          {title}
        </h3>
        {description ? <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SettingRow({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="surface-field rounded-[20px] px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(47,107,255,0.08)] text-[#2853C7]">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[var(--brown-strong)]">{title}</p>
            {description ? <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="flex justify-end">{action}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function CategoryButton({
  icon,
  title,
  description,
  meta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="paper-card group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] p-4 text-left"
      whileHover={{ y: -2, scale: 1.006 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
    >
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[rgba(47,107,255,0.10)] text-[#2853C7]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[var(--brown-strong)]">{title}</span>
        <span className="mt-1 block text-[12px] leading-5 text-[var(--muted)]">{description}</span>
        {meta ? <span className="mt-2 block text-[11px] font-medium leading-5 text-[var(--muted)]">{meta}</span> : null}
      </span>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(213,198,180,0.8)] bg-white/78 text-[var(--muted)] transition-colors group-hover:text-[#2853C7]">
        <ChevronDownIcon className="-rotate-90" size={16} />
      </span>
    </motion.button>
  );
}

function FirstLevelAction({
  title,
  description,
  tone = "neutral",
  feedback,
  busy,
  buttonLabel,
  onClick,
}: {
  title: string;
  description: string;
  tone?: "danger" | "neutral";
  feedback?: HotkeyFeedback | null;
  busy?: boolean;
  buttonLabel: string;
  onClick: () => void;
}) {
  const danger = tone === "danger";

  return (
    <div
      className={`rounded-[24px] border px-4 py-4 ${
        danger
          ? "border-[rgba(226,132,112,0.34)] bg-[rgba(255,248,245,0.92)]"
          : "border-[rgba(213,198,180,0.88)] bg-white/78"
      }`}
    >
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className={`text-[13px] font-semibold ${danger ? "text-[rgb(150,68,52)]" : "text-[var(--brown-strong)]"}`}>
            {title}
          </p>
          <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {feedback ? (
            <p className={`text-[11px] font-medium leading-5 ${feedbackClassName(feedback.tone)}`}>{feedback.text}</p>
          ) : (
            <span />
          )}
          <motion.button
            type="button"
            data-no-window-drag="true"
            className={
              danger
                ? "inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[rgba(201,93,68,0.32)] bg-[rgba(201,93,68,0.12)] px-3.5 py-2.5 text-[12px] font-semibold text-[rgb(150,68,52)]"
                : "paper-button paper-button-secondary inline-flex shrink-0 items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold"
            }
            whileHover={{ y: -1.5, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            onClick={onClick}
          >
            {busy ? `${buttonLabel}...` : buttonLabel}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useI18n();
  const hotkey = useSettingsStore((state) => state.hotkey);
  const language = useSettingsStore((state) => state.language);
  const panelPosition = useSettingsStore((state) => state.panelPosition);
  const defaultOpenSection = useSettingsStore((state) => state.defaultOpenSection);
  const lastActiveTab = useSettingsStore((state) => state.lastActiveTab);
  const transitionStyle = useSettingsStore((state) => state.transitionStyle);
  const animationSpeed = useSettingsStore((state) => state.animationSpeed);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const enableReminderSound = useSettingsStore((state) => state.enableReminderSound);
  const setHotkey = useSettingsStore((state) => state.setHotkey);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setDefaultOpenSection = useSettingsStore((state) => state.setDefaultOpenSection);
  const setTransitionStyle = useSettingsStore((state) => state.setTransitionStyle);
  const setAnimationSpeed = useSettingsStore((state) => state.setAnimationSpeed);
  const setEnableParticles = useSettingsStore((state) => state.setEnableParticles);
  const setEnableReminderSound = useSettingsStore((state) => state.setEnableReminderSound);
  const restoreDefaults = useSettingsStore((state) => state.restoreDefaults);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId | null>(null);
  const [categoryDirection, setCategoryDirection] = useState<TransitionDirection>(1);
  const [capturedShortcut, setCapturedShortcut] = useState<string | null>(null);
  const [hotkeyDialogOpen, setHotkeyDialogOpen] = useState(false);
  const [hotkeyDialogFeedback, setHotkeyDialogFeedback] = useState<HotkeyFeedback | null>(null);
  const [hotkeyFeedback, setHotkeyFeedback] = useState<HotkeyFeedback | null>(null);
  const [defaultsFeedback, setDefaultsFeedback] = useState<HotkeyFeedback | null>(null);
  const [notificationFeedback, setNotificationFeedback] = useState<HotkeyFeedback | null>(null);
  const [systemFeedback, setSystemFeedback] = useState<HotkeyFeedback | null>(null);
  const [isApplyingHotkey, setIsApplyingHotkey] = useState(false);
  const [isRestoringDefaults, setIsRestoringDefaults] = useState(false);
  const [isOpeningNotificationSettings, setIsOpeningNotificationSettings] = useState(false);
  const [isQuittingApplication, setIsQuittingApplication] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  useEffect(() => {
    scrollRegionRef.current?.scrollTo({ top: 0 });
  }, [activeCategory]);

  useEffect(() => {
    if (!hotkeyDialogOpen || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const result = captureShortcutFromKeyEvent(event);

      if (result.ignored) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (result.shortcut) {
        setCapturedShortcut(result.shortcut);
        setHotkeyDialogFeedback({
          text: t.settings.shortcutRecorded(result.shortcut),
          tone: "success",
        });
        return;
      }

      if ("errorCode" in result) {
        setCapturedShortcut(null);
        setHotkeyDialogFeedback({
          text: result.errorCode === "needsModifier" ? t.settings.shortcutNeedsModifier : t.settings.shortcutUnsupported,
          tone: "error",
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [hotkeyDialogOpen, t.settings]);

  const categories = useMemo(
    () => [
      {
        id: "general" as const,
        icon: <SlidersHorizontalIcon size={18} />,
        title: t.settings.categoryGeneralTitle,
        description: t.settings.categoryGeneralDescription,
        meta: language === "en" ? t.settings.englishMode : t.settings.zhMode,
      },
      {
        id: "shortcuts" as const,
        icon: <KeyboardIcon size={18} />,
        title: t.settings.categoryShortcutsTitle,
        description: t.settings.categoryShortcutsDescription,
        meta: getShortcutDisplayLabel(hotkey),
      },
      {
        id: "motion" as const,
        icon: <SparklesIcon size={18} />,
        title: t.settings.categoryMotionTitle,
        description: t.settings.categoryMotionDescription,
        meta: `${t.settings.tabTransitionStyle}: ${getTransitionLabel(transitionStyle, t)}`,
      },
      {
        id: "notifications" as const,
        icon: <Clock3Icon size={18} />,
        title: t.settings.categoryNotificationsTitle,
        description: t.settings.categoryNotificationsDescription,
        meta: enableReminderSound ? t.settings.reminderSoundTitle : t.settings.reminderMutedMeta,
      },
      {
        id: "system" as const,
        icon: <MapPinIcon size={18} />,
        title: t.settings.categorySystemTitle,
        description: t.settings.categorySystemDescription,
        meta: panelPosition ? `x ${panelPosition.x}  y ${panelPosition.y}` : t.settings.unset,
      },
    ],
    [enableReminderSound, hotkey, language, panelPosition, t, transitionStyle],
  );

  const currentCategory = categories.find((category) => category.id === activeCategory) ?? null;
  const categoryMotion = getSettingsMenuMotionConfig(transitionStyle, animationSpeed);

  const openCategory = (category: SettingsCategoryId) => {
    setCategoryDirection(1);
    setActiveCategory(category);
  };

  const closeCategory = () => {
    setCategoryDirection(-1);
    setActiveCategory(null);
  };

  const openHotkeyDialog = () => {
    setCapturedShortcut(null);
    setHotkeyDialogFeedback({
      text: t.settings.shortcutPrompt,
      tone: "info",
    });
    setHotkeyDialogOpen(true);
  };

  const closeHotkeyDialog = (force = false) => {
    if (isApplyingHotkey && !force) {
      return;
    }

    setHotkeyDialogOpen(false);
    setCapturedShortcut(null);
    setHotkeyDialogFeedback(null);
  };

  const applyCapturedHotkey = async () => {
    if (!capturedShortcut) {
      setHotkeyDialogFeedback({
        text: t.settings.shortcutNoCapture,
        tone: "error",
      });
      return;
    }

    if (capturedShortcut === hotkey) {
      setHotkeyFeedback({
        text: t.settings.shortcutUnchanged(capturedShortcut),
        tone: "info",
      });
      closeHotkeyDialog(true);
      return;
    }

    setIsApplyingHotkey(true);

    try {
      await registerHotkey(capturedShortcut);
      setHotkey(capturedShortcut);
      setHotkeyFeedback({
        text: t.settings.shortcutChanged(capturedShortcut),
        tone: "success",
      });
      closeHotkeyDialog(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.shortcutUnsupported;
      setHotkeyDialogFeedback({
        text: message,
        tone: "error",
      });
      setHotkeyFeedback({
        text: t.settings.shortcutFailed(hotkey),
        tone: "error",
      });
    } finally {
      setIsApplyingHotkey(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (isRestoringDefaults) {
      return;
    }

    setIsRestoringDefaults(true);

    try {
      if (hotkey !== DEFAULT_SETTINGS.hotkey) {
        await registerHotkey(DEFAULT_SETTINGS.hotkey);
      }

      restoreDefaults();
      setHotkeyFeedback(null);
      setDefaultsFeedback({
        text: t.settings.restoreDefaultsSuccess,
        tone: "success",
      });
    } catch {
      setDefaultsFeedback({
        text: t.settings.restoreDefaultsFailed(hotkey),
        tone: "error",
      });
    } finally {
      setIsRestoringDefaults(false);
    }
  };

  const handleTestReminderNotification = async () => {
    if (isTestingNotification) {
      return;
    }

    if (!isNativeQuickNoteHost()) {
      setNotificationFeedback({
        text: t.settings.reminderTestUnsupported,
        tone: "info",
      });
      return;
    }

    setIsTestingNotification(true);
    setNotificationFeedback(null);

    try {
      await getQuickNoteBridge().testReminderNotification({
        soundEnabled: enableReminderSound,
        language,
      });
      setNotificationFeedback({
        text: enableReminderSound ? t.settings.reminderTestSoundSuccess : t.settings.reminderTestMutedSuccess,
        tone: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.reminderTestFailed;
      setNotificationFeedback({
        text: message,
        tone: "error",
      });
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleOpenNotificationSettings = async () => {
    if (isOpeningNotificationSettings) {
      return;
    }

    if (!isNativeQuickNoteHost()) {
      setNotificationFeedback({
        text: t.settings.notificationOpenSettingsUnsupported,
        tone: "info",
      });
      return;
    }

    setIsOpeningNotificationSettings(true);

    try {
      await getQuickNoteBridge().openNotificationSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.notificationOpenSettingsFailed;
      setNotificationFeedback({
        text: message,
        tone: "error",
      });
    } finally {
      setIsOpeningNotificationSettings(false);
    }
  };

  const handleQuitApplication = async () => {
    if (isQuittingApplication) {
      return;
    }

    if (!isNativeQuickNoteHost()) {
      setSystemFeedback({
        text: t.settings.quitApplicationFailed,
        tone: "info",
      });
      return;
    }

    setIsQuittingApplication(true);

    try {
      await getQuickNoteBridge().quitApplication();
    } catch (error) {
      const message = error instanceof Error ? error.message : t.settings.quitApplicationFailed;
      setSystemFeedback({
        text: message,
        tone: "error",
      });
      setIsQuittingApplication(false);
    }
  };

  return (
    <section data-testid="settings-panel" className="relative h-full min-h-0">
      <div
        ref={scrollRegionRef}
        data-testid="settings-scroll-region"
        className="settings-scroll-region paper-scroll h-full overflow-y-auto px-5 pb-5 pt-5"
        style={categoryMotion.sceneStyle}
      >
        <AnimatePresence mode={categoryMotion.presenceMode} initial={false} custom={categoryDirection}>
          {activeCategory && currentCategory ? (
            <motion.div
              key={activeCategory}
              custom={categoryDirection}
              variants={categoryMotion.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={categoryMotion.transition}
              style={categoryMotion.contentStyle}
              className="min-h-full will-change-transform"
            >
              <div className="relative z-40 mb-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 overflow-visible">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[17px] bg-[rgba(47,107,255,0.10)] text-[#2853C7]">
                    {currentCategory.icon}
                  </div>
                  <h2 className="font-display text-[26px] font-semibold tracking-normal text-[var(--brown-strong)]">
                    {currentCategory.title}
                  </h2>
                  <p className="mt-2 max-w-[58ch] text-[13px] leading-6 text-[var(--muted)]">
                    {currentCategory.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <motion.button
                    type="button"
                    className="paper-button inline-flex h-11 items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-[var(--muted)]"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={closeCategory}
                  >
                    <CornerDownLeftIcon size={14} />
                    {t.settings.backToSettings}
                  </motion.button>
                  <motion.button
                    type="button"
                    aria-label={t.common.close}
                    className="paper-icon-button h-11 w-11 shrink-0"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={onClose}
                  >
                    <XIcon size={16} />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-4 pb-2">
                {activeCategory === "general" ? (
                  <GeneralSettings
                    language={language}
                    setLanguage={setLanguage}
                  />
                ) : null}

                {activeCategory === "shortcuts" ? (
                  <ShortcutSettings
                    hotkey={hotkey}
                    defaultOpenSection={defaultOpenSection}
                    lastActiveTab={lastActiveTab}
                    hotkeyFeedback={hotkeyFeedback}
                    openHotkeyDialog={openHotkeyDialog}
                    setDefaultOpenSection={setDefaultOpenSection}
                  />
                ) : null}

                {activeCategory === "motion" ? (
                  <MotionSettings
                    transitionStyle={transitionStyle}
                    animationSpeed={animationSpeed}
                    enableParticles={enableParticles}
                    setTransitionStyle={setTransitionStyle}
                    setAnimationSpeed={setAnimationSpeed}
                    setEnableParticles={setEnableParticles}
                  />
                ) : null}

                {activeCategory === "notifications" ? (
                  <NotificationSettings
                    enableReminderSound={enableReminderSound}
                    notificationFeedback={notificationFeedback}
                    isOpeningNotificationSettings={isOpeningNotificationSettings}
                    isTestingNotification={isTestingNotification}
                    setEnableReminderSound={setEnableReminderSound}
                    handleOpenNotificationSettings={handleOpenNotificationSettings}
                    handleTestReminderNotification={handleTestReminderNotification}
                  />
                ) : null}

                {activeCategory === "system" ? (
                  <SystemSettings panelPosition={panelPosition} />
                ) : null}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="settings-home"
              custom={categoryDirection}
              variants={categoryMotion.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={categoryMotion.transition}
              style={categoryMotion.contentStyle}
              className="min-h-full will-change-transform"
            >
              <div className="relative z-40 mb-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 overflow-visible">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="status-chip" data-tone="blue">
                      <SlidersHorizontalIcon size={12} />
                      {t.app.settings}
                    </span>
                    <span className="status-chip" data-tone="neutral">{t.app.localOnly}</span>
                  </div>
                  <h2 className="font-display text-[26px] font-semibold tracking-normal text-[var(--brown-strong)]">
                    QuickNote
                  </h2>
                  <p className="mt-2 max-w-[58ch] text-[13px] leading-6 text-[var(--muted)]">
                    {t.settings.appIntro}
                  </p>
                </div>
                <motion.button
                  type="button"
                  aria-label={t.common.close}
                  className="paper-icon-button h-11 w-11 shrink-0 self-start"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={onClose}
                >
                  <XIcon size={16} />
                </motion.button>
              </div>

              <div className="space-y-3">
                {categories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    icon={category.icon}
                    title={category.title}
                    description={category.description}
                    meta={category.meta}
                    onClick={() => openCategory(category.id)}
                  />
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-[rgba(213,198,180,0.72)] pt-4">
                <p className="text-[12px] font-semibold text-[var(--muted)]">{t.settings.firstLevelActionsTitle}</p>
                <FirstLevelAction
                  title={t.settings.restoreDefaults}
                  description={t.settings.restoreDefaultsBody}
                  feedback={defaultsFeedback}
                  busy={isRestoringDefaults}
                  buttonLabel={t.settings.restoreDefaults}
                  onClick={() => void handleRestoreDefaults()}
                />
                <FirstLevelAction
                  tone="danger"
                  title={t.settings.quitApplication}
                  description={t.settings.quitApplicationBody}
                  feedback={systemFeedback}
                  busy={isQuittingApplication}
                  buttonLabel={t.settings.quitApplicationButton}
                  onClick={() => void handleQuitApplication()}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {hotkeyDialogOpen ? (
          <motion.div
            data-no-window-drag="true"
            className="quicknote-modal-backdrop absolute inset-0 z-40 flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-8 backdrop-blur-[10px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeHotkeyDialog()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.settings.dialogTitle}
              className="paper-panel w-full max-w-[420px] rounded-[28px] p-5 shadow-[0_30px_60px_rgba(30,25,21,0.2)]"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[22px] font-semibold tracking-normal text-[var(--brown-strong)]">
                    {t.settings.dialogTitle}
                  </p>
                  <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                    {t.settings.dialogSubtitle}
                  </p>
                </div>
                <motion.button
                  type="button"
                  aria-label={t.common.close}
                  data-no-window-drag="true"
                  className="paper-icon-button shrink-0"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => closeHotkeyDialog()}
                >
                  <XIcon size={16} />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                  <p className="text-[11px] font-semibold text-[var(--muted)]">{t.settings.currentShortcut}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[var(--brown-strong)]">{getShortcutDisplayLabel(hotkey)}</p>
                </div>

                <div className="rounded-[20px] border border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] p-4">
                  <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#2853C7]">
                    <KeyboardIcon size={15} />
                    {t.settings.dialogRecorded}
                  </p>
                  <p className="font-display text-[24px] font-semibold tracking-normal text-[var(--brown-strong)]">
                    {capturedShortcut ?? t.settings.dialogWaiting}
                  </p>
                  <p
                    className={`mt-2 text-[12px] leading-6 ${
                      hotkeyDialogFeedback ? feedbackClassName(hotkeyDialogFeedback.tone) : "text-[var(--muted)]"
                    }`}
                  >
                    {hotkeyDialogFeedback?.text ?? t.settings.shortcutPrompt}
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <motion.button
                    type="button"
                    data-no-window-drag="true"
                    className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                    whileHover={{ y: -1.5, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => closeHotkeyDialog()}
                  >
                    {t.common.cancel}
                  </motion.button>
                  <motion.button
                    type="button"
                    data-no-window-drag="true"
                    className="paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold"
                    whileHover={{ y: -1.5, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void applyCapturedHotkey()}
                  >
                    {isApplyingHotkey ? `${t.settings.shortcutApply}...` : t.settings.shortcutApply}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function getTransitionLabel(transitionStyle: "lift" | "page" | "slide", t: ReturnType<typeof useI18n>["t"]) {
  if (transitionStyle === "page") {
    return t.settings.transitionPage;
  }

  if (transitionStyle === "lift") {
    return t.settings.transitionLift;
  }

  return t.settings.transitionSlide;
}

function GeneralSettings({
  language,
  setLanguage,
}: {
  language: "en" | "zh-CN";
  setLanguage: (language: "en" | "zh-CN") => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.languageTitle} description={t.settings.languageSectionSubtitle}>
        <div className="grid gap-2">
          <OptionButton selected={language === "en"} icon={<EnglishLanguageIcon size={16} />} onClick={() => setLanguage("en")}>
            {t.common.english}
          </OptionButton>
          <OptionButton selected={language === "zh-CN"} icon={<ChineseLanguageIcon size={16} />} onClick={() => setLanguage("zh-CN")}>
            {t.common.simplifiedChinese}
          </OptionButton>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
          {language === "en" ? t.settings.languageEnglishBody : t.settings.languageSimplifiedChineseBody}
        </p>
      </SettingSection>

      <SettingSection title={t.settings.aboutTitle} description={t.settings.aboutSubtitle}>
        <div className="grid gap-3">
          <SettingRow icon={<NotebookPenIcon size={15} />} title={t.settings.aboutNotesTitle} description={t.settings.aboutNotesBody} />
          <SettingRow icon={<CircleCheckBigIcon size={15} />} title={t.settings.aboutTodosTitle} description={t.settings.aboutTodosBody} />
          <SettingRow icon={<SlidersHorizontalIcon size={15} />} title={t.settings.aboutTrayFlowTitle} description={t.settings.aboutTrayFlowBody} />
        </div>
      </SettingSection>
    </>
  );
}

function ShortcutSettings({
  hotkey,
  defaultOpenSection,
  lastActiveTab,
  hotkeyFeedback,
  openHotkeyDialog,
  setDefaultOpenSection,
}: {
  hotkey: string;
  defaultOpenSection: "last" | "notes" | "todos";
  lastActiveTab: "notes" | "todos";
  hotkeyFeedback: HotkeyFeedback | null;
  openHotkeyDialog: () => void;
  setDefaultOpenSection: (section: "last" | "notes" | "todos") => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.globalShortcutTitle} description={t.settings.hotkeyHint}>
        <SettingRow
          icon={<KeyboardIcon size={15} />}
          title={getShortcutDisplayLabel(hotkey)}
          description={t.settings.defaultLaunchShortcut(getShortcutDisplayLabel(DEFAULT_SETTINGS.hotkey))}
          action={
            <motion.button
              type="button"
              data-no-window-drag="true"
              className="paper-button paper-button-secondary inline-flex shrink-0 items-center justify-center rounded-[14px] px-3 py-2 text-[12px] font-semibold"
              whileHover={{ y: -1.5, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              onClick={openHotkeyDialog}
            >
              {t.common.change}
            </motion.button>
          }
        >
          {hotkeyFeedback ? (
            <p className={`text-[11px] font-medium leading-5 ${feedbackClassName(hotkeyFeedback.tone)}`}>{hotkeyFeedback.text}</p>
          ) : null}
        </SettingRow>
      </SettingSection>

      <SettingSection title={t.settings.defaultSection} description={t.settings.lastStoredSection(lastActiveTab === "notes" ? t.tabs.notes : t.tabs.todos)}>
        <div className="grid gap-2">
          <OptionButton selected={defaultOpenSection === "last"} icon={<SlidersHorizontalIcon size={16} />} onClick={() => setDefaultOpenSection("last")}>
            {t.settings.openLastStoredSection}
          </OptionButton>
          <OptionButton selected={defaultOpenSection === "notes"} icon={<NotebookPenIcon size={16} />} onClick={() => setDefaultOpenSection("notes")}>
            {t.settings.openNotesOnHotkey}
          </OptionButton>
          <OptionButton selected={defaultOpenSection === "todos"} icon={<CircleCheckBigIcon size={16} />} onClick={() => setDefaultOpenSection("todos")}>
            {t.settings.openTodosOnHotkey}
          </OptionButton>
        </div>
      </SettingSection>
    </>
  );
}

function MotionSettings({
  transitionStyle,
  animationSpeed,
  enableParticles,
  setTransitionStyle,
  setAnimationSpeed,
  setEnableParticles,
}: {
  transitionStyle: "lift" | "page" | "slide";
  animationSpeed: "rapid" | "mediate" | "slow";
  enableParticles: boolean;
  setTransitionStyle: (style: "lift" | "page" | "slide") => void;
  setAnimationSpeed: (speed: "rapid" | "mediate" | "slow") => void;
  setEnableParticles: (enabled: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.tabTransitionStyle} description={t.settings.motionAndFeedbackSubtitle}>
        <div className="grid gap-2">
          <OptionButton selected={transitionStyle === "page"} icon={<NotebookPenIcon size={16} />} onClick={() => setTransitionStyle("page")}>
            {t.settings.transitionPage}
          </OptionButton>
          <OptionButton selected={transitionStyle === "slide"} icon={<SlidersHorizontalIcon size={16} />} onClick={() => setTransitionStyle("slide")}>
            {t.settings.transitionSlide}
          </OptionButton>
          <OptionButton selected={transitionStyle === "lift"} icon={<SparklesIcon size={16} />} onClick={() => setTransitionStyle("lift")}>
            {t.settings.transitionLift}
          </OptionButton>
        </div>
      </SettingSection>

      <SettingSection title={t.settings.switchSpeed}>
        <div className="grid gap-2">
          <OptionButton selected={animationSpeed === "rapid"} icon={<FastForwardIcon size={16} />} onClick={() => setAnimationSpeed("rapid")}>
            {t.settings.switchSpeedFast}
          </OptionButton>
          <OptionButton selected={animationSpeed === "mediate"} icon={<GaugeIcon size={16} />} onClick={() => setAnimationSpeed("mediate")}>
            {t.settings.switchSpeedMediate}
          </OptionButton>
          <OptionButton selected={animationSpeed === "slow"} icon={<HourglassIcon size={16} />} onClick={() => setAnimationSpeed("slow")}>
            {t.settings.switchSpeedSlow}
          </OptionButton>
        </div>
      </SettingSection>

      <SettingSection title={t.settings.particleFeedbackTitle}>
        <SettingRow
          icon={<SparklesIcon size={15} />}
          title={t.settings.particleFeedbackTitle}
          description={t.settings.particleFeedbackBody}
          action={<ToggleButton enabled={enableParticles} onClick={() => setEnableParticles(!enableParticles)} />}
        />
      </SettingSection>
    </>
  );
}

function NotificationSettings({
  enableReminderSound,
  notificationFeedback,
  isOpeningNotificationSettings,
  isTestingNotification,
  setEnableReminderSound,
  handleOpenNotificationSettings,
  handleTestReminderNotification,
}: {
  enableReminderSound: boolean;
  notificationFeedback: HotkeyFeedback | null;
  isOpeningNotificationSettings: boolean;
  isTestingNotification: boolean;
  setEnableReminderSound: (enabled: boolean) => void;
  handleOpenNotificationSettings: () => void;
  handleTestReminderNotification: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.reminderSoundTitle}>
        <SettingRow
          icon={<Clock3Icon size={15} />}
          title={t.settings.reminderSoundTitle}
          description={t.settings.reminderSoundBody}
          action={<ToggleButton enabled={enableReminderSound} onClick={() => setEnableReminderSound(!enableReminderSound)} />}
        />
      </SettingSection>

      <SettingSection title={t.settings.reminderTestTitle} description={t.settings.reminderTestBody}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-3">
          <p className="text-[12px] leading-6 text-[var(--muted)]">{t.settings.reminderTestBody}</p>
          <motion.button
            type="button"
            className="paper-button inline-flex shrink-0 items-center justify-center rounded-[14px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleTestReminderNotification}
          >
            {isTestingNotification ? `${t.settings.reminderTestButton}...` : t.settings.reminderTestButton}
          </motion.button>
        </div>
      </SettingSection>

      <SettingSection title={t.settings.notificationPermissionTitle} description={t.settings.notificationPermissionBody}>
        <div className="rounded-[20px] border border-[rgba(213,198,180,0.72)] bg-[rgba(255,252,248,0.78)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-[12px] leading-6 text-[var(--muted)]">{t.settings.notificationPermissionBody}</p>
            <motion.button
              type="button"
              className="paper-button inline-flex shrink-0 items-center justify-center rounded-[14px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              onClick={handleOpenNotificationSettings}
            >
              {isOpeningNotificationSettings
                ? `${t.settings.notificationOpenSettingsButton}...`
                : t.settings.notificationOpenSettingsButton}
            </motion.button>
          </div>
          <ol className="mt-3 space-y-1.5 pl-4 text-[11px] leading-5 text-[var(--muted)]">
            <li>{t.settings.notificationPermissionStepOne}</li>
            <li>{t.settings.notificationPermissionStepTwo}</li>
            <li>{t.settings.notificationPermissionStepThree}</li>
          </ol>
        </div>
        {notificationFeedback ? (
          <p className={`mt-3 text-[11px] font-medium leading-5 ${feedbackClassName(notificationFeedback.tone)}`}>
            {notificationFeedback.text}
          </p>
        ) : null}
      </SettingSection>
    </>
  );
}

function SystemSettings({
  panelPosition,
}: {
  panelPosition: { x: number; y: number } | null;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.panelStatusTitle} description={t.settings.panelStatusSubtitle}>
        <SettingRow
          icon={<MapPinIcon size={15} />}
          title={t.settings.lastSavedPosition}
          description={panelPosition ? `x ${panelPosition.x}  y ${panelPosition.y}` : t.settings.unset}
        />
      </SettingSection>

      <SettingSection title={t.settings.dataScopeTitle}>
        <SettingRow
          icon={<NotebookPenIcon size={15} />}
          title={t.settings.dataScopeTitle}
          description={t.settings.dataScopeBody}
        />
      </SettingSection>
    </>
  );
}
