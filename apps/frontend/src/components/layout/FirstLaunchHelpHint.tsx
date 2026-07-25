import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { CircleHelpIcon } from "../icons/AppIcons";

type FirstLaunchHelpHintProps = {
  isOpen: boolean;
  onDismiss: () => void;
  onOpenHelp: () => void;
};

export function FirstLaunchHelpHint({
  isOpen,
  onDismiss,
  onOpenHelp,
}: FirstLaunchHelpHintProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onDismiss]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          data-no-window-drag="true"
          className="pointer-events-none fixed inset-0 z-[105]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-labelledby="first-launch-help-hint-title"
            aria-describedby="first-launch-help-hint-body"
            className="paper-panel pointer-events-auto absolute right-3 top-[94px] w-[min(264px,calc(100vw-24px))] rounded-[22px] border border-[rgba(156,126,94,0.24)] p-3.5 shadow-[0_22px_44px_rgba(30,25,21,0.18)]"
            initial={{ opacity: 0, scale: 0.94, x: 8, y: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, x: 4, y: -4 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              aria-hidden="true"
              className="absolute -top-1.5 right-[70px] h-3 w-3 rotate-45 border-l border-t border-[rgba(156,126,94,0.24)] bg-[var(--cream-strong)]"
            />
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-[rgba(244,185,66,0.16)] text-[#7A5E39]">
                <CircleHelpIcon size={16} />
              </span>
              <div className="min-w-0">
                <h2
                  id="first-launch-help-hint-title"
                  className="font-display text-[15px] font-semibold tracking-[-0.025em] text-[var(--brown-strong)]"
                >
                  {t.firstLaunchHelpHint.title}
                </h2>
                <p
                  id="first-launch-help-hint-body"
                  className="mt-1 text-[11px] leading-[1.65] text-[var(--muted)]"
                >
                  {t.firstLaunchHelpHint.body}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-[11px] px-3 py-2 text-[11px] font-semibold text-[var(--muted)] transition-colors hover:bg-black/5"
                onClick={onDismiss}
              >
                {t.firstLaunchHelpHint.later}
              </button>
              <button
                type="button"
                className="rounded-[11px] bg-[var(--brown-strong)] px-3 py-2 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(61,49,34,0.16)]"
                onClick={onOpenHelp}
              >
                {t.firstLaunchHelpHint.openHelp}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
