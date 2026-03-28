import { motion } from "framer-motion";
import {
  BoldIcon,
  ImagePlusIcon,
  ItalicIcon,
  PaintbrushIcon,
  PaletteIcon,
  Trash2Icon,
  UnderlineIcon,
} from "../icons/AppIcons";

const TOOL_ITEMS = [
  { label: "Bold", icon: BoldIcon, tone: "text-[#1E1915] bg-white/88" },
  { label: "Italic", icon: ItalicIcon, tone: "text-[#5D44D4] bg-[rgba(123,92,250,0.10)]" },
  { label: "Underline", icon: UnderlineIcon, tone: "text-[#B64B2E] bg-[rgba(255,122,89,0.10)]" },
  { label: "Palette", icon: PaletteIcon, tone: "text-[#2853C7] bg-[rgba(47,107,255,0.10)]" },
  { label: "Brush", icon: PaintbrushIcon, tone: "text-[#0F7A58] bg-[rgba(31,168,122,0.12)]" },
  { label: "Image", icon: ImagePlusIcon, tone: "text-[#8E5B44] bg-[rgba(244,185,66,0.14)]" },
  { label: "Clear", icon: Trash2Icon, tone: "text-[#C14D31] bg-[rgba(255,122,89,0.12)]" },
] as const;

export function Toolbar() {
  return (
    <div className="paper-card note-toolbar-grid rounded-[20px] bg-[rgba(255,250,244,0.84)] p-2">
      {TOOL_ITEMS.map(({ label, icon: Icon, tone }, index) => (
        <motion.button
          key={label}
          type="button"
          aria-label={label}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[14px] border border-[rgba(213,198,180,0.86)] px-2 py-2 text-center text-[11px] font-semibold leading-tight ${tone} shadow-[0_10px_18px_rgba(61,49,34,0.06)]`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.03 * index }}
          whileHover={{ y: -2, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Icon size={15} />
          <span className="wrap-anywhere">{label}</span>
        </motion.button>
      ))}
    </div>
  );
}
