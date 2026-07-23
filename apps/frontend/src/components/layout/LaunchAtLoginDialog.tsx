import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { isNativeStickItHost } from "../../lib/nativeBridge";
import { useSettingsStore } from "../../store/settingsStore";
import { KeyboardIcon, PushPinIcon, SparklesIcon } from "../icons/AppIcons";

export function LaunchAtLoginDialog() {
  const { t } = useI18n();
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const launchAtLogin = useSettingsStore((state) => state.launchAtLogin);
  const suppressLaunchAtLoginPrompt = useSettingsStore((state) => state.suppressLaunchAtLoginPrompt);
  const [suppress, setSuppress] = useState(false);
  const [dismissedThisRun, setDismissedThisRun] = useState(false);
  const isOpen =
    isNativeStickItHost() &&
    isLoaded &&
    !launchAtLogin &&
    !suppressLaunchAtLoginPrompt &&
    !dismissedThisRun;

  const finish = (enable: boolean) => {
    const settings = useSettingsStore.getState();
    settings.setSuppressLaunchAtLoginPrompt(suppress);
    if (enable) {
      settings.setLaunchAtLogin(true);
    }
    setDismissedThisRun(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, suppress]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-no-window-drag="true"
          className="stickit-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-4 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="launch-at-login-title"
            aria-describedby="launch-at-login-body"
            className="paper-panel relative w-full max-w-[500px] overflow-hidden rounded-[28px] p-3 shadow-[0_30px_64px_rgba(30,25,21,0.24)]"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
              <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
              <div className="absolute -left-12 top-4 h-40 w-40 rounded-full bg-[rgba(255,122,89,0.14)] blur-3xl" />
              <div className="absolute -right-10 bottom-8 h-44 w-44 rounded-full bg-[rgba(47,107,255,0.11)] blur-3xl" />
            </div>

            <div className="relative rounded-[24px] border border-[rgba(213,198,180,0.78)] bg-[linear-gradient(145deg,rgba(255,252,248,0.98),rgba(244,249,252,0.94)_55%,rgba(255,244,232,0.97))] px-4 py-4 shadow-[0_18px_36px_rgba(61,49,34,0.08)]">
              <span className="status-chip" data-tone="coral">
                <SparklesIcon size={11} />
                {t.launchAtLoginPrompt.badge}
              </span>
              <h2 id="launch-at-login-title" className="mt-3 font-display text-[24px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                {t.launchAtLoginPrompt.title}
              </h2>
              <p id="launch-at-login-body" className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                {t.launchAtLoginPrompt.body}
              </p>
            </div>

            <div className="relative mt-3 grid gap-2.5">
              <PromptReason icon={<KeyboardIcon size={17} />} title={t.launchAtLoginPrompt.shortcutTitle} body={t.launchAtLoginPrompt.shortcutBody} />
              <PromptReason icon={<PushPinIcon size={17} />} title={t.launchAtLoginPrompt.desktopCardsTitle} body={t.launchAtLoginPrompt.desktopCardsBody} />
            </div>

            <label className="relative mt-3 flex cursor-pointer items-center gap-3 rounded-[16px] border border-[rgba(213,198,180,0.82)] bg-[rgba(255,255,255,0.76)] px-3 py-2.5">
              <input
                type="checkbox"
                checked={suppress}
                onChange={(event) => setSuppress(event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-[rgba(156,126,94,0.42)]"
                style={{ accentColor: "var(--brown-strong)" }}
              />
              <span className="text-[12px] font-semibold text-[var(--dark-text)]">{t.launchAtLoginPrompt.suppress}</span>
            </label>

            <div className="relative mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[rgba(213,198,180,0.72)] pt-3">
              <motion.button
                type="button"
                className="paper-button inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => finish(false)}
              >
                {t.launchAtLoginPrompt.notNow}
              </motion.button>
              <motion.button
                type="button"
                className="paper-button paper-button-primary inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => finish(true)}
              >
                {t.launchAtLoginPrompt.enable}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function PromptReason({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] border border-[rgba(213,198,180,0.78)] bg-[rgba(255,255,255,0.82)] px-3.5 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[linear-gradient(180deg,rgba(47,107,255,0.12),rgba(255,122,89,0.09))] text-[var(--brown-strong)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-[var(--dark-text)]">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{body}</p>
      </div>
    </div>
  );
}
