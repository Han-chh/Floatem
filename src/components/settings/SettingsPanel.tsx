import { useEffect, useState } from "react";
import { useSettingsStore } from "../../store/settingsStore";

type SettingsPanelProps = {
  onClose: () => void;
};

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const hotkey = useSettingsStore((state) => state.hotkey);
  const panelPosition = useSettingsStore((state) => state.panelPosition);
  const setHotkey = useSettingsStore((state) => state.setHotkey);
  const [draftHotkey, setDraftHotkey] = useState(hotkey);

  useEffect(() => {
    setDraftHotkey(hotkey);
  }, [hotkey]);

  return (
    <section className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--brown)]">Settings</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">Current scaffold supports hotkey persistence and panel position memory.</p>
        </div>
        <button
          type="button"
          className="rounded-[8px] border border-[var(--border)] bg-[var(--sand)] px-3 py-1.5 text-[11px] text-[var(--dark-text)]"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="space-y-4 rounded-[14px] border border-[var(--border)] bg-[var(--sand)] p-4">
        <label className="block">
          <span className="mb-2 block text-[11px] font-medium text-[var(--muted)]">Global shortcut</span>
          <input
            value={draftHotkey}
            onChange={(event) => setDraftHotkey(event.currentTarget.value)}
            onBlur={() => setHotkey(draftHotkey)}
            className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--cream)] px-3 py-2 text-[13px] text-[var(--dark-text)] outline-none"
          />
        </label>

        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--cream)] px-3 py-3">
          <p className="text-[11px] font-medium text-[var(--muted)]">Last panel position</p>
          <p className="mt-1 text-[13px] text-[var(--dark-text)]">
            {panelPosition ? `${panelPosition.x}, ${panelPosition.y}` : "Not recorded yet"}
          </p>
        </div>
      </div>
    </section>
  );
}
