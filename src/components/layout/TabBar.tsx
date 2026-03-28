import clsx from "clsx";
import { motion } from "framer-motion";
import type { TabId } from "../../lib/models";

type TabBarProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "notes", label: "Notes" },
  { id: "todos", label: "Todos" },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="w-full rounded-[18px] border border-[var(--border)]/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(120,86,52,0.05))] p-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
      role="tablist"
      aria-label="QuickNote sections"
    >
      <div className="grid grid-cols-2 gap-[3px]">
        {TABS.map((tab) => (
          <motion.button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx(
              "relative min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold tracking-[0.01em] text-[var(--muted)]",
              activeTab === tab.id &&
                "text-[var(--dark-text)] shadow-[0_10px_20px_rgba(108,82,58,0.12)]",
            )}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onTabChange(tab.id)}
          >
            {activeTab === tab.id ? (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-[14px] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(245,236,224,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
              />
            ) : null}
            <span className="relative z-10 wrap-anywhere">{tab.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
