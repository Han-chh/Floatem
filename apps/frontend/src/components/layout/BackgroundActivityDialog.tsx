import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getBackgroundActivityStatus,
  openBackgroundActivitySettings,
  saveSettings,
} from "../../hooks/usePlatform";
import { useI18n } from "../../lib/i18n";
import { isNativeFloatemHost, subscribeToPanelWillOpen, type BackgroundActivityStatus } from "../../lib/nativeBridge";
import { getPersistedSettingsSnapshot, useSettingsStore } from "../../store/settingsStore";
import { KeyboardIcon } from "../icons/AppIcons";

type BackgroundActivityDialogProps = {
  onOpenChange?: (isOpen: boolean) => void;
};

export function BackgroundActivityDialog({ onOpenChange }: BackgroundActivityDialogProps = {}) {
  const { t } = useI18n();
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const suppressBackgroundActivityPrompt = useSettingsStore((state) => state.suppressBackgroundActivityPrompt);
  const [status, setStatus] = useState<BackgroundActivityStatus | null>(null);
  const [dismissedForCurrentDisabledState, setDismissedForCurrentDisabledState] = useState(false);
  const [shouldSuppressPrompt, setShouldSuppressPrompt] = useState(false);
  const previousStatusRef = useRef<BackgroundActivityStatus | null>(null);
  const requestIDRef = useRef(0);

  const checkBackgroundActivity = useCallback(async () => {
    const settings = useSettingsStore.getState();
    if (!settings.isLoaded || !isNativeFloatemHost()) {
      return;
    }

    const requestID = requestIDRef.current + 1;
    requestIDRef.current = requestID;

    try {
      const nextStatus = await getBackgroundActivityStatus();
      if (requestIDRef.current !== requestID) {
        return;
      }

      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = nextStatus;
      setStatus(nextStatus);
      settings.setBackgroundActivityStatus(nextStatus);

      const didObserveNewActivation = nextStatus.activationEpoch > settings.backgroundActivityActivationEpoch;
      if (didObserveNewActivation) {
        settings.setBackgroundActivityActivationEpoch(nextStatus.activationEpoch);
      }

      if (nextStatus.enabled || didObserveNewActivation) {
        setDismissedForCurrentDisabledState(false);
        if (settings.suppressBackgroundActivityPrompt) {
          settings.setSuppressBackgroundActivityPrompt(false);
        }
      } else if (previousStatus?.enabled) {
        // “Don't show again” applies only to this disabled interval. Once the
        // item was enabled, a later disablement needs to be surfaced again.
        setDismissedForCurrentDisabledState(false);
      }

      if (didObserveNewActivation || (nextStatus.enabled && settings.suppressBackgroundActivityPrompt)) {
        void saveSettings(getPersistedSettingsSnapshot()).catch((error) => {
          console.error("Floatem failed to reset the background activity prompt preference.", error);
        });
      }
    } catch (error) {
      console.error("Floatem failed to read the background activity status.", error);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void checkBackgroundActivity();
  }, [checkBackgroundActivity, isLoaded]);

  useEffect(() => {
    return subscribeToPanelWillOpen(() => {
      // "Not now" applies only to the current presentation. A later global
      // shortcut invocation must ask again while background activity is off.
      setDismissedForCurrentDisabledState(false);
      void checkBackgroundActivity();
    });
  }, [checkBackgroundActivity]);

  useEffect(() => {
    const refreshAfterSystemSettings = () => {
      void checkBackgroundActivity();
    };

    window.addEventListener("focus", refreshAfterSystemSettings);
    document.addEventListener("visibilitychange", refreshAfterSystemSettings);
    return () => {
      window.removeEventListener("focus", refreshAfterSystemSettings);
      document.removeEventListener("visibilitychange", refreshAfterSystemSettings);
    };
  }, [checkBackgroundActivity]);

  const isOpen =
    isNativeFloatemHost() &&
    isLoaded &&
    status !== null &&
    !status.enabled &&
    !suppressBackgroundActivityPrompt &&
    !dismissedForCurrentDisabledState;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const dismissForCurrentState = () => {
    setDismissedForCurrentDisabledState(true);
  };

  const suppressForCurrentState = () => {
    const settings = useSettingsStore.getState();
    settings.setSuppressBackgroundActivityPrompt(true);
    void saveSettings(getPersistedSettingsSnapshot()).catch((error) => {
      console.error("Floatem failed to save the background activity prompt preference.", error);
    });
    dismissForCurrentState();
  };

  const dismissWithPreference = () => {
    if (shouldSuppressPrompt) {
      suppressForCurrentState();
      return;
    }

    dismissForCurrentState();
  };

  const openSettings = () => {
    dismissWithPreference();
    void openBackgroundActivitySettings().catch((error) => {
      console.error("Floatem failed to open background activity settings.", error);
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissForCurrentState();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-no-window-drag="true"
          className="floatem-modal-backdrop fixed inset-0 z-[130] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-4 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="background-activity-title"
            aria-describedby="background-activity-body"
            className="paper-panel relative w-full max-w-[416px] overflow-hidden rounded-[26px] p-4 shadow-[0_28px_56px_rgba(30,25,21,0.22)]"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
              <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
              <div className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-[rgba(255,122,89,0.12)] blur-3xl" />
            </div>

            <div className="relative flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(255,122,89,0.12)] text-[var(--brown-strong)]">
                <KeyboardIcon size={17} />
              </span>
              <div className="min-w-0">
                <h2 id="background-activity-title" className="font-display text-[21px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                  {t.backgroundActivityPrompt.title}
                </h2>
                <p id="background-activity-body" className="mt-1.5 text-[12px] leading-5 text-[var(--muted)]">
                  {t.backgroundActivityPrompt.body}
                </p>
              </div>
            </div>

            <p className="relative mt-3 rounded-[16px] border border-[rgba(213,198,180,0.72)] bg-[rgba(255,252,248,0.74)] px-3 py-2.5 text-[11px] leading-5 text-[var(--muted)]">
              {t.backgroundActivityPrompt.detail}
            </p>

            <label className="relative mt-4 flex cursor-pointer items-center gap-2.5 text-[12px] text-[var(--dark-text)]">
              <input
                type="checkbox"
                checked={shouldSuppressPrompt}
                onChange={(event) => setShouldSuppressPrompt(event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-[rgba(156,126,94,0.42)]"
                style={{ accentColor: "var(--brown-strong)" }}
              />
              <span>{t.backgroundActivityPrompt.dontShowAgain}</span>
            </label>

            <div className="relative mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-[rgba(213,198,180,0.72)] pt-3">
              <motion.button
                type="button"
                className="paper-button inline-flex min-h-10 items-center justify-center rounded-full px-3.5 text-[12px] font-semibold"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={dismissWithPreference}
              >
                {t.backgroundActivityPrompt.notNow}
              </motion.button>
              <motion.button
                type="button"
                className="paper-button paper-button-primary inline-flex min-h-10 items-center justify-center rounded-full px-3.5 text-[12px] font-semibold"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={openSettings}
              >
                {t.backgroundActivityPrompt.openSettings}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
