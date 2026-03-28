import { motion } from "framer-motion";
import {
  BoldIcon,
  EraserIcon,
  ImagePlusIcon,
  ItalicIcon,
  PaletteIcon,
  UnderlineIcon,
} from "../icons/AppIcons";

const TOOL_ITEMS = [
  { label: "Bold", icon: BoldIcon, tone: "text-[#1E1915] bg-white/88" },
  { label: "Italic", icon: ItalicIcon, tone: "text-[#5D44D4] bg-[rgba(123,92,250,0.10)]" },
  { label: "Underline", icon: UnderlineIcon, tone: "text-[#B64B2E] bg-[rgba(255,122,89,0.10)]" },
  { label: "Color", icon: PaletteIcon, tone: "text-[#2853C7] bg-[rgba(47,107,255,0.10)]" },
  { label: "Image", icon: ImagePlusIcon, tone: "text-[#8E5B44] bg-[rgba(244,185,66,0.14)]" },
  { label: "Clear formatting", icon: EraserIcon, tone: "text-[#A24A2D] bg-[rgba(255,122,89,0.12)]" },
] as const;

export function Toolbar() {
  return (
    <div className="paper-card note-toolbar-grid rounded-[16px] bg-[rgba(255,250,244,0.66)] px-1.5 py-1.5">
      {TOOL_ITEMS.map(({ label, icon: Icon, tone }, index) => (
        <motion.button
          key={label}
          type="button"
          aria-label={label}
          onPointerDown={(event) => event.stopPropagation()}
          className={`group relative inline-flex h-7.5 w-7.5 items-center justify-center rounded-[10px] border border-[rgba(213,198,180,0.86)] ${tone} shadow-[0_6px_12px_rgba(61,49,34,0.05)]`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: 0.02 * index }}
          whileHover={{ y: -1.5, scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Icon size={13} />
          <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[rgba(30,25,21,0.94)] px-2 py-1 text-[10px] font-semibold leading-none tracking-[0.01em] whitespace-nowrap text-white opacity-0 shadow-[0_10px_20px_rgba(30,25,21,0.18)] transition-all duration-75 ease-out group-hover:-translate-y-1 group-hover:opacity-100 group-focus-visible:-translate-y-1 group-focus-visible:opacity-100">
            {label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
