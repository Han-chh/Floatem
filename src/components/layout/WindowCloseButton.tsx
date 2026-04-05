import { motion } from "framer-motion";
import { useI18n } from "../../lib/i18n";
import { XIcon } from "../icons/AppIcons";

type WindowCloseButtonProps = {
  onClick: () => void;
};

export function WindowCloseButton({ onClick }: WindowCloseButtonProps) {
  const { t } = useI18n();

  return (
    <motion.button
      type="button"
      aria-label={t.app.hideWindow}
      title={t.app.hideWindow}
      className="mac-window-close group"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
    >
      <XIcon
        size={7.1}
        strokeWidth={2.6}
        className="mac-window-close-glyph"
      />
    </motion.button>
  );
}
