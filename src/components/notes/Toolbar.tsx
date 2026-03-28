import { motion } from "framer-motion";

const TOOL_ITEMS = ["B", "I", "U", "Color", "Brush", "Image", "Clear"];

export function Toolbar() {
  return (
    <div className="paper-card note-toolbar-grid rounded-[18px] bg-[rgba(255,250,244,0.84)] p-2">
      {TOOL_ITEMS.map((item, index) => (
        <motion.button
          key={item}
          type="button"
          className="paper-button flex min-h-10 items-center justify-center rounded-[14px] px-2 py-2 text-center text-[11px] font-semibold leading-tight tracking-[0.05em] text-[var(--brown-strong)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.03 * index }}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {item}
        </motion.button>
      ))}
    </div>
  );
}
