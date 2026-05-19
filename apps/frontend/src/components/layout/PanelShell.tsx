import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { ChevronDownIcon, ChevronUpIcon, CircleHelpIcon, SlidersHorizontalIcon, XIcon } from "../icons/AppIcons";
import type { AnimationSpeed, TabId, TransitionStyle } from "../../lib/models";
import { getSurfaceMotionConfig } from "../../lib/transitionMotion";
import { TabBar } from "./TabBar";

type PanelShellProps = {
  activeTab: TabId;
  animationSpeed: AnimationSpeed;
  banner?: ReactNode;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
  settingsPanel: ReactNode;
  showSettings: boolean;
  onToggleSettings: () => void;
  transitionStyle: TransitionStyle;
};

export function PanelShell({
  activeTab,
  animationSpeed,
  banner,
  onTabChange,
  children,
  settingsPanel,
  showSettings,
  onToggleSettings,
  transitionStyle,
}: PanelShellProps) {
  const { t } = useI18n();
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const pageDirection = showSettings ? 1 : -1;
  const surfaceMotion = getSurfaceMotionConfig(transitionStyle, animationSpeed);
  const panelChromeDuration =
    transitionStyle === "slide"
      ? Math.max(0.08, Math.min(0.14, surfaceMotion.transition.duration * 0.62))
      : 0.22;
  const getPanelChromeDelay = (delay: number) => (transitionStyle === "slide" ? 0 : delay);

  return (
    <main className="quicknote-content-surface h-screen overflow-hidden text-[13.5px] text-[var(--dark-text)]">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        <div className="quicknote-content cq-panel">
          <div className="pointer-events-none absolute inset-[18px] overflow-hidden rounded-[24px]">
            <div className="absolute -left-14 top-10 h-56 w-56 rounded-full bg-[rgba(255,122,89,0.18)] blur-3xl" />
            <div className="absolute left-10 top-1/2 h-36 w-36 rounded-full bg-[rgba(244,185,66,0.12)] blur-3xl" />
            <div className="absolute right-[-4.5rem] top-24 h-56 w-56 rounded-full bg-[rgba(47,107,255,0.14)] blur-3xl" />
            <div className="absolute right-12 top-1/2 h-40 w-40 rounded-full bg-[rgba(123,92,250,0.12)] blur-3xl" />
            <div className="absolute bottom-[-3.5rem] left-1/3 h-64 w-64 rounded-full bg-[rgba(31,168,122,0.11)] blur-3xl" />
          </div>

          <div className="quicknote-page-viewport relative h-full min-h-0 overflow-hidden" style={surfaceMotion.sceneStyle}>
            <AnimatePresence initial={false} mode={surfaceMotion.presenceMode} custom={pageDirection}>
              {showSettings ? (
                <motion.div
                  key="settings-page"
                  custom={pageDirection}
                  variants={surfaceMotion.variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={surfaceMotion.transition}
                  style={surfaceMotion.contentStyle}
                  className="absolute inset-0 flex min-h-0 flex-col will-change-transform"
                >
                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: panelChromeDuration,
                      delay: getPanelChromeDelay(0.04),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="paper-panel quicknote-fill-panel relative h-full min-h-0 flex-1 overflow-hidden rounded-[32px] p-3"
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
                      <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
                      <div className="absolute -left-8 top-16 h-36 w-36 rounded-full bg-[rgba(47,107,255,0.12)] blur-2xl" />
                      <div className="absolute bottom-10 right-6 h-28 w-28 rounded-full bg-[rgba(255,122,89,0.12)] blur-2xl" />
                    </div>

                    <div className="relative h-full overflow-visible rounded-[26px] bg-[linear-gradient(180deg,rgba(255,251,246,0.66),rgba(255,251,246,0.28))]">
                      {settingsPanel}
                    </div>
                  </motion.section>
                </motion.div>
              ) : (
                <motion.div
                  key="main-page"
                  custom={pageDirection}
                  variants={surfaceMotion.variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={surfaceMotion.transition}
                  style={surfaceMotion.contentStyle}
                  className="absolute inset-0 flex min-h-0 flex-col will-change-transform"
                >
                  <motion.header
                    layout
                    initial={{ opacity: 0, y: -12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      marginBottom: isHeaderCollapsed ? 4 : 8,
                      marginLeft: isHeaderCollapsed ? 8 : 4,
                      marginRight: isHeaderCollapsed ? 8 : 4,
                      marginTop: isHeaderCollapsed ? 8 : 4,
                      paddingBottom: isHeaderCollapsed ? 3 : 8,
                      paddingTop: isHeaderCollapsed ? 3 : 8,
                    }}
                    transition={{
                      duration: panelChromeDuration,
                      delay: getPanelChromeDelay(0.03),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="paper-panel overflow-hidden rounded-[24px] px-3"
                  >
                    <div className="space-y-1.5">
                      <AnimatePresence initial={false}>
                        {!isHeaderCollapsed ? (
                          <motion.div
                            key="expanded-panel-header"
                            initial={{ height: 0, opacity: 0, y: -8 }}
                            animate={{ height: "auto", opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1.5">
                              <div className="flex min-w-0 items-center justify-between gap-2.5">
                                <p className="font-display text-[clamp(16px,4.5vw,19px)] font-semibold tracking-normal text-[var(--brown-strong)]">
                                  QuickNote
                                </p>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <motion.button
                                    type="button"
                                    aria-label={t.app.help}
                                    data-tooltip={t.app.help}
                                    data-tooltip-placement="bottom"
                                    className="paper-icon-button mt-1.5 h-[30px] w-[30px] min-h-0 min-w-0 shrink-0 rounded-[11px] text-[#7A5E39]"
                                    whileHover={{ y: -1.5, scale: 1.02 }}
                                    whileTap={{ scale: 0.985 }}
                                    onClick={() => setIsHelpOpen(true)}
                                  >
                                    <CircleHelpIcon size={15} />
                                  </motion.button>
                                  <motion.button
                                    type="button"
                                    aria-label={t.app.settings}
                                    data-tooltip={t.app.settings}
                                    data-tooltip-placement="bottom"
                                    className="paper-icon-button mt-1.5 h-[30px] w-[30px] min-h-0 min-w-0 shrink-0 rounded-[11px]"
                                    whileHover={{ y: -1.5, scale: 1.02 }}
                                    whileTap={{ scale: 0.985 }}
                                    onClick={onToggleSettings}
                                  >
                                    <SlidersHorizontalIcon size={14} />
                                  </motion.button>
                                </div>
                              </div>

                              <TabBar activeTab={activeTab} onTabChange={onTabChange} />
                              {banner ? <div>{banner}</div> : null}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <div className="flex">
                        <motion.button
                          type="button"
                          aria-expanded={!isHeaderCollapsed}
                          aria-label={isHeaderCollapsed ? t.app.expandNavigation : t.app.collapseNavigation}
                          data-tooltip={isHeaderCollapsed ? t.app.expandNavigation : t.app.collapseNavigation}
                          data-tooltip-placement="bottom"
                          className="paper-icon-button !h-[20px] w-full !min-h-[20px] !min-w-0 rounded-[9px] border text-[var(--muted)]"
                          whileHover={{ y: -1.5 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setIsHeaderCollapsed((current) => !current)}
                        >
                          {isHeaderCollapsed ? <ChevronDownIcon size={14} /> : <ChevronUpIcon size={14} />}
                        </motion.button>
                      </div>
                    </div>
                  </motion.header>

                  <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: panelChromeDuration,
                      delay: getPanelChromeDelay(0.06),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="paper-panel quicknote-fill-panel relative min-h-0 flex-1 overflow-hidden rounded-[32px] p-3"
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

      <AnimatePresence>
        {isHelpOpen ? (
          <motion.div
            data-no-window-drag="true"
            className="quicknote-modal-backdrop fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-5 py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsHelpOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.app.helpDialogTitle}
              className="paper-panel flex w-full max-w-[430px] flex-col rounded-[24px] p-5 shadow-[0_26px_48px_rgba(30,25,21,0.24)]"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="status-chip" data-tone="neutral">
                    <CircleHelpIcon size={11} />
                    {t.app.help}
                  </span>
                  <p className="mt-2 font-display text-[22px] font-semibold tracking-normal text-[var(--brown-strong)]">
                    {t.app.helpDialogTitle}
                  </p>
                  <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                    {t.app.helpDialogSubtitle}
                  </p>
                </div>
                <motion.button
                  type="button"
                  aria-label={t.common.close}
                  data-tooltip={t.common.close}
                  data-no-window-drag="true"
                  className="paper-icon-button inline-flex h-9 w-9 min-h-0 min-w-0 rounded-[12px]"
                  whileHover={{ y: -1.5, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsHelpOpen(false)}
                >
                  <XIcon size={14} />
                </motion.button>
              </div>

              <div className="space-y-3">
                <section className="rounded-[18px] border border-[rgba(213,198,180,0.82)] bg-[rgba(255,255,255,0.42)] p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {t.app.helpBasicsTitle}
                  </p>
                  <ul className="space-y-1.5">
                    {t.app.helpBasics.map((tip) => (
                      <li key={tip} className="wrap-anywhere text-[12px] font-medium leading-5 text-[var(--dark-text)]">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-[18px] border border-[rgba(213,198,180,0.82)] bg-[rgba(255,255,255,0.42)] p-3">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                    {t.app.helpShortcutsTitle}
                  </p>
                  <ul className="space-y-1.5">
                    {t.app.helpShortcuts.map((shortcut) => (
                      <li key={shortcut} className="wrap-anywhere text-[12px] font-medium leading-5 text-[var(--dark-text)]">
                        {shortcut}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
