import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePlatform } from "../../hooks/usePlatform";
import type { TabId } from "../../lib/models";
import { TabBar } from "./TabBar";

type PanelShellProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
  settingsPanel: ReactNode;
  showSettings: boolean;
  onToggleSettings: () => void;
};

export function PanelShell({
  activeTab,
  onTabChange,
  children,
  settingsPanel,
  showSettings,
  onToggleSettings,
}: PanelShellProps) {
  const { platformLabel } = usePlatform();

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(180deg,#f6edde_0%,#ead8c0_100%)] text-[13.5px] text-[var(--dark-text)]">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="window-shell flex h-full flex-col p-[12px]"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-[rgba(214,180,138,0.28)] blur-3xl" />
          <div className="absolute right-[-5rem] top-20 h-64 w-64 rounded-full bg-[rgba(190,111,71,0.14)] blur-3xl" />
          <div className="absolute bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-[rgba(111,155,118,0.12)] blur-3xl" />
        </div>

        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="paper-panel mb-3 rounded-[30px] px-5 py-4"
        >
          <div className="mb-4 flex flex-col gap-4">
            <div data-tauri-drag-region className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[rgba(165,135,105,0.35)] bg-[rgba(255,255,255,0.48)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brown-strong)]">
                  Washi Warm
                </span>
                <span className="rounded-full border border-[rgba(165,135,105,0.3)] bg-[rgba(122,89,64,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {platformLabel}
                </span>
              </div>
              <p className="font-display text-[22px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">QuickNote</p>
              <p className="mt-1 max-w-[18rem] text-[12px] text-[var(--muted)]">
                Fast capture for notes and todos, with layered paper surfaces and animated macOS-style feedback.
              </p>
            </div>

            <motion.button
              type="button"
              className="paper-button self-start rounded-[16px] px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--brown-strong)] uppercase"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              onClick={onToggleSettings}
            >
              Settings
            </motion.button>
          </div>
          <TabBar activeTab={activeTab} onTabChange={onTabChange} />
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="paper-panel relative min-h-0 flex-1 rounded-[30px] p-3"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
            <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
            <div className="absolute -right-8 top-14 h-32 w-32 rounded-full bg-[rgba(214,180,138,0.22)] blur-2xl" />
            <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-[rgba(255,255,255,0.32)] blur-2xl" />
          </div>

          <AnimatePresence>
            {showSettings ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="paper-card absolute inset-3 z-10 rounded-[26px]"
              >
                {settingsPanel}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="paper-scroll relative h-full overflow-y-auto rounded-[24px] bg-[linear-gradient(180deg,rgba(255,251,246,0.35),rgba(255,251,246,0.08))] p-1">
            {children}
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
