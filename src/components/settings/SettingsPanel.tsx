import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { KeyboardIcon, MapPinIcon, PaletteIcon, SlidersHorizontalIcon, XIcon } from "../icons/AppIcons";

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
            <span className="status-chip" data-tone="blue">
              <SlidersHorizontalIcon size={12} />
              Settings
            </span>
            <span className="status-chip" data-tone="neutral">
              local only
            </span>
          </div>
          <h2 className="font-display text-[clamp(var(--font-section-compact),4.4vw,var(--font-section-expanded))] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
            Panel preferences
          </h2>
          <p className="settings-summary mt-1 text-[12px] text-[var(--muted)]">
            Shortcut, saved position, and color direction stay readable in one column and expand when the panel has room.
          </p>
        </div>

        <motion.button
          type="button"
          aria-label="Close"
          className="paper-icon-button module-primary-action self-start"
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
        >
          <XIcon size={16} />
        </motion.button>
      </div>

      <div className="settings-grid">
        <div className="paper-card rounded-[26px] p-4">
          <label className="block">
            <span className="mb-3 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
              <KeyboardIcon size={16} />
              Global shortcut
            </span>
            <input
              value={draftHotkey}
              onChange={(event) => setDraftHotkey(event.currentTarget.value)}
              onBlur={() => setHotkey(draftHotkey)}
              className="surface-field w-full rounded-[18px] px-4 py-3 text-[14px] font-medium text-[var(--dark-text)] outline-none"
            />
          </label>
        </div>

        <div className="paper-card rounded-[26px] p-4">
          <p className="mb-3 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
            <MapPinIcon size={16} />
            Panel position
          </p>
          <p className="font-display mt-2 text-[20px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">
            {panelPosition ? `x ${panelPosition.x}  y ${panelPosition.y}` : "Unset"}
          </p>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            The Rust layer updates this whenever the panel moves or hides.
          </p>
        </div>

        <div className="paper-card settings-wide-card rounded-[26px] p-4">
          <p className="mb-3 inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--brown-strong)]">
            <PaletteIcon size={16} />
            Theme preview
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="h-10 w-10 rounded-full bg-[var(--accent-coral)] shadow-[0_10px_18px_rgba(255,122,89,0.18)]" />
            <span className="h-10 w-10 rounded-full bg-[var(--accent-cobalt)] shadow-[0_10px_18px_rgba(47,107,255,0.16)]" />
            <span className="h-10 w-10 rounded-full bg-[var(--accent-jade)] shadow-[0_10px_18px_rgba(31,168,122,0.16)]" />
            <span className="h-10 w-10 rounded-full bg-[var(--accent-marigold)] shadow-[0_10px_18px_rgba(244,185,66,0.18)]" />
            <span className="h-10 w-10 rounded-full bg-[var(--accent-plum)] shadow-[0_10px_18px_rgba(123,92,250,0.16)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
