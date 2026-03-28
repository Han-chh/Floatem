import { motion } from "framer-motion";

const TOOL_ITEMS = ["B", "I", "U", "Color", "Brush", "Image", "Clear"];

export function Toolbar() {
  return (
    <div className="paper-card flex flex-wrap gap-2 rounded-[18px] bg-[rgba(255,250,244,0.84)] p-2">
      {TOOL_ITEMS.map((item, index) => (
        <motion.button
          key={item}
          type="button"
          className="paper-button rounded-[14px] px-3 py-1.5 text-[11px] font-semibold tracking-[0.05em] text-[var(--brown-strong)]"
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
