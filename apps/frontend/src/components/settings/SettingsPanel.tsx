import { AnimatePresence, motion } from "framer-motion";
import { floatemBranding } from "@floatem/branding";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getLaunchAtLoginStatus, registerHotkey } from "../../hooks/usePlatform";
import { captureShortcutFromKeyEvent, getShortcutDisplayLabel } from "../../lib/hotkeyCapture";
import { useI18n } from "../../lib/i18n";
import {
  DEFAULT_SETTINGS,
  getSelectableTimeZones,
  getSystemTimeZone,
  type AppLanguage,
  type ThemeId,
  type TimeFormat,
} from "../../lib/models";
import { getFloatemBridge, isNativeFloatemHost } from "../../lib/nativeBridge";
import { formatTimeInTimeZone } from "../../lib/timeZoneDate";
import { getSettingsMenuMotionConfig, type TransitionDirection } from "../../lib/transitionMotion";
import { useSettingsStore } from "../../store/settingsStore";
import {
  AlertTriangleIcon,
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
  NotebookPenIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  XIcon,
} from "../icons/AppIcons";
import { ThemeAtmosphere } from "../theme/ThemeAtmosphere";

type SettingsPanelProps = {
  onClose: () => void;
};

type FeedbackTone = "error" | "info" | "success";

type HotkeyFeedback = {
  text: string;
  tone: FeedbackTone;
};

type SettingsCategoryId = "general" | "theme" | "shortcuts" | "motion" | "notifications" | "about";

