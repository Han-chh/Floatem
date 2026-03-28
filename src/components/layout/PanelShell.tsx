import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { SlidersHorizontalIcon, SparklesIcon } from "../icons/AppIcons";
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
  const compactMetaLabel = `${platformLabel} · Visual mode`;

  return (
    <main className="h-screen overflow-hidden bg-[linear-gradient(180deg,var(--base-bg)_0%,var(--base-bg-deep)_100%)] text-[13.5px] text-[var(--dark-text)]">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="window-shell cq-panel flex h-full min-h-0 flex-col p-[12px]"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-[rgba(255,122,89,0.16)] blur-3xl" />
          <div className="absolute right-[-5rem] top-20 h-64 w-64 rounded-full bg-[rgba(47,107,255,0.12)] blur-3xl" />
          <div className="absolute bottom-[-4rem] left-1/3 h-72 w-72 rounded-full bg-[rgba(31,168,122,0.10)] blur-3xl" />
        </div>

        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="paper-panel mb-3 rounded-[32px] px-4 py-4"
        >
          <div className="panel-header-grid">
            <div data-tauri-drag-region className="panel-header-top min-w-0">
              <div className="min-w-0">
                <div className="panel-meta-full mb-2 items-center">
                  <span className="status-chip" data-tone="coral">
                    QuickNote
                  </span>
                  <span className="status-chip" data-tone="neutral">
                    <SparklesIcon size={12} />
                    Notes home
                  </span>
                  <span className="status-chip" data-tone="blue">
                    {platformLabel}
                  </span>
                </div>
                <span className="panel-meta-compact status-chip mb-2" data-tone="neutral">
                  {compactMetaLabel}
                </span>
                <p className="font-display text-[clamp(var(--font-display-compact),5.8vw,var(--font-display-expanded))] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                  QuickNote
                </p>
                <p className="panel-summary mt-1 text-[12px] text-[var(--muted)]">
                  Fast notes with visual clarity, richer color, and controls that stay legible while the panel resizes.
                </p>
              </div>

              <motion.button
                type="button"
                aria-label="Settings"
                className="paper-icon-button self-start"
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
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="paper-panel relative min-h-0 flex-1 rounded-[32px] p-3"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
            <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
            <div className="absolute -right-8 top-14 h-32 w-32 rounded-full bg-[rgba(255,122,89,0.14)] blur-2xl" />
            <div className="absolute bottom-10 left-8 h-24 w-24 rounded-full bg-[rgba(47,107,255,0.1)] blur-2xl" />
          </div>

          <AnimatePresence>
            {showSettings ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="paper-card absolute inset-3 z-10 rounded-[28px]"
              >
                {settingsPanel}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div
            data-testid="panel-scroll-region"
            className="paper-scroll relative h-full overflow-y-auto rounded-[26px] bg-[linear-gradient(180deg,rgba(255,251,246,0.5),rgba(255,251,246,0.16))] p-1.5"
          >
            {children}
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
