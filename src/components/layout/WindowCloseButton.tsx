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
        size={10.5}
        strokeWidth={3.2}
        className="relative z-10 text-[#210907] opacity-40 transition-opacity duration-150 group-hover:opacity-100"
      />
    </motion.button>
  );
}
