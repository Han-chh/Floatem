import clsx from "clsx";
import { motion } from "framer-motion";
import { useI18n } from "../../lib/i18n";
import { CircleCheckBigIcon, NotebookPenIcon } from "../icons/AppIcons";
import type { TabId } from "../../lib/models";

type TabBarProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { t } = useI18n();
  const tabs: Array<{ id: TabId; label: string; icon: typeof NotebookPenIcon }> = [
    { id: "notes", label: t.tabs.notes, icon: NotebookPenIcon },
    { id: "todos", label: t.tabs.todos, icon: CircleCheckBigIcon },
  ];

  return (
    <div
      className="w-full rounded-[16px] border border-[var(--border)]/80 bg-[rgba(30,25,21,0.05)] p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
      role="tablist"
      aria-label={t.app.sectionsAria}
    >
      <div className="grid grid-cols-2 gap-[3px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
          <motion.button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            data-guide={`tab-${tab.id}`}
            data-tooltip={tab.label}
            data-tooltip-placement="bottom"
            className={clsx(
              "relative min-w-0 rounded-[12px] px-2 py-1.5 text-[11px] font-semibold tracking-normal text-[var(--muted)]",
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
                className="absolute inset-0 rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,237,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
              />
            ) : null}
            <span className="relative z-10 flex items-center justify-center gap-1.5 wrap-anywhere">
              <Icon size={13} />
              <span>{tab.label}</span>
            </span>
          </motion.button>
          );
        })}
      </div>
    </div>
  );
}
