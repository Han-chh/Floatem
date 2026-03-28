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
        size={8.5}
        strokeWidth={2.4}
        className="relative z-10 text-[#7a1f16] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />
    </motion.button>
  );
}
