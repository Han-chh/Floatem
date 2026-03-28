import { format } from "date-fns";
import { motion } from "framer-motion";
import { useRef } from "react";
import { Clock3Icon } from "../icons/AppIcons";

type ReminderPickerProps = {
  reminderAt: number | null;
  onChange: (nextValue: number | null) => void;
  displayValue?: string;
  className?: string;
};

export function ReminderPicker({
  reminderAt,
  onChange,
  displayValue,
  className = "",
}: ReminderPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenPicker = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="datetime-local"
        value={reminderAt ? format(new Date(reminderAt), "yyyy-MM-dd'T'HH:mm") : ""}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        onChange={(event) => {
          const nextValue = event.currentTarget.value
            ? new Date(event.currentTarget.value).getTime()
            : null;
          onChange(nextValue);
        }}
      />
      <motion.button
        type="button"
        aria-label={reminderAt ? "Change reminder" : "Set reminder"}
        title={displayValue ?? "Set reminder"}
        className={`inline-flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold shadow-[0_8px_18px_rgba(61,49,34,0.08)] ${className}`}
        whileHover={{ y: -1.5, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={handleOpenPicker}
      >
        <Clock3Icon size={13} />
        {displayValue ? <span className="min-w-0 whitespace-nowrap">{displayValue}</span> : null}
      </motion.button>
    </div>
  );
}
