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
    <section className="flex h-full flex-col p-5">
      <div className="mb-4 flex flex-col gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[rgba(122,89,64,0.08)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--brown)]">
              Settings
            </span>
            <span className="rounded-full bg-[rgba(255,255,255,0.56)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              local only
            </span>
          </div>
          <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em] text-[var(--brown-strong)]">Panel behavior</h2>
          <p className="mt-1 max-w-[20rem] text-[12px] text-[var(--muted)]">
            Hotkey persistence and panel position are already wired. More preferences can layer in here next.
          </p>
        </div>

        <motion.button
          type="button"
          className="paper-button self-start rounded-[16px] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brown-strong)]"
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
        >
          Close
        </motion.button>
      </div>

      <div className="grid gap-4">
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
          <p className="font-display mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">
            {panelPosition ? `${panelPosition.x}, ${panelPosition.y}` : "Unset"}
          </p>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            The Rust layer updates this whenever the panel moves or hides.
          </p>
        </div>
      </div>
    </section>
  );
}
