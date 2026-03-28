import { motion } from "framer-motion";
import { XIcon } from "../icons/AppIcons";

type WindowCloseButtonProps = {
  onClick: () => void;
};

export function WindowCloseButton({ onClick }: WindowCloseButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label="Hide QuickNote"
      title="Hide QuickNote"
      className="mac-window-close group"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
    >
      <XIcon
        size={9.5}
        strokeWidth={3.1}
        className="mac-window-close-glyph"
      />
    </motion.button>
  );
}
