import clsx from "clsx";
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
    <div className="mx-[14px] rounded-[10px] border border-[var(--border)]/60 bg-black/[0.055] p-[3px]" role="tablist" aria-label="QuickNote sections">
      <div className="grid grid-cols-2 gap-[3px]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx(
              "rounded-[7px] px-4 py-2 text-[12px] font-medium text-[var(--muted)] transition",
              activeTab === tab.id &&
                "bg-[var(--cream)] text-[var(--dark-text)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
            )}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
