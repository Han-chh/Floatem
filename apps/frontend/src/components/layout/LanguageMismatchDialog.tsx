import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import {
  getSystemLanguage,
  isNativeFloatemHost,
  subscribeToPanelWillOpen,
} from "../../lib/nativeBridge";
import type { AppLanguage } from "../../lib/models";
import { useSettingsStore } from "../../store/settingsStore";
import { ChineseLanguageIcon, EnglishLanguageIcon } from "../icons/AppIcons";

type LanguageMismatchDialogProps = {
  onOpenChange?: (isOpen: boolean) => void;
};

export function LanguageMismatchDialog({ onOpenChange }: LanguageMismatchDialogProps = {}) {
  const { t } = useI18n();
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const language = useSettingsStore((state) => state.language);
  const suppressLanguageMismatchPrompt = useSettingsStore(
    (state) => state.suppressLanguageMismatchPrompt,
  );
  const [systemLanguage, setSystemLanguage] = useState<AppLanguage | null>(null);
  const [suppress, setSuppress] = useState(false);
  const [dismissedForCurrentSummon, setDismissedForCurrentSummon] = useState(false);
  const requestIDRef = useRef(0);

  const checkForMismatch = useCallback(async () => {
    const settings = useSettingsStore.getState();
    if (!settings.isLoaded || settings.suppressLanguageMismatchPrompt || !isNativeFloatemHost()) {
      return;
    }

    const requestID = requestIDRef.current + 1;
    requestIDRef.current = requestID;
    setDismissedForCurrentSummon(false);
    setSystemLanguage(null);

    try {
      const detectedLanguage = await getSystemLanguage();
      if (requestIDRef.current === requestID) {
        setSystemLanguage(detectedLanguage);
      }
    } catch (error) {
      console.error("Floatem failed to detect the system language.", error);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void checkForMismatch();
  }, [checkForMismatch, isLoaded]);

  useEffect(() => {
    return subscribeToPanelWillOpen(() => {
      void checkForMismatch();
    });
  }, [checkForMismatch]);

  const isOpen =
    isNativeFloatemHost() &&
    isLoaded &&
    !suppressLanguageMismatchPrompt &&
    !dismissedForCurrentSummon &&
    systemLanguage !== null &&
    systemLanguage !== language;
  const targetLanguage = systemLanguage;
  const isSwitchingToEnglish = targetLanguage === "en";
  const title = isSwitchingToEnglish
    ? t.languageMismatchPrompt.englishSystemTitle
    : t.languageMismatchPrompt.chineseSystemTitle;
  const body = isSwitchingToEnglish
    ? t.languageMismatchPrompt.englishSystemBody
    : t.languageMismatchPrompt.chineseSystemBody;
  const action = isSwitchingToEnglish
    ? t.languageMismatchPrompt.switchToEnglish
    : t.languageMismatchPrompt.switchToChinese;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const finish = (shouldSwitch: boolean) => {
    const settings = useSettingsStore.getState();
    settings.setSuppressLanguageMismatchPrompt(suppress);
    if (shouldSwitch && targetLanguage) {
      settings.setLanguage(targetLanguage);
    }
    setDismissedForCurrentSummon(true);
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
  }, [isOpen, suppress, targetLanguage]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-no-window-drag="true"
          className="floatem-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-4 py-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-mismatch-title"
            aria-describedby="language-mismatch-body"
            className="paper-panel relative w-full max-w-[400px] overflow-hidden rounded-[26px] p-4 shadow-[0_28px_56px_rgba(30,25,21,0.22)]"
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
                {isSwitchingToEnglish ? <EnglishLanguageIcon size={18} /> : <ChineseLanguageIcon size={18} />}
              </span>
              <div className="min-w-0">
                <h2 id="language-mismatch-title" className="font-display text-[21px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                  {title}
                </h2>
                <p id="language-mismatch-body" className="mt-1.5 text-[12px] leading-5 text-[var(--muted)]">
                  {body}
                </p>
              </div>
            </div>

            <label className="relative mt-4 flex cursor-pointer items-center gap-2.5 text-[12px] text-[var(--dark-text)]">
              <input
                type="checkbox"
                checked={suppress}
                onChange={(event) => setSuppress(event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-[rgba(156,126,94,0.42)]"
                style={{ accentColor: "var(--brown-strong)" }}
              />
              <span>{t.languageMismatchPrompt.suppress}</span>
            </label>

            <div className="relative mt-4 flex items-center justify-end gap-2 border-t border-[rgba(213,198,180,0.72)] pt-3">
              <motion.button
                type="button"
                className="paper-button inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => finish(false)}
              >
                {t.languageMismatchPrompt.keepCurrent}
              </motion.button>
              <motion.button
                type="button"
                className="paper-button paper-button-primary inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[12px] font-semibold"
                whileHover={{ y: -1.5, scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => finish(true)}
              >
                {action}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
