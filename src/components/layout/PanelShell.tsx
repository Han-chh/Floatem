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
    <main className="h-screen overflow-hidden bg-[var(--sand)] text-[13.5px] text-[var(--dark-text)]">
      <div className="relative flex h-full flex-col bg-[var(--cream)] p-[10px]">
        <header className="mb-3 rounded-[20px] border border-[var(--border)] bg-[var(--cream)] px-4 py-3 shadow-[0_12px_30px_rgba(112,89,64,0.08)]">
          <div className="mb-3 flex items-start justify-between">
            <div data-tauri-drag-region className="min-w-0 flex-1 pr-3">
              <p className="text-[15px] font-semibold tracking-[0.01em] text-[var(--brown)]">QuickNote</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{platformLabel}</p>
            </div>
            <button
              type="button"
              className="rounded-[8px] border border-[var(--border)] bg-[var(--sand)] px-3 py-1.5 text-[11px] font-medium text-[var(--dark-text)] transition hover:border-[var(--border-strong)]"
              onClick={onToggleSettings}
            >
              Settings
            </button>
          </div>
          <TabBar activeTab={activeTab} onTabChange={onTabChange} />
        </header>

        <section className="relative min-h-0 flex-1 rounded-[20px] border border-[var(--border)] bg-[var(--sand)] p-3">
          {showSettings ? (
            <div className="absolute inset-3 z-10 rounded-[16px] border border-[var(--border)] bg-[var(--cream)] shadow-[0_16px_34px_rgba(112,89,64,0.12)]">
              {settingsPanel}
            </div>
          ) : null}
          <div className="paper-scroll h-full overflow-y-auto">{children}</div>
        </section>
      </div>
    </main>
  );
}
