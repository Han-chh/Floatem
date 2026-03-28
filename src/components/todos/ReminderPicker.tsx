import { addDays, addHours, format, setHours, setMinutes } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3Icon } from "../icons/AppIcons";

type ReminderPickerProps = {
  reminderAt: number | null;
  onChange: (nextValue: number | null) => void;
  displayValue?: string;
  className?: string;
  disabled?: boolean;
};

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function roundToNextQuarter(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const rounded = Math.ceil((minutes + 1) / 15) * 15;
  next.setMinutes(rounded, 0, 0);
  return next;
}

function buildTimestamp(dateValue: string, hourValue: string, minuteValue: string) {
  if (!dateValue) {
    return null;
  }

  const nextValue = new Date(`${dateValue}T${hourValue}:${minuteValue}:00`);
  return Number.isNaN(nextValue.getTime()) ? null : nextValue.getTime();
}

function getDefaultDraft(reminderAt: number | null) {
  const baseDate = reminderAt ? new Date(reminderAt) : roundToNextQuarter(new Date());

  return {
    dateValue: toDateInputValue(baseDate),
    hourValue: pad(baseDate.getHours()),
    minuteValue: pad(baseDate.getMinutes()),
  };
}

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index));
const minuteOptions = Array.from({ length: 12 }, (_, index) => pad(index * 5));

export function ReminderPicker({
  reminderAt,
  onChange,
  displayValue,
  className = "",
  disabled = false,
}: ReminderPickerProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftHour, setDraftHour] = useState("09");
  const [draftMinute, setDraftMinute] = useState("00");

  const quickOptions = useMemo(() => {
    const now = new Date();
    const inOneHour = addHours(roundToNextQuarter(now), 1);
    const tomorrowMorning = setMinutes(setHours(addDays(now, 1), 9), 0);
    const tonight = setMinutes(setHours(now, Math.max(now.getHours() + 2, 20)), 0);

    return [
      { label: "In 1h", value: inOneHour.getTime() },
      { label: "Tonight", value: tonight.getTime() },
      { label: "Tomorrow 09:00", value: tomorrowMorning.getTime() },
    ];
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const nextDraft = getDefaultDraft(reminderAt);
      setDraftDate(nextDraft.dateValue);
      setDraftHour(nextDraft.hourValue);
      setDraftMinute(nextDraft.minuteValue);
    }
  }, [isOpen, reminderAt]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (shellRef.current?.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleOpen = () => {
    if (disabled) {
      return;
    }
    setIsOpen((current) => !current);
  };

  const handleSave = () => {
    const nextValue = buildTimestamp(draftDate, draftHour, draftMinute);
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={shellRef} className="relative">
      <motion.button
        type="button"
        aria-label={reminderAt ? "Change reminder" : "Set reminder"}
        title={displayValue ?? "Set reminder"}
        className={`inline-flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10.5px] font-semibold shadow-[0_8px_18px_rgba(61,49,34,0.08)] ${className}`}
        whileHover={disabled ? undefined : { y: -1.5, scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={handleToggleOpen}
      >
        <Clock3Icon size={12} />
        {displayValue ? <span className="min-w-0 whitespace-nowrap">{displayValue}</span> : null}
      </motion.button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="paper-card absolute right-0 top-[calc(100%+8px)] z-30 w-[min(276px,calc(100vw-36px))] overflow-hidden rounded-[20px] border border-[rgba(213,198,180,0.92)] p-3 shadow-[0_20px_36px_rgba(61,49,34,0.16)]"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(30,25,21,0.04) 0.8px, transparent 0.8px), linear-gradient(140deg, rgba(255,255,255,0.28), transparent 58%)",
                backgroundSize: "18px 18px, 100% 100%",
              }}
            />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    Reminder
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--brown-strong)]">
                    Pick date and time
                  </p>
                </div>
                <span className="status-chip" data-tone="blue">
                  <Clock3Icon size={11} />
                  precise
                </span>
              </div>

              <div className="grid gap-2">
                <label className="grid gap-1">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Date
                  </span>
                  <input
                    type="date"
                    value={draftDate}
                    className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                    onChange={(event) => setDraftDate(event.currentTarget.value)}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Hour
                    </span>
                    <select
                      value={draftHour}
                      className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                      onChange={(event) => setDraftHour(event.currentTarget.value)}
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Minute
                    </span>
                    <select
                      value={draftMinute}
                      className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                      onChange={(event) => setDraftMinute(event.currentTarget.value)}
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {quickOptions.map((option) => (
                  <motion.button
                    key={option.label}
                    type="button"
                    className="rounded-[12px] border border-[rgba(213,198,180,0.9)] bg-white/84 px-2 py-2 text-[10.5px] font-semibold text-[var(--brown-strong)]"
                    whileHover={{ y: -1.5, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      const quickDate = new Date(option.value);
                      setDraftDate(toDateInputValue(quickDate));
                      setDraftHour(pad(quickDate.getHours()));
                      setDraftMinute(pad(quickDate.getMinutes()));
                    }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <motion.button
                  type="button"
                  className="rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold text-[var(--muted)]"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                >
                  Clear
                </motion.button>

                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    className="rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold text-[var(--muted)]"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    className="paper-button paper-button-primary rounded-full px-3 py-1.5 text-[10.5px] font-semibold"
                    whileHover={{ y: -1.5, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                  >
                    Save
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