const FEEDBACK_AUTO_DISMISS_MS = 4_000;
const FLOATEM_WEBSITE_URL = "https://han-chh.github.io/Floatem-App/";
export const SETTINGS_LANGUAGE_ORDER: readonly AppLanguage[] = ["zh-CN", "en"];

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
      data-tooltip={typeof children === "string" ? children : undefined}
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
  tooltip,
}: {
  enabled: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={enabled}
      data-tooltip={tooltip}
      data-tooltip-align="left"
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

function useAutoDismissFeedback(
  feedback: HotkeyFeedback | null,
  setFeedback: (feedback: HotkeyFeedback | null) => void,
) {
  useEffect(() => {
    if (!feedback || feedback.tone === "info" || typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, FEEDBACK_AUTO_DISMISS_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [feedback, setFeedback]);
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
    <section className="paper-card w-full rounded-[24px] p-4">
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
    <div className="surface-field w-full rounded-[20px] px-4 py-3">
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
  guideId,
  icon,
  title,
  description,
  meta,
  onClick,
}: {
  guideId?: string;
  icon: ReactNode;
  title: string;
  description: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      data-guide-settings-category={guideId}
      data-tooltip={title}
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
      className={`first-level-action rounded-[24px] border px-4 py-4 ${danger ? "first-level-action--danger" : ""}`}
    >
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className={`text-[13px] font-semibold ${danger ? "text-[var(--theme-action-text)]" : "text-[var(--brown-strong)]"}`}>
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
            data-tooltip={buttonLabel}
            className={
              danger
                ? "paper-button paper-button-danger inline-flex shrink-0 items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold"
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
  const hotkeyRegistrationState = useSettingsStore((state) => state.hotkeyRegistrationState);
  const language = useSettingsStore((state) => state.language);
  const timeZone = useSettingsStore((state) => state.timeZone);
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const theme = useSettingsStore((state) => state.theme);
  const defaultOpenSection = useSettingsStore((state) => state.defaultOpenSection);
  const lastActiveTab = useSettingsStore((state) => state.lastActiveTab);
  const transitionStyle = useSettingsStore((state) => state.transitionStyle);
  const animationSpeed = useSettingsStore((state) => state.animationSpeed);
  const launchAtLogin = useSettingsStore((state) => state.launchAtLogin);
  const enableParticles = useSettingsStore((state) => state.enableParticles);
  const enableReminderSound = useSettingsStore((state) => state.enableReminderSound);
  const setHotkey = useSettingsStore((state) => state.setHotkey);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setTimeZone = useSettingsStore((state) => state.setTimeZone);
  const setTimeFormat = useSettingsStore((state) => state.setTimeFormat);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setDefaultOpenSection = useSettingsStore((state) => state.setDefaultOpenSection);
  const setTransitionStyle = useSettingsStore((state) => state.setTransitionStyle);
  const setAnimationSpeed = useSettingsStore((state) => state.setAnimationSpeed);
  const setLaunchAtLogin = useSettingsStore((state) => state.setLaunchAtLogin);
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

  useAutoDismissFeedback(hotkeyDialogFeedback, setHotkeyDialogFeedback);
  useAutoDismissFeedback(hotkeyFeedback, setHotkeyFeedback);
  useAutoDismissFeedback(defaultsFeedback, setDefaultsFeedback);
  useAutoDismissFeedback(notificationFeedback, setNotificationFeedback);
  useAutoDismissFeedback(systemFeedback, setSystemFeedback);

  useEffect(() => {
    scrollRegionRef.current?.scrollTo({ top: 0 });
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory !== "general" || typeof window === "undefined") {
      return;
    }

    let cancelled = false;
    const refreshLaunchAtLogin = async () => {
      try {
        const status = await getLaunchAtLoginStatus();
        if (!cancelled && status) {
          setLaunchAtLogin(status.enabled);
        }
      } catch {
        // Keep the last known value when the native status cannot be queried.
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshLaunchAtLogin();
      }
    };

    void refreshLaunchAtLogin();
    window.addEventListener("focus", refreshLaunchAtLogin);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshLaunchAtLogin);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeCategory, setLaunchAtLogin]);

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
        meta: `${language === "en" ? t.settings.englishMode : t.settings.zhMode} / ${timeZone}`,
      },
      {
        id: "theme" as const,
        icon: <PaletteIcon size={18} />,
        title: t.settings.categoryThemeTitle,
        description: t.settings.categoryThemeDescription,
        meta: getThemeLabel(theme, t),
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
        id: "about" as const,
        icon: <NotebookPenIcon size={18} />,
        title: t.settings.categoryAboutTitle,
        description: t.settings.categoryAboutDescription,
        meta: `${t.settings.appVersionTitle} ${__FLOATEM_VERSION__}`,
      },
    ],
    [enableReminderSound, hotkey, language, t, theme, timeZone, transitionStyle],
  );
  const showHotkeyConflictWarning = hotkeyRegistrationState?.registration === "conflict";

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

    if (!isNativeFloatemHost()) {
      setNotificationFeedback({
        text: t.settings.reminderTestUnsupported,
        tone: "info",
      });
      return;
    }

    setIsTestingNotification(true);
    setNotificationFeedback(null);

    try {
      await getFloatemBridge().testReminderNotification({
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

    if (!isNativeFloatemHost()) {
      setNotificationFeedback({
        text: t.settings.notificationOpenSettingsUnsupported,
        tone: "info",
      });
      return;
    }

    setIsOpeningNotificationSettings(true);

    try {
      await getFloatemBridge().openNotificationSettings();
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

    if (!isNativeFloatemHost()) {
      setSystemFeedback({
        text: t.settings.quitApplicationFailed,
        tone: "info",
      });
      return;
    }

    setIsQuittingApplication(true);

    try {
      await getFloatemBridge().quitApplication();
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
    <section data-testid="settings-panel" data-guide="settings-overview" className="relative h-full min-h-0">
      <div
        ref={scrollRegionRef}
        data-testid="settings-scroll-region"
        className="settings-scroll-region paper-scroll relative h-full overflow-y-auto px-5 pb-5 pt-5"
        style={categoryMotion.sceneStyle}
      >
        <ThemeAtmosphere scrollRootRef={scrollRegionRef} />
        <div data-theme-scroll-content className="relative z-10 min-h-full">
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
              <div className="relative z-40 mb-5 overflow-visible">
                <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <motion.button
                      type="button"
                      data-guide="settings-back"
                      data-tooltip={t.settings.backToSettings}
                      className="paper-button inline-flex h-11 max-w-full shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-[var(--muted)]"
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={closeCategory}
                    >
                      <CornerDownLeftIcon size={14} />
                      <span className="whitespace-nowrap">{t.settings.backToSettings}</span>
                    </motion.button>
                    <div
                      data-testid="settings-category-toolbar-icon"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[17px] bg-[rgba(47,107,255,0.10)] text-[#2853C7]"
                    >
                      {currentCategory.icon}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    aria-label={t.common.close}
                    data-guide="settings-close"
                    data-tooltip={t.common.close}
                    className="paper-icon-button h-11 w-11 shrink-0"
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={onClose}
                  >
                    <XIcon size={16} />
                  </motion.button>
                </div>
                <div
                  data-testid="settings-category-title-frame"
                  className="w-full min-w-0 px-1 py-1"
                >
                  <h2 className="font-display text-[26px] font-semibold tracking-normal text-[var(--brown-strong)]">
                    {currentCategory.title}
                  </h2>
                  <p className="mt-2 max-w-[58ch] text-[13px] leading-6 text-[var(--muted)]">
                    {currentCategory.description}
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-4 pb-2">
                {activeCategory === "general" ? (
                  <GeneralSettings
                    language={language}
                    setLanguage={setLanguage}
                    timeZone={timeZone}
                    setTimeZone={setTimeZone}
                    timeFormat={timeFormat}
                    setTimeFormat={setTimeFormat}
                    launchAtLogin={launchAtLogin}
                    setLaunchAtLogin={setLaunchAtLogin}
                  />
                ) : null}

                {activeCategory === "shortcuts" ? (
                  <ShortcutSettings
                    hotkey={hotkey}
                    defaultOpenSection={defaultOpenSection}
                    lastActiveTab={lastActiveTab}
                    hotkeyRegistrationState={hotkeyRegistrationState}
                    hotkeyFeedback={hotkeyFeedback}
                    openHotkeyDialog={openHotkeyDialog}
                    setDefaultOpenSection={setDefaultOpenSection}
                  />
                ) : null}

                {activeCategory === "theme" ? (
                  <ThemeSettings
                    theme={theme}
                    setTheme={setTheme}
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

                {activeCategory === "about" ? (
                  <AboutFloatemSettings />
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
                    Floatem
                  </h2>
                  <p className="mt-2 max-w-[58ch] text-[13px] leading-6 text-[var(--muted)]">
                    {t.settings.appIntro}
                  </p>
                </div>
                <motion.button
                  type="button"
                  aria-label={t.common.close}
                  data-guide="settings-close"
                  data-tooltip={t.common.close}
                  className="paper-icon-button h-11 w-11 shrink-0 self-start"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={onClose}
                >
                  <XIcon size={16} />
                </motion.button>
              </div>

              <div className="space-y-3">
                {showHotkeyConflictWarning ? (
                  <PersistentHotkeyConflictWarning
                    shortcut={hotkeyRegistrationState.shortcut}
                    message={hotkeyRegistrationState.message}
                  />
                ) : null}
                {categories.map((category) => (
                  <CategoryButton
                    key={category.id}
                    guideId={category.id}
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
      </div>

      <AnimatePresence>
        {hotkeyDialogOpen ? (
          <motion.div
            data-no-window-drag="true"
            className="floatem-modal-backdrop absolute inset-0 z-40 flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-8"
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
                  data-tooltip={t.common.close}
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
                    data-tooltip={t.common.cancel}
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
                    data-tooltip={t.settings.shortcutApply}
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

const THEME_PREVIEWS: Record<ThemeId, { background: string; surface: string; accent: string; text: string }> = {
  classic: { background: "#f1e5d3", surface: "#fff9f0", accent: "#ff7a59", text: "#1e1915" },
  forest: { background: "#c8dacb", surface: "#f1f7f2", accent: "#2f7350", text: "#14251b" },
  orchid: { background: "#dfeadd", surface: "#fbfdf9", accent: "#73906b", text: "#1f2d20" },
  plum: { background: "#e9cbd2", surface: "#fff7f8", accent: "#a43f5c", text: "#421c26" },
  chrysanthemum: { background: "#eadca8", surface: "#fffaf0", accent: "#ad7f1d", text: "#352c16" },
  afterglow: {
    background: "linear-gradient(135deg,#fff1dc 0%,#f1c9b4 48%,#d9b8cf 76%,#9fc4cf 100%)",
    surface: "rgba(255,250,243,0.9)",
    accent: "linear-gradient(135deg,#f0bd58 0%,#e8756c 38%,#9c74b5 69%,#73aab9 100%)",
    text: "#403632",
  },
};

function getThemeLabel(theme: ThemeId, t: ReturnType<typeof useI18n>["t"]) {
  return {
    classic: t.settings.themeClassicTitle,
    forest: t.settings.themeForestTitle,
    orchid: t.settings.themeOrchidTitle,
    plum: t.settings.themePlumTitle,
    chrysanthemum: t.settings.themeChrysanthemumTitle,
    afterglow: t.settings.themeAfterglowTitle,
  }[theme];
}

function ThemeChoice({
  theme,
  selected,
  onClick,
}: {
  theme: ThemeId;
  selected: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const preview = THEME_PREVIEWS[theme];

  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      data-guide-theme={theme}
      className={`group overflow-hidden rounded-[20px] border p-2.5 text-left ${
        selected ? "border-[var(--border-strong)] shadow-[0_0_0_3px_var(--theme-selection-ring)]" : "border-[var(--theme-border)]"
      }`}
      style={{ background: preview.background }}
      whileHover={{ y: -2, scale: 1.008 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
    >
      <span className="relative block overflow-hidden rounded-[15px] border border-white/40 p-3" style={{ background: preview.surface }}>
        {theme === "afterglow" ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-7 -right-6 h-16 w-16 rounded-full blur-xl"
              style={{ background: "rgba(224,101,112,0.42)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-7 left-2 h-12 w-24 rotate-[-12deg] rounded-full blur-lg"
              style={{ background: "linear-gradient(90deg,rgba(237,181,79,.5),rgba(227,105,101,.42),rgba(145,105,170,.38),rgba(112,166,184,.4))" }}
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-10 top-2 text-[13px] leading-none text-[#d99d42] drop-shadow-[0_0_5px_rgba(221,168,94,.45)]">✦</span>
            <span aria-hidden="true" className="pointer-events-none absolute right-7 top-7 text-[8px] leading-none text-[#a57db8]">✦</span>
          </>
        ) : null}
        <span className="mb-5 flex items-center justify-between">
          <span className="h-2.5 w-12 rounded-full opacity-70" style={{ background: preview.text }} />
          <span
            data-testid={`theme-swatch-${theme}`}
            className="h-5 w-5 rounded-full"
            style={{ background: preview.accent }}
          />
        </span>
        <span className="block text-[12px] font-semibold" style={{ color: preview.text }}>
          {getThemeLabel(theme, t)}
        </span>
      </span>
    </motion.button>
  );
}

function ThemeSettings({
  theme,
  setTheme,
}: {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}) {
  const { t } = useI18n();
  const themes: ThemeId[] = ["classic", "afterglow", "plum", "orchid", "forest", "chrysanthemum"];

  return (
    <SettingSection title={t.settings.themeManualTitle} description={t.settings.themeManualBody}>
      <div className="grid grid-cols-2 gap-2.5">
        {themes.map((candidate) => (
          <ThemeChoice
            key={candidate}
            theme={candidate}
            selected={theme === candidate}
            onClick={() => setTheme(candidate)}
          />
        ))}
      </div>
    </SettingSection>
  );
}

function GeneralSettings({
  language,
  setLanguage,
  timeZone,
  setTimeZone,
  timeFormat,
  setTimeFormat,
  launchAtLogin,
  setLaunchAtLogin,
}: {
  language: "en" | "zh-CN";
  setLanguage: (language: "en" | "zh-CN") => void;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (timeFormat: TimeFormat) => void;
  launchAtLogin: boolean;
  setLaunchAtLogin: (launchAtLogin: boolean) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.startupTitle} description={t.settings.startupSubtitle}>
        <SettingRow
          icon={<SlidersHorizontalIcon size={15} />}
          title={t.settings.launchAtLoginTitle}
          description={t.settings.launchAtLoginBody}
          action={
            <ToggleButton
              enabled={launchAtLogin}
              tooltip={t.settings.launchAtLoginTitle}
              onClick={() => setLaunchAtLogin(!launchAtLogin)}
            />
          }
        />
      </SettingSection>

      <SettingSection title={t.settings.languageTitle} description={t.settings.languageSectionSubtitle}>
        <div className="grid gap-2">
          {SETTINGS_LANGUAGE_ORDER.map((option) => (
            <OptionButton
              key={option}
              selected={language === option}
              icon={option === "zh-CN" ? <ChineseLanguageIcon size={16} /> : <EnglishLanguageIcon size={16} />}
              onClick={() => setLanguage(option)}
            >
              {option === "zh-CN" ? t.common.simplifiedChinese : t.common.english}
            </OptionButton>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
          {language === "en" ? t.settings.languageEnglishBody : t.settings.languageSimplifiedChineseBody}
        </p>
      </SettingSection>

      <TimeZoneSettings
        timeZone={timeZone}
        timeFormat={timeFormat}
        setTimeZone={setTimeZone}
        setTimeFormat={setTimeFormat}
      />
    </>
  );
}

function TimeZoneSettings({
  timeZone,
  timeFormat,
  setTimeZone,
  setTimeFormat,
}: {
  timeZone: string;
  timeFormat: TimeFormat;
  setTimeZone: (timeZone: string) => void;
  setTimeFormat: (timeFormat: TimeFormat) => void;
}) {
  const { t } = useI18n();
  const [systemTimeZone, setSystemTimeZone] = useState(() => getSystemTimeZone());
  const [now, setNow] = useState(() => new Date());
  const [isTimeZoneMenuOpen, setIsTimeZoneMenuOpen] = useState(false);
  const timeZoneMenuRef = useRef<HTMLDivElement | null>(null);
  const timeZoneOptions = useMemo(() => {
    const options = new Set([...getSelectableTimeZones(systemTimeZone), timeZone]);
    return Array.from(options).sort((first, second) => first.localeCompare(second));
  }, [systemTimeZone, timeZone]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isTimeZoneMenuOpen || typeof window === "undefined") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!timeZoneMenuRef.current?.contains(event.target as Node)) {
        setIsTimeZoneMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTimeZoneMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTimeZoneMenuOpen]);

  const useSystemTimeZone = () => {
    const currentSystemTimeZone = getSystemTimeZone();
    setSystemTimeZone(currentSystemTimeZone);
    setTimeZone(currentSystemTimeZone);
    setIsTimeZoneMenuOpen(false);
  };

  return (
    <SettingSection title={t.settings.timeZoneTitle} description={t.settings.timeZoneSubtitle}>
      <div className="grid gap-3">
        <div className="surface-field rounded-[20px] px-4 py-3">
          <div className="flex flex-col items-start gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(47,107,255,0.08)] text-[#2853C7]">
                <Clock3Icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[var(--muted)]">{t.settings.timeZoneCurrentLabel}</p>
                <p className="truncate text-[13px] font-semibold text-[var(--brown-strong)]">{timeZone}</p>
                <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                  {t.settings.timeZoneCurrentTime(formatTimeInTimeZone(now, timeZone, timeFormat))}
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              data-no-window-drag="true"
              data-tooltip={t.settings.timeZoneUseSystem}
              className="paper-button paper-button-secondary inline-flex w-full shrink-0 items-center justify-center rounded-[14px] px-3 py-2 text-center text-[12px] font-semibold leading-5"
              whileHover={{ y: -1.5, scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              onClick={useSystemTimeZone}
            >
              {t.settings.timeZoneUseSystem}
            </motion.button>
          </div>

          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] border border-[rgba(213,198,180,0.78)] bg-white/76 px-3 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--brown-strong)]">{t.settings.timeFormatTitle}</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
                {timeFormat === "24h" ? t.settings.timeFormat24Body : t.settings.timeFormat12Body}
              </p>
            </div>
            <div className="flex justify-end">
              <ToggleButton
                enabled={timeFormat === "24h"}
                tooltip={t.settings.timeFormatTitle}
                onClick={() => setTimeFormat(timeFormat === "24h" ? "12h" : "24h")}
              />
            </div>
          </div>

          <div ref={timeZoneMenuRef} className="relative mt-3">
            <p className="mb-1 block text-[11px] font-semibold text-[var(--muted)]" id="floatem-time-zone-label">
              {t.settings.timeZoneSelectLabel}
            </p>
            <button
              type="button"
              id="floatem-time-zone"
              aria-expanded={isTimeZoneMenuOpen}
              aria-haspopup="listbox"
              aria-labelledby="floatem-time-zone-label floatem-time-zone"
              data-no-window-drag="true"
              data-tooltip={t.settings.timeZoneSelectLabel}
              className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[rgba(213,198,180,0.88)] bg-white/92 px-3 py-2.5 text-left text-[12px] font-semibold text-[var(--brown-strong)] outline-none focus:border-[rgba(47,107,255,0.45)]"
              onClick={() => setIsTimeZoneMenuOpen((open) => !open)}
            >
              <span className="min-w-0 truncate">{timeZone}</span>
              <ChevronDownIcon className={isTimeZoneMenuOpen ? "rotate-180" : ""} size={14} />
            </button>
            {isTimeZoneMenuOpen ? (
              <div
                role="listbox"
                aria-labelledby="floatem-time-zone-label"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-[18px] border border-[rgba(213,198,180,0.92)] bg-white p-1.5 shadow-[0_18px_36px_rgba(30,25,21,0.14)]"
              >
                {timeZoneOptions.map((option) => {
                  const selected = option === timeZone;

                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-no-window-drag="true"
                      data-tooltip={t.settings.timeZoneOptionLabel(option, formatTimeInTimeZone(now, option, timeFormat))}
                      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[12px] ${
                        selected
                          ? "bg-[rgba(47,107,255,0.10)] text-[#2853C7]"
                          : "text-[var(--brown-strong)] hover:bg-[rgba(30,25,21,0.05)]"
                      }`}
                      onClick={() => {
                        setTimeZone(option);
                        setIsTimeZoneMenuOpen(false);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{option}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                          {formatTimeInTimeZone(now, option, timeFormat)}
                        </span>
                      </span>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected ? "bg-[var(--accent-cobalt)]" : "bg-transparent"}`} />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
            {t.settings.timeZoneSystemLabel(systemTimeZone)}
          </p>
        </div>
      </div>
    </SettingSection>
  );
}

function ShortcutSettings({
  hotkey,
  defaultOpenSection,
  lastActiveTab,
  hotkeyRegistrationState,
  hotkeyFeedback,
  openHotkeyDialog,
  setDefaultOpenSection,
}: {
  hotkey: string;
  defaultOpenSection: "last" | "notes" | "todos";
  lastActiveTab: "notes" | "todos";
  hotkeyRegistrationState: import("@floatem/native-bridge").HotkeyRegistrationState | null;
  hotkeyFeedback: HotkeyFeedback | null;
  openHotkeyDialog: () => void;
  setDefaultOpenSection: (section: "last" | "notes" | "todos") => void;
}) {
  const { t } = useI18n();
  const showHotkeyConflictWarning = hotkeyRegistrationState?.registration === "conflict";

  return (
    <>
      <SettingSection title={t.settings.globalShortcutTitle} description={t.settings.hotkeyHint}>
        {showHotkeyConflictWarning ? (
          <div className="mb-3">
            <PersistentHotkeyConflictWarning
              shortcut={hotkeyRegistrationState.shortcut}
              message={hotkeyRegistrationState.message}
            />
          </div>
        ) : null}
        <SettingRow
          icon={<KeyboardIcon size={15} />}
          title={getShortcutDisplayLabel(hotkey)}
          description={t.settings.defaultLaunchShortcut(getShortcutDisplayLabel(DEFAULT_SETTINGS.hotkey))}
          action={
            <motion.button
              type="button"
              data-no-window-drag="true"
              data-tooltip={t.common.change}
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

function PersistentHotkeyConflictWarning({
  shortcut,
  message,
}: {
  shortcut: string;
  message?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-[22px] border border-[rgba(201,93,68,0.32)] bg-[rgba(201,93,68,0.12)] px-4 py-3.5 text-[rgb(150,68,52)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex shrink-0">
          <AlertTriangleIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{t.settings.hotkeyConflictTitle}</p>
          <p className="mt-1 text-[12px] leading-6">{t.settings.hotkeyConflictBody(shortcut)}</p>
          {message ? <p className="mt-1 text-[11px] leading-5 opacity-90">{message}</p> : null}
        </div>
      </div>
    </div>
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
          action={
            <ToggleButton
              enabled={enableParticles}
              tooltip={t.settings.particleFeedbackTitle}
              onClick={() => setEnableParticles(!enableParticles)}
            />
          }
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
          action={
            <ToggleButton
              enabled={enableReminderSound}
              tooltip={t.settings.reminderSoundTitle}
              onClick={() => setEnableReminderSound(!enableReminderSound)}
            />
          }
        />
      </SettingSection>

      <SettingSection title={t.settings.notificationPermissionTitle} description={t.settings.notificationPermissionBody}>
        <div className="rounded-[20px] border border-[rgba(213,198,180,0.72)] bg-[rgba(255,252,248,0.78)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-[12px] leading-6 text-[var(--muted)]">{t.settings.notificationPermissionBody}</p>
            <motion.button
              type="button"
              data-tooltip={t.settings.notificationOpenSettingsButton}
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

      <SettingSection title={t.settings.reminderTestTitle} description={t.settings.reminderTestBody}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-3">
          <p className="text-[12px] leading-6 text-[var(--muted)]">{t.settings.reminderTestBody}</p>
          <motion.button
            type="button"
            data-tooltip={t.settings.reminderTestButton}
            className="paper-button inline-flex shrink-0 items-center justify-center rounded-[14px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
            whileHover={{ y: -2, scale: 1.02 }}
            whileTap={{ scale: 0.985 }}
            onClick={handleTestReminderNotification}
          >
            {isTestingNotification ? `${t.settings.reminderTestButton}...` : t.settings.reminderTestButton}
          </motion.button>
        </div>
      </SettingSection>
    </>
  );
}

function AboutFloatemSettings() {
  const { t } = useI18n();

  return (
    <>
      <SettingSection title={t.settings.aboutOverviewTitle} description={t.settings.aboutSubtitle}>
        <div className="grid gap-3">
          <div
            data-testid="about-brand-block"
            className="overflow-hidden rounded-[24px] border border-[rgba(213,198,180,0.9)] bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(255,246,236,0.84))] px-5 py-5 shadow-[0_14px_28px_rgba(61,49,34,0.08)]"
          >
            <p className="font-display text-[25px] font-semibold tracking-[-0.045em] text-[var(--brown-strong)]">
              {floatemBranding.displayName}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[#8f553d]">
              {floatemBranding.slogan}
            </p>
            <div className="mt-4 space-y-1 text-[11.5px] leading-5 text-[var(--muted)]">
              <p>Version {__FLOATEM_VERSION__} (Build {__FLOATEM_BUILD__})</p>
            </div>
          </div>
          <SettingRow icon={<NotebookPenIcon size={15} />} title={t.settings.aboutNotesTitle} description={t.settings.aboutNotesBody} />
          <SettingRow icon={<CircleCheckBigIcon size={15} />} title={t.settings.aboutTodosTitle} description={t.settings.aboutTodosBody} />
          <SettingRow icon={<SlidersHorizontalIcon size={15} />} title={t.settings.aboutTrayFlowTitle} description={t.settings.aboutTrayFlowBody} />
        </div>
      </SettingSection>

      <SettingSection title={t.settings.dataScopeTitle} description={t.settings.dataScopeSubtitle}>
        <div className="grid gap-3">
          <SettingRow
            icon={<NotebookPenIcon size={15} />}
            title={t.settings.dataLocalTitle}
            description={t.settings.dataScopeBody}
          />
          <SettingRow
            icon={<SlidersHorizontalIcon size={15} />}
            title={t.settings.dataSystemTitle}
            description={t.settings.dataSystemBody}
          />
          <SettingRow
            icon={<CircleCheckBigIcon size={15} />}
            title={t.settings.dataPrivacyTitle}
            description={t.settings.dataPrivacyBody}
          />
        </div>
      </SettingSection>

      <SettingSection title={t.settings.contactTitle} description={t.settings.contactBody}>
        <a
          href="mailto:floatemapp@outlook.com"
          className="surface-field flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-[13px] font-semibold text-[#2853C7] transition-transform hover:-translate-y-0.5"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(47,107,255,0.08)]">
            @
          </span>
          floatemapp@outlook.com
        </a>
      </SettingSection>

      <SettingSection title={t.settings.websiteTitle} description={t.settings.websiteBody}>
        <a
          href={FLOATEM_WEBSITE_URL}
          target="_blank"
          rel="noreferrer"
          className="surface-field flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-[13px] font-semibold text-[#2853C7] transition-transform hover:-translate-y-0.5"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(47,107,255,0.08)]">
            ↗
          </span>
          <span className="break-all">{FLOATEM_WEBSITE_URL}</span>
        </a>
      </SettingSection>

      <footer
        data-testid="about-copyright-footer"
        className="mt-8 border-t border-[rgba(213,198,180,0.72)] px-2 pb-2 pt-6 text-center text-[11px] leading-5 text-[var(--muted)]"
      >
        <p>Designed and developed by Hank Chen</p>
        <p>© 2026 Hank Chen. All rights reserved.</p>
      </footer>
    </>
  );
}
