import { AnimatePresence, motion } from "framer-motion";
import { floatemBranding } from "@floatem/branding";
import type { ReactNode } from "react";
import { useState } from "react";
import { useI18n } from "../../lib/i18n";
import { useSettingsStore } from "../../store/settingsStore";
import {
  ChevronUpIcon,
  CircleHelpIcon,
  SlidersHorizontalIcon,
} from "../icons/AppIcons";
import type { AnimationSpeed, TabId, TransitionStyle } from "../../lib/models";
import { getSurfaceMotionConfig } from "../../lib/transitionMotion";
import { HelpDialog } from "./HelpDialog";
import { FirstLaunchHelpHint } from "./FirstLaunchHelpHint";
import { InteractiveGuide } from "./InteractiveGuide";
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
  const [isInteractiveGuideOpen, setIsInteractiveGuideOpen] = useState(false);
  const isSettingsLoaded = useSettingsStore((state) => state.isLoaded);
  const hasSeenHelpEntryHint = useSettingsStore((state) => state.hasSeenHelpEntryHint);
  const setHasSeenHelpEntryHint = useSettingsStore((state) => state.setHasSeenHelpEntryHint);
  const pageDirection = showSettings ? 1 : -1;
  const surfaceMotion = getSurfaceMotionConfig(transitionStyle, animationSpeed);
  const panelChromeDuration =
    transitionStyle === "slide"
      ? Math.max(0.08, Math.min(0.14, surfaceMotion.transition.duration * 0.62))
      : 0.22;
  const getPanelChromeDelay = (delay: number) => (transitionStyle === "slide" ? 0 : delay);
  const headerToggleLabel = isHeaderCollapsed ? t.app.expandNavigation : t.app.collapseNavigation;
  const isFirstLaunchHelpHintOpen =
    isSettingsLoaded &&
    !hasSeenHelpEntryHint &&
    !showSettings &&
    !isHeaderCollapsed;
  const dismissFirstLaunchHelpHint = () => {
    setHasSeenHelpEntryHint(true);
  };
  const openHelp = () => {
    setHasSeenHelpEntryHint(true);
    setIsHelpOpen(true);
  };

  return (
    <main className="floatem-content-surface h-screen overflow-hidden text-[13.5px] text-[var(--dark-text)]">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        <div className="floatem-content cq-panel">
          <div className="floatem-page-viewport relative h-full min-h-0 overflow-hidden" style={surfaceMotion.sceneStyle}>
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
                    className="paper-panel floatem-fill-panel relative h-full min-h-0 flex-1 overflow-hidden rounded-[32px] p-3"
                  >
                    <div className="theme-inset-surface relative h-full overflow-visible rounded-[26px]">
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
                                <div className="flex min-w-0 items-baseline gap-2.5">
                                  <p className="shrink-0 font-display text-[clamp(16px,4.5vw,19px)] font-semibold tracking-normal text-[var(--brown-strong)]">
                                    {floatemBranding.displayName}
                                  </p>
                                  <p className="floatem-slogan min-w-0 truncate text-[clamp(9px,2.5vw,11px)] font-medium tracking-[0.015em] text-[#744a38] opacity-80">
                                    {floatemBranding.slogan}
                                  </p>
                                </div>
                                <div
                                  data-testid="header-actions"
                                  className="flex h-[30px] shrink-0 items-center gap-1.5 self-center"
                                >
                                  <span
                                    data-testid="help-action-slot"
                                    className="relative inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center"
                                  >
                                    <AnimatePresence>
                                      {isFirstLaunchHelpHintOpen ? (
                                        <>
                                          <motion.span
                                            data-testid="first-launch-help-highlight"
                                            aria-hidden="true"
                                            className="pointer-events-none absolute -inset-2 rounded-[16px] border border-[rgba(244,185,66,0.74)]"
                                            initial={{ opacity: 0, scale: 0.72 }}
                                            animate={{
                                              opacity: [0.35, 0.9, 0.35],
                                              scale: [0.82, 1.12, 0.82],
                                            }}
                                            exit={{ opacity: 0, scale: 0.85 }}
                                            transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                                          />
                                          <motion.span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute -inset-1 rounded-[14px] bg-[rgba(244,185,66,0.18)] shadow-[0_0_22px_rgba(244,185,66,0.46)]"
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
                                          />
                                        </>
                                      ) : null}
                                    </AnimatePresence>
                                    <motion.button
                                      type="button"
                                      aria-label={t.app.help}
                                      data-guide="help-open"
                                      data-tooltip={t.app.help}
                                      data-tooltip-placement="bottom"
                                      className="paper-icon-button relative z-[1] h-[30px] w-[30px] min-h-0 min-w-0 shrink-0 rounded-[11px] text-[#7A5E39] outline-none focus-visible:outline-none focus-visible:border-[rgba(122,94,57,0.48)]"
                                      whileHover={{ y: -1.5, scale: 1.02 }}
                                      whileTap={{ scale: 0.985 }}
                                      onClick={openHelp}
                                    >
                                      <CircleHelpIcon size={15} />
                                    </motion.button>
                                  </span>
                                  <span
                                    data-testid="settings-action-slot"
                                    className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center"
                                  >
                                    <motion.button
                                      type="button"
                                      aria-label={t.app.settings}
                                      data-guide="settings-open"
                                      data-tooltip={t.app.settings}
                                      data-tooltip-placement="bottom"
                                      className="paper-icon-button h-[30px] w-[30px] min-h-0 min-w-0 shrink-0 rounded-[11px]"
                                      whileHover={{ y: -1.5, scale: 1.02 }}
                                      whileTap={{ scale: 0.985 }}
                                      onClick={onToggleSettings}
                                    >
                                      <SlidersHorizontalIcon size={14} />
                                    </motion.button>
                                  </span>
                                </div>
                              </div>

                              <TabBar activeTab={activeTab} onTabChange={onTabChange} />
                              {banner ? <div>{banner}</div> : null}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <div className="flex items-center justify-center pt-0.5">
                        <span
                          aria-hidden="true"
                          className="h-[3px] flex-1 rounded-full bg-[linear-gradient(90deg,transparent,rgba(255,122,89,0.18),rgba(244,185,66,0.3),rgba(156,126,94,0.12))]"
                        />
                        <motion.button
                          type="button"
                          aria-expanded={!isHeaderCollapsed}
                          aria-label={headerToggleLabel}
                          data-guide="navigation-fold"
                          data-tooltip={headerToggleLabel}
                          data-tooltip-placement="bottom"
                          className="group relative mx-3 inline-flex h-[26px] w-[64px] min-h-0 shrink-0 items-center justify-center rounded-[12px] border border-[rgba(156,126,94,0.14)] bg-white/90 text-[var(--brown-strong)] shadow-[0_4px_12px_rgba(61,49,34,0.06),inset_0_1px_0_rgba(255,255,255,0.92)]"
                          whileHover={{
                            y: -1,
                            boxShadow: "0 8px 20px rgba(61,49,34,0.1), inset 0 1px 0 rgba(255,255,255,0.92)",
                            borderColor: "rgba(156,126,94,0.28)",
                          }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setIsHeaderCollapsed((current) => !current)}
                        >
                          <motion.span
                            animate={{ rotate: isHeaderCollapsed ? 180 : 0 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            className="inline-flex shrink-0 items-center justify-center"
                            style={{ originX: "50%", originY: "50%" }}
                          >
                            <ChevronUpIcon size={14} />
                          </motion.span>
                        </motion.button>
                        <span
                          aria-hidden="true"
                          className="h-[3px] flex-1 rounded-full bg-[linear-gradient(90deg,rgba(156,126,94,0.12),rgba(47,107,255,0.3),rgba(123,92,250,0.18),transparent)]"
                        />
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
                    className="paper-panel floatem-fill-panel relative min-h-0 flex-1 overflow-hidden rounded-[32px] p-3"
                  >
                    <div
                      data-testid="panel-scroll-region"
                      className="theme-inset-surface paper-scroll relative h-full overflow-y-auto rounded-[26px] p-1.5"
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

      <HelpDialog
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onStartInteractiveGuide={() => {
          setIsHelpOpen(false);
          setIsInteractiveGuideOpen(true);
        }}
      />
      <FirstLaunchHelpHint
        isOpen={isFirstLaunchHelpHintOpen}
        onDismiss={dismissFirstLaunchHelpHint}
        onOpenHelp={openHelp}
      />
      <InteractiveGuide
        activeTab={activeTab}
        isHeaderCollapsed={isHeaderCollapsed}
        isOpen={isInteractiveGuideOpen}
        onClose={() => setIsInteractiveGuideOpen(false)}
        onHeaderCollapsedChange={setIsHeaderCollapsed}
        onSettingsChange={(open) => {
          if (open !== showSettings) {
            onToggleSettings();
          }
        }}
        onTabChange={onTabChange}
        showSettings={showSettings}
      />
    </main>
  );
}
