import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { registerHotkey } from "../../hooks/usePlatform";
import { startWindowDrag } from "../../hooks/useWindowDrag";
import { captureShortcutFromKeyEvent, getShortcutDisplayLabel } from "../../lib/hotkeyCapture";
import { useI18n } from "../../lib/i18n";
import { DEFAULT_SETTINGS } from "../../lib/models";
import { getQuickNoteBridge, isNativeQuickNoteHost } from "../../lib/nativeBridge";
import { useSettingsStore } from "../../store/settingsStore";
import {
  CircleCheckBigIcon,
  ChineseLanguageIcon,
  Clock3Icon,
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
  const [capturedShortcut, setCapturedShortcut] = useState<string | null>(null);
  const [hotkeyDialogOpen, setHotkeyDialogOpen] = useState(false);
  const [hotkeyDialogFeedback, setHotkeyDialogFeedback] = useState<HotkeyFeedback | null>(null);
  const [hotkeyFeedback, setHotkeyFeedback] = useState<HotkeyFeedback | null>(null);
  const [defaultsFeedback, setDefaultsFeedback] = useState<HotkeyFeedback | null>(null);
  const [notificationFeedback, setNotificationFeedback] = useState<HotkeyFeedback | null>(null);
  const [isApplyingHotkey, setIsApplyingHotkey] = useState(false);
  const [isRestoringDefaults, setIsRestoringDefaults] = useState(false);
  const [isOpeningNotificationSettings, setIsOpeningNotificationSettings] = useState(false);
  const [isQuittingApplication, setIsQuittingApplication] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

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

  const feedbackClassName = (tone: FeedbackTone) => {
    if (tone === "success") {
      return "text-[#0f7a58]";
    }

    if (tone === "error") {
      return "text-[#b64b2e]";
    }

    return "text-[var(--muted)]";
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
      setNotificationFeedback({
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
      setNotificationFeedback({
        text: message,
        tone: "error",
      });
      setIsQuittingApplication(false);
    }
  };

  return (
    <section
      data-testid="settings-panel"
      className="relative flex h-full min-h-0 flex-col"
    >
      <div className="relative shrink-0 px-5 pb-4 pt-5 pr-[5.5rem]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="status-chip" data-tone="blue">
              <SlidersHorizontalIcon size={12} />
              {t.app.settings}
            </span>
            <span className="status-chip" data-tone="neutral">{t.app.localOnly}</span>
          </div>
          <p className="font-display text-[26px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
            QuickNote
          </p>
          <p className="mt-1 max-w-[58ch] text-[13px] leading-6 text-[var(--muted)]">
            {t.settings.appIntro}
          </p>
        </div>

        <motion.button
          type="button"
          aria-label={t.common.close}
          className="paper-icon-button absolute right-5 top-5 z-10 shrink-0"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          onClick={onClose}
        >
          <XIcon size={16} />
        </motion.button>
      </div>

      <div
        data-testid="settings-scroll-region"
        className="paper-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5"
      >
        <div className="settings-grid pb-1">
          <SettingsCard
            wide
            icon={<SparklesIcon size={18} />}
            title={t.settings.aboutTitle}
            subtitle={t.settings.aboutSubtitle}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
                  <NotebookPenIcon size={15} />
                  {t.tabs.notes}
                </p>
                <p className="text-[12px] leading-6 text-[var(--muted)]">
                  {t.settings.aboutNotesBody}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
                  <CircleCheckBigIcon size={15} />
                  {t.tabs.todos}
                </p>
                <p className="text-[12px] leading-6 text-[var(--muted)]">
                  {t.settings.aboutTodosBody}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
                  <SlidersHorizontalIcon size={15} />
                  {t.settings.aboutTrayFlowTitle}
                </p>
                <p className="text-[12px] leading-6 text-[var(--muted)]">
                  {t.settings.aboutTrayFlowBody}
                </p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={<KeyboardIcon size={18} />}
            title={t.settings.launchAndNavigationTitle}
            subtitle={t.settings.launchAndNavigationSubtitle}
          >
            <div className="space-y-4">
              <div className="block">
                <span className="mb-2 block text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.globalShortcutTitle}</span>
                <div className="surface-field flex items-center justify-between gap-3 rounded-[18px] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--dark-text)]">{getShortcutDisplayLabel(hotkey)}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                      {t.settings.hotkeyHint}
                    </p>
                  </div>
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
                </div>
                <span className="mt-2 block text-[11px] leading-5 text-[var(--muted)]">
                  {t.settings.defaultLaunchShortcut(getShortcutDisplayLabel(DEFAULT_SETTINGS.hotkey))}
                </span>
                {hotkeyFeedback ? (
                  <p className={`mt-2 text-[11px] font-medium leading-5 ${feedbackClassName(hotkeyFeedback.tone)}`}>
                    {hotkeyFeedback.text}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.languageTitle}</p>
                <div className="grid gap-2">
                  <OptionButton
                    selected={language === "en"}
                    icon={<EnglishLanguageIcon size={16} />}
                    onClick={() => setLanguage("en")}
                  >
                    {t.common.english}
                  </OptionButton>
                  <OptionButton
                    selected={language === "zh-CN"}
                    icon={<ChineseLanguageIcon size={16} />}
                    onClick={() => setLanguage("zh-CN")}
                  >
                    {t.common.simplifiedChinese}
                  </OptionButton>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
                  {language === "en" ? t.settings.languageEnglishBody : t.settings.languageSimplifiedChineseBody}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.defaultSection}</p>
                <div className="grid gap-2">
                  <OptionButton
                    selected={defaultOpenSection === "last"}
                    icon={<SlidersHorizontalIcon size={16} />}
                    onClick={() => setDefaultOpenSection("last")}
                  >
                    {t.settings.openLastStoredSection}
                  </OptionButton>
                  <OptionButton
                    selected={defaultOpenSection === "notes"}
                    icon={<NotebookPenIcon size={16} />}
                    onClick={() => setDefaultOpenSection("notes")}
                  >
                    {t.settings.openNotesOnHotkey}
                  </OptionButton>
                  <OptionButton
                    selected={defaultOpenSection === "todos"}
                    icon={<CircleCheckBigIcon size={16} />}
                    onClick={() => setDefaultOpenSection("todos")}
                  >
                    {t.settings.openTodosOnHotkey}
                  </OptionButton>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
                  {t.settings.lastStoredSection(lastActiveTab === "notes" ? t.tabs.notes : t.tabs.todos)}
                </p>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={<SparklesIcon size={18} />}
            title={t.settings.motionAndFeedbackTitle}
            subtitle={t.settings.motionAndFeedbackSubtitle}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.tabTransitionStyle}</p>
                <div className="grid gap-2">
                  <OptionButton
                    selected={transitionStyle === "page"}
                    icon={<NotebookPenIcon size={16} />}
                    onClick={() => setTransitionStyle("page")}
                  >
                    {t.settings.transitionPage}
                  </OptionButton>
                  <OptionButton
                    selected={transitionStyle === "slide"}
                    icon={<SlidersHorizontalIcon size={16} />}
                    onClick={() => setTransitionStyle("slide")}
                  >
                    {t.settings.transitionSlide}
                  </OptionButton>
                  <OptionButton
                    selected={transitionStyle === "lift"}
                    icon={<SparklesIcon size={16} />}
                    onClick={() => setTransitionStyle("lift")}
                  >
                    {t.settings.transitionLift}
                  </OptionButton>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.switchSpeed}</p>
                <div className="grid gap-2">
                  <OptionButton
                    selected={animationSpeed === "rapid"}
                    icon={<FastForwardIcon size={16} />}
                    onClick={() => setAnimationSpeed("rapid")}
                  >
                    {t.settings.switchSpeedFast}
                  </OptionButton>
                  <OptionButton
                    selected={animationSpeed === "mediate"}
                    icon={<GaugeIcon size={16} />}
                    onClick={() => setAnimationSpeed("mediate")}
                  >
                    {t.settings.switchSpeedMediate}
                  </OptionButton>
                  <OptionButton
                    selected={animationSpeed === "slow"}
                    icon={<HourglassIcon size={16} />}
                    onClick={() => setAnimationSpeed("slow")}
                  >
                    {t.settings.switchSpeedSlow}
                  </OptionButton>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--brown-strong)]">{t.settings.particleFeedbackTitle}</p>
                  <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                    {t.settings.particleFeedbackBody}
                  </p>
                </div>
                <div className="flex justify-end">
                  <ToggleButton enabled={enableParticles} onClick={() => setEnableParticles(!enableParticles)} />
                </div>
              </div>

              <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--brown-strong)]">
                      <Clock3Icon size={14} />
                      {t.settings.reminderSoundTitle}
                    </p>
                    <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                      {t.settings.reminderSoundBody}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <ToggleButton
                      enabled={enableReminderSound}
                      onClick={() => setEnableReminderSound(!enableReminderSound)}
                    />
                  </div>
                </div>
                <div className="mt-3 border-t border-[rgba(213,198,180,0.72)] pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--brown-strong)]">
                        {t.settings.reminderTestTitle}
                      </p>
                      <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                        {t.settings.reminderTestBody}
                      </p>
                    </div>
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
                  <div className="mt-3 rounded-[18px] border border-[rgba(213,198,180,0.72)] bg-[rgba(255,252,248,0.78)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[var(--brown-strong)]">
                          {t.settings.notificationPermissionTitle}
                        </p>
                        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                          {t.settings.notificationPermissionBody}
                        </p>
                      </div>
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
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            wide
            icon={<MapPinIcon size={18} />}
            title={t.settings.panelStatusTitle}
            subtitle={t.settings.panelStatusSubtitle}
          >
            <div className="space-y-3">
              <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-4">
                <p className="text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.lastSavedPosition}</p>
                <p className="font-display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                  {panelPosition ? `x ${panelPosition.x}  y ${panelPosition.y}` : t.settings.unset}
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-4">
                <p className="text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.dataScopeTitle}</p>
                <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                  {t.settings.dataScopeBody}
                </p>
              </div>
              <div className="flex flex-col gap-3 rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--brown-strong)]">{t.settings.restoreDefaults}</p>
                  <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                    {t.settings.restoreDefaultsBody}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {defaultsFeedback ? (
                    <p className={`text-[11px] font-medium leading-5 ${feedbackClassName(defaultsFeedback.tone)}`}>
                      {defaultsFeedback.text}
                    </p>
                  ) : (
                    <span className="text-[11px] leading-5 text-[var(--muted)]">
                      {t.settings.defaultLaunchShortcut(getShortcutDisplayLabel(DEFAULT_SETTINGS.hotkey))}
                    </span>
                  )}
                  <motion.button
                    type="button"
                    data-no-window-drag="true"
                    className="paper-button paper-button-secondary inline-flex shrink-0 items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold"
                    whileHover={{ y: -1.5, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void handleRestoreDefaults()}
                  >
                    {isRestoringDefaults ? `${t.settings.restoreDefaults}...` : t.settings.restoreDefaults}
                  </motion.button>
                </div>
              </div>
              <div className="flex flex-col gap-3 rounded-[20px] border border-[rgba(226,132,112,0.28)] bg-[rgba(255,248,245,0.92)] px-4 py-4">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-[rgb(150,68,52)]">{t.settings.quitApplication}</p>
                  <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                    {t.settings.quitApplicationBody}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <motion.button
                    type="button"
                    data-no-window-drag="true"
                    className="inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[rgba(201,93,68,0.32)] bg-[rgba(201,93,68,0.12)] px-3.5 py-2.5 text-[12px] font-semibold text-[rgb(150,68,52)]"
                    whileHover={{ y: -1.5, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => void handleQuitApplication()}
                  >
                    {isQuittingApplication ? `${t.settings.quitApplicationButton}...` : t.settings.quitApplicationButton}
                  </motion.button>
                </div>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>

      <AnimatePresence>
        {hotkeyDialogOpen ? (
          <motion.div
            data-no-window-drag="true"
            className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-8 backdrop-blur-[10px]"
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
              onPointerDownCapture={startWindowDrag}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[22px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{t.settings.currentShortcut}</p>
                  <p className="mt-2 text-[14px] font-semibold text-[var(--brown-strong)]">{getShortcutDisplayLabel(hotkey)}</p>
                </div>

                <div className="rounded-[20px] border border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] p-4">
                  <p className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#2853C7]">
                    <KeyboardIcon size={15} />
                    {t.settings.dialogRecorded}
                  </p>
                  <p className="font-display text-[24px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
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
