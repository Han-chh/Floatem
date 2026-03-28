import clsx from "clsx";
import { motion } from "framer-motion";
import { CircleCheckBigIcon, NotebookPenIcon } from "../icons/AppIcons";
import type { TabId } from "../../lib/models";

type TabBarProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const TABS: Array<{ id: TabId; label: string; icon: typeof NotebookPenIcon }> = [
  { id: "notes", label: "Notes", icon: NotebookPenIcon },
  { id: "todos", label: "Todos", icon: CircleCheckBigIcon },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="w-full rounded-[22px] border border-[var(--border)]/80 bg-[rgba(30,25,21,0.05)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
      role="tablist"
      aria-label="QuickNote sections"
    >
      <div className="grid grid-cols-2 gap-[3px]">
        {TABS.map((tab) => {
          const Icon = tab.icon;

          return (
          <motion.button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx(
              "relative min-w-0 rounded-[16px] px-3 py-2.5 text-[12px] font-semibold tracking-[0.01em] text-[var(--muted)]",
              activeTab === tab.id &&
                "text-[var(--dark-text)] shadow-[0_10px_20px_rgba(61,49,34,0.12)]",
            )}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onTabChange(tab.id)}
          >
            {activeTab === tab.id ? (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-[16px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,237,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center justify-center gap-2 wrap-anywhere">
              <Icon size={16} />
              <span>{tab.label}</span>
            </span>
          </motion.button>
          );
        })}
      </div>
    </div>
  );
}
