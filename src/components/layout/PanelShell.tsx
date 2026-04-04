import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { hidePanelWindow } from "../../hooks/usePlatform";
import { startWindowDrag } from "../../hooks/useWindowDrag";
import { SlidersHorizontalIcon } from "../icons/AppIcons";
import type { TabId } from "../../lib/models";
import { TabBar } from "./TabBar";
import { WindowCloseButton } from "./WindowCloseButton";

type PanelShellProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
  settingsPanel: ReactNode;
  showSettings: boolean;
  onToggleSettings: () => void;
};

export function PanelShell({ activeTab, onTabChange, children, settingsPanel, showSettings, onToggleSettings }: PanelShellProps) {
  const handleHideWindow = () => {
    void hidePanelWindow();
  };
  const slideDirection = showSettings ? 1 : -1;

  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
    }),
    animate: {
      x: "0%",
    },
    exit: (direction: number) => ({
      x: direction > 0 ? "-100%" : "100%",
    }),
  };

  return (
    <main className="h-screen overflow-hidden bg-transparent text-[13.5px] text-[var(--dark-text)]">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="window-shell h-full"
      >
        <div className="window-shell-content cq-panel" onPointerDownCapture={startWindowDrag}>
          <div className="pointer-events-none absolute inset-[18px] overflow-hidden rounded-[24px]">
            <div className="absolute -left-14 top-10 h-56 w-56 rounded-full bg-[rgba(255,122,89,0.18)] blur-3xl" />
            <div className="absolute left-10 top-1/2 h-36 w-36 rounded-full bg-[rgba(244,185,66,0.12)] blur-3xl" />
            <div className="absolute right-[-4.5rem] top-24 h-56 w-56 rounded-full bg-[rgba(47,107,255,0.14)] blur-3xl" />
            <div className="absolute right-12 top-1/2 h-40 w-40 rounded-full bg-[rgba(123,92,250,0.12)] blur-3xl" />
            <div className="absolute bottom-[-3.5rem] left-1/3 h-64 w-64 rounded-full bg-[rgba(31,168,122,0.11)] blur-3xl" />
          </div>

          <div className="relative h-full min-h-0 overflow-hidden">
            <AnimatePresence initial={false} mode="sync" custom={slideDirection}>
              {showSettings ? (
                <motion.div
                  key="settings-page"
                  custom={slideDirection}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex min-h-0 flex-col will-change-transform"
                >
                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                    className="paper-panel relative h-full min-h-0 flex-1 overflow-hidden rounded-[32px] p-3"
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
                      <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
                      <div className="absolute -left-8 top-16 h-36 w-36 rounded-full bg-[rgba(47,107,255,0.12)] blur-2xl" />
                      <div className="absolute bottom-10 right-6 h-28 w-28 rounded-full bg-[rgba(255,122,89,0.12)] blur-2xl" />
                    </div>

                    <div className="relative h-full overflow-hidden rounded-[26px] bg-[linear-gradient(180deg,rgba(255,251,246,0.66),rgba(255,251,246,0.28))]">
                      {settingsPanel}
                    </div>
                  </motion.section>
                </motion.div>
              ) : (
                <motion.div
                  key="main-page"
                  custom={slideDirection}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex min-h-0 flex-col will-change-transform"
                >
                  <div className="mb-2 flex min-h-[28px] items-center px-2">
                    <WindowCloseButton onClick={handleHideWindow} />
                  </div>

                  <motion.header
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.03, ease: [0.22, 1, 0.36, 1] }}
                    className="paper-panel mb-3 rounded-[30px] px-4 py-3"
                  >
                    <div className="space-y-3">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <p className="font-display text-[clamp(22px,6vw,28px)] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                          QuickNote
                        </p>
                        <motion.button
                          type="button"
                          aria-label="Settings"
                          className="paper-icon-button shrink-0"
                          whileHover={{ y: -2, scale: 1.02 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={onToggleSettings}
                        >
                          <SlidersHorizontalIcon size={18} />
                        </motion.button>
                      </div>

                      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
                    </div>
                  </motion.header>

                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className="paper-panel relative min-h-0 flex-1 rounded-[32px] p-3"
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
                      <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
                      <div className="absolute -right-8 top-14 h-32 w-32 rounded-full bg-[rgba(255,122,89,0.14)] blur-2xl" />
                      <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-[rgba(47,107,255,0.1)] blur-2xl" />
                    </div>

                    <div
                      data-testid="panel-scroll-region"
                      className="paper-scroll relative h-full overflow-y-auto rounded-[26px] bg-[linear-gradient(180deg,rgba(255,251,246,0.5),rgba(255,251,246,0.16))] p-1.5"
                    >
                      {children}
                    </div>
                  </motion.section>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
