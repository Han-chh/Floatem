import { motion } from "framer-motion";
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
    <section data-testid="settings-panel" className="cq-module flex h-full min-h-0 flex-col p-5">
      <div className="module-header-grid mb-4">
        <div className="module-header-copy">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(122,89,64,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brown)]">
              Settings
            </span>
            <span className="rounded-full bg-[rgba(255,255,255,0.56)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              local only
            </span>
          </div>
          <h2 className="font-display text-[clamp(var(--font-section-compact),4.4vw,var(--font-section-expanded))] font-semibold tracking-[-0.02em] text-[var(--brown-strong)]">
            Panel behavior
          </h2>
          <p className="settings-summary mt-1 text-[12px] text-[var(--muted)]">
            Core settings stay readable in a single column and expand when the panel has room.
          </p>
        </div>

        <motion.button
          type="button"
          className="module-primary-action paper-button self-start rounded-[16px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brown-strong)]"
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
        >
          Close
        </motion.button>
      </div>

      <div className="settings-grid">
        <div className="paper-card rounded-[24px] p-4">
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Global shortcut
            </span>
            <input
              value={draftHotkey}
              onChange={(event) => setDraftHotkey(event.currentTarget.value)}
              onBlur={() => setHotkey(draftHotkey)}
              className="w-full rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.7)] px-4 py-3 text-[14px] font-medium text-[var(--dark-text)] outline-none"
            />
          </label>
        </div>

        <div className="paper-card rounded-[24px] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Last panel position</p>
          <p className="font-display mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">
            {panelPosition ? `x ${panelPosition.x}  y ${panelPosition.y}` : "Unset"}
          </p>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            The Rust layer updates this whenever the panel moves or hides.
          </p>
        </div>
      </div>
    </section>
  );
}
