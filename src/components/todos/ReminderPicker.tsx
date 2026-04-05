import { addDays, addHours, format, setHours, setMinutes } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { buildReminderTimestamp, isFutureReminderTimestamp } from "../../lib/reminders";
import { startWindowDrag } from "../../hooks/useWindowDrag";
import { Clock3Icon, XIcon } from "../icons/AppIcons";

type ReminderPickerProps = {
  todoTitle: string;
  reminderAt: number | null;
  onChange: (nextValue: number | null) => void;
  displayValue?: string;
  className?: string;
  disabled?: boolean;
};

type DateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function roundToNextQuarter(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  const rounded = Math.ceil((minutes + 1) / 15) * 15;
  next.setMinutes(rounded, 0, 0);
  return next;
}

function buildDateValue(parts: DateParts) {
  return `${parts.year}-${pad(parts.monthIndex + 1)}-${pad(parts.day)}`;
}

function parseDateParts(dateValue: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  const daysInMonth = getDaysInMonth(year, monthIndex);
  if (day < 1 || day > daysInMonth) {
    return null;
  }

  return { year, monthIndex, day };
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDefaultDraft(reminderAt: number | null) {
  const baseDate = reminderAt ? new Date(reminderAt) : roundToNextQuarter(new Date());

  return {
    dateValue: buildDateValue({
      year: baseDate.getFullYear(),
      monthIndex: baseDate.getMonth(),
      day: baseDate.getDate(),
    }),
    hourValue: pad(baseDate.getHours()),
    minuteValue: pad(baseDate.getMinutes()),
  };
}

function getCalendarCells(year: number, monthIndex: number) {
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = getDaysInMonth(year, monthIndex);
  const cells: Array<Date | null> = Array.from({ length: firstDayOffset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index));
const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index));

export function ReminderPicker({
  todoTitle,
  reminderAt,
  onChange,
  displayValue,
  className = "",
  disabled = false,
}: ReminderPickerProps) {
  const { t, language } = useI18n();
  const monthSelectRef = useRef<HTMLSelectElement | null>(null);
  const hourSelectRef = useRef<HTMLSelectElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftHour, setDraftHour] = useState("09");
  const [draftMinute, setDraftMinute] = useState("00");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language, {
        month: "long",
      }),
    [language],
  );
  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language, {
        weekday: "short",
      }),
    [language],
  );

  const quickOptions = useMemo(() => {
    const now = new Date();
    const inOneHour = addHours(roundToNextQuarter(now), 1);
    const tonightBase =
      now.getHours() < 20
        ? setMinutes(setHours(now, 20), 0)
        : roundToNextQuarter(addHours(now, 2));
    const tomorrow = addDays(now, 1);

    return [
      { label: t.todos.inOneHour, mode: "timestamp" as const, value: inOneHour },
      { label: t.todos.tonight, mode: "timestamp" as const, value: tonightBase },
      { label: t.todos.tomorrow, mode: "date" as const, value: tomorrow },
    ];
  }, [t.todos.inOneHour, t.todos.tonight, t.todos.tomorrow]);

  const weekdayLabels = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => weekdayFormatter.format(addDays(monday, index)));
  }, [weekdayFormatter]);

  const selectedDateParts = useMemo(() => {
    return parseDateParts(draftDate) ?? parseDateParts(getDefaultDraft(reminderAt).dateValue)!;
  }, [draftDate, reminderAt]);
  const currentMonthLabel = monthFormatter.format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1));
  const todayStart = getStartOfToday();
  const currentYear = todayStart.getFullYear();
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) => ({
        label: monthFormatter.format(new Date(2024, monthIndex, 1)),
        value: monthIndex,
      })),
    [monthFormatter],
  );
  const yearOptions = useMemo(() => {
    const minimumYear = Math.min(currentYear, selectedDateParts.year);
    const maximumYear = Math.max(currentYear + 5, selectedDateParts.year);

    return Array.from({ length: maximumYear - minimumYear + 1 }, (_, index) => minimumYear + index);
  }, [currentYear, selectedDateParts.year]);
  const calendarCells = useMemo(
    () => getCalendarCells(calendarMonth.getFullYear(), calendarMonth.getMonth()),
    [calendarMonth],
  );

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const nextDraft = getDefaultDraft(reminderAt);
    const nextParts = parseDateParts(nextDraft.dateValue);

    setDraftDate(nextDraft.dateValue);
    setDraftHour(nextDraft.hourValue);
    setDraftMinute(nextDraft.minuteValue);
    setValidationMessage(null);
    setHelperMessage(null);
    if (nextParts) {
      setCalendarMonth(new Date(nextParts.year, nextParts.monthIndex, 1));
    }

    const animationFrame = window.requestAnimationFrame(() => {
      monthSelectRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setValidationMessage(null);
        setHelperMessage(null);
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, reminderAt]);

  const updateDraftDate = (parts: Partial<DateParts>) => {
    const nextYear = parts.year ?? selectedDateParts.year;
    const nextMonthIndex = parts.monthIndex ?? selectedDateParts.monthIndex;
    const nextDay = Math.min(parts.day ?? selectedDateParts.day, getDaysInMonth(nextYear, nextMonthIndex));

    setDraftDate(
      buildDateValue({
        year: nextYear,
        monthIndex: nextMonthIndex,
        day: nextDay,
      }),
    );
    setCalendarMonth(new Date(nextYear, nextMonthIndex, 1));
    setValidationMessage(null);
    setHelperMessage(null);
  };

  const handleToggleOpen = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  };

  const closeDialog = () => {
    setValidationMessage(null);
    setHelperMessage(null);
    setIsOpen(false);
  };

  const handleSave = () => {
    const nextValue = buildReminderTimestamp(draftDate, draftHour, draftMinute);

    if (nextValue === null) {
      return;
    }

    if (!isFutureReminderTimestamp(nextValue)) {
      setValidationMessage(t.todos.reminderPastError);
      return;
    }

    setValidationMessage(null);
    setHelperMessage(null);
    onChange(nextValue);
    setIsOpen(false);
  };

  const currentReminderLabel = reminderAt
    ? format(new Date(reminderAt), "yyyy/MM/dd HH:mm")
    : t.todos.notScheduled;
  const draftReminderAt = buildReminderTimestamp(draftDate, draftHour, draftMinute);
  const draftReminderLabel =
    draftReminderAt === null ? t.todos.notScheduled : format(new Date(draftReminderAt), "yyyy/MM/dd HH:mm");

  return (
    <>
      <div className="relative">
        <motion.button
          type="button"
          aria-label={reminderAt ? t.todos.changeReminder : t.todos.setReminder}
          title={displayValue ?? t.todos.setReminder}
          data-no-window-drag="true"
          className={`inline-flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10.5px] font-semibold shadow-[0_8px_18px_rgba(61,49,34,0.08)] ${className}`}
          whileHover={disabled ? undefined : { y: -1.5, scale: 1.02 }}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleToggleOpen}
        >
          <Clock3Icon size={12} />
          {displayValue ? <span className="min-w-0 whitespace-nowrap">{displayValue}</span> : null}
        </motion.button>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  data-no-window-drag="true"
                  className="fixed inset-0 z-[90] overflow-y-auto bg-[rgba(30,25,21,0.24)] px-5 py-4 backdrop-blur-[10px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeDialog}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.todos.dialogTitle}
                    className="paper-panel mx-auto my-4 flex max-h-[calc(100vh-32px)] w-full max-w-[468px] flex-col overflow-hidden rounded-[28px] p-5 shadow-[0_30px_60px_rgba(30,25,21,0.2)]"
                    initial={{ opacity: 0, scale: 0.96, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 10 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onPointerDownCapture={startWindowDrag}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="status-chip" data-tone="blue">
                          <Clock3Icon size={11} />
                          {t.todos.reminder}
                        </span>
                        <p className="mt-2 font-display text-[22px] font-semibold tracking-[-0.05em] text-[var(--brown-strong)]">
                          {todoTitle}
                        </p>
                        <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                          {t.todos.dialogSubtitle}
                        </p>
                      </div>
                      <motion.button
                        type="button"
                        aria-label={t.common.close}
                        data-no-window-drag="true"
                        className="paper-button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[14px] px-3 py-2 text-[12px] font-semibold text-[var(--dark-text)]"
                        whileHover={{ y: -2, scale: 1.02 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={closeDialog}
                      >
                        <XIcon size={14} />
                        {t.common.close}
                      </motion.button>
                    </div>

                    <form
                      className="flex min-h-0 flex-1 flex-col gap-4"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleSave();
                      }}
                    >
                      <div className="paper-scroll min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                        <div className="rounded-[20px] border border-[rgba(213,198,180,0.88)] bg-white/84 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                            {t.todos.currentReminder}
                          </p>
                          <p className="mt-2 text-[14px] font-semibold text-[var(--brown-strong)]">
                            {currentReminderLabel}
                          </p>
                        </div>

                        <div className="rounded-[20px] border border-[rgba(47,107,255,0.16)] bg-[rgba(47,107,255,0.06)] p-4">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#2853C7]">
                              <Clock3Icon size={15} />
                              {t.todos.scheduledFor}
                            </p>
                            <span className="status-chip" data-tone="blue">
                              <Clock3Icon size={11} />
                              {t.todos.precise}
                            </span>
                          </div>
                          <p className="font-display text-[24px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                            {draftReminderLabel}
                          </p>
                          <p className="mt-2 text-[12px] leading-6 text-[var(--muted)]">
                            {t.todos.pickDateTime}
                          </p>
                        </div>

                        <div className="rounded-[24px] border border-[rgba(213,198,180,0.88)] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(255,247,239,0.94))] p-4 shadow-[0_12px_24px_rgba(61,49,34,0.06)]">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                {t.todos.date}
                              </p>
                              <p className="mt-1 text-[12px] leading-6 text-[var(--muted)]">
                                {t.todos.calendarHint}
                              </p>
                              <p className="mt-2 font-display text-[18px] font-semibold tracking-[-0.04em] text-[var(--brown-strong)]">
                                {currentMonthLabel} {calendarMonth.getFullYear()}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <motion.button
                                type="button"
                                aria-label={t.todos.previousMonth}
                                data-no-window-drag="true"
                                className="paper-icon-button inline-flex h-8 w-8 items-center justify-center rounded-full text-[14px]"
                                whileHover={{ y: -1.5, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() =>
                                  setCalendarMonth(
                                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                                  )
                                }
                              >
                                {"<"}
                              </motion.button>
                              <motion.button
                                type="button"
                                aria-label={t.todos.nextMonth}
                                data-no-window-drag="true"
                                className="paper-icon-button inline-flex h-8 w-8 items-center justify-center rounded-full text-[14px]"
                                whileHover={{ y: -1.5, scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() =>
                                  setCalendarMonth(
                                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                                  )
                                }
                              >
                                {">"}
                              </motion.button>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <label className="grid gap-1.5">
                              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                {t.todos.month}
                              </span>
                              <select
                                ref={monthSelectRef}
                                value={calendarMonth.getMonth()}
                                className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                                onChange={(event) => {
                                  const monthIndex = Number(event.currentTarget.value);
                                  setCalendarMonth(new Date(calendarMonth.getFullYear(), monthIndex, 1));
                                  updateDraftDate({ monthIndex });
                                }}
                              >
                                {monthOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="grid gap-1.5">
                              <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                                {t.todos.year}
                              </span>
                              <select
                                value={calendarMonth.getFullYear()}
                                className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                                onChange={(event) => {
                                  const year = Number(event.currentTarget.value);
                                  setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
                                  updateDraftDate({ year });
                                }}
                              >
                                {yearOptions.map((year) => (
                                  <option key={year} value={year}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="mt-3 rounded-[18px] border border-[rgba(213,198,180,0.78)] bg-white/84 p-3">
                            <div className="mb-2 grid grid-cols-7 gap-1">
                              {weekdayLabels.map((weekday) => (
                                <span
                                  key={weekday}
                                  className="text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"
                                >
                                  {weekday}
                                </span>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                              {calendarCells.map((cell, index) => {
                                if (!cell) {
                                  return (
                                    <span key={`empty-${index}`} className="block h-9 rounded-[12px]" aria-hidden="true" />
                                  );
                                }

                                const isSelected =
                                  cell.getFullYear() === selectedDateParts.year &&
                                  cell.getMonth() === selectedDateParts.monthIndex &&
                                  cell.getDate() === selectedDateParts.day;
                                const isPastDay = cell.getTime() < todayStart.getTime();
                                const isToday = cell.getTime() === todayStart.getTime();

                                return (
                                  <motion.button
                                    key={cell.toISOString()}
                                    type="button"
                                    disabled={isPastDay}
                                    data-no-window-drag="true"
                                    className={`h-9 rounded-[12px] text-[12px] font-semibold transition-colors ${
                                      isSelected
                                        ? "bg-[var(--accent-cobalt)] text-white shadow-[0_10px_20px_rgba(47,107,255,0.22)]"
                                        : isPastDay
                                          ? "cursor-not-allowed bg-[rgba(30,25,21,0.04)] text-[rgba(30,25,21,0.26)]"
                                          : isToday
                                            ? "border border-[rgba(47,107,255,0.2)] bg-[rgba(47,107,255,0.08)] text-[#2853C7]"
                                            : "bg-[rgba(255,255,255,0.9)] text-[var(--dark-text)] hover:bg-[rgba(255,244,232,0.98)]"
                                    }`}
                                    whileHover={!isPastDay ? { y: -1.5, scale: 1.02 } : undefined}
                                    whileTap={!isPastDay ? { scale: 0.98 } : undefined}
                                    onClick={() =>
                                      updateDraftDate({
                                        year: cell.getFullYear(),
                                        monthIndex: cell.getMonth(),
                                        day: cell.getDate(),
                                      })
                                    }
                                  >
                                    {cell.getDate()}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                          <div className="md:col-span-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                              {t.todos.specificTimeTitle}
                            </p>
                          </div>
                          <label className="grid gap-1.5">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                              {t.todos.hour}
                            </span>
                            <select
                              ref={hourSelectRef}
                              value={draftHour}
                              className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                              onChange={(event) => {
                                setDraftHour(event.currentTarget.value);
                                setValidationMessage(null);
                                setHelperMessage(null);
                              }}
                            >
                              {hourOptions.map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="grid gap-1.5">
                            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                              {t.todos.minute}
                            </span>
                            <select
                              value={draftMinute}
                              className="surface-field w-full min-w-0 rounded-[14px] px-3 py-2.5 text-[12px] font-semibold text-[var(--dark-text)] outline-none"
                              onChange={(event) => {
                                setDraftMinute(event.currentTarget.value);
                                setValidationMessage(null);
                                setHelperMessage(null);
                              }}
                            >
                              {minuteOptions.map((minute) => (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="grid gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                            {t.todos.quickShortcutsTitle}
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {quickOptions.map((option) => (
                              <motion.button
                                key={option.label}
                                type="button"
                                className="rounded-[12px] border border-[rgba(213,198,180,0.9)] bg-white/84 px-2 py-2 text-[10.5px] font-semibold text-[var(--brown-strong)]"
                                whileHover={{ y: -1.5, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  if (option.mode === "timestamp") {
                                    setDraftDate(
                                      buildDateValue({
                                        year: option.value.getFullYear(),
                                        monthIndex: option.value.getMonth(),
                                        day: option.value.getDate(),
                                      }),
                                    );
                                    setCalendarMonth(new Date(option.value.getFullYear(), option.value.getMonth(), 1));
                                    setDraftHour(pad(option.value.getHours()));
                                    setDraftMinute(pad(option.value.getMinutes()));
                                    setHelperMessage(null);
                                  } else {
                                    setDraftDate(
                                      buildDateValue({
                                        year: option.value.getFullYear(),
                                        monthIndex: option.value.getMonth(),
                                        day: option.value.getDate(),
                                      }),
                                    );
                                    setCalendarMonth(new Date(option.value.getFullYear(), option.value.getMonth(), 1));
                                    setHelperMessage(t.todos.tomorrowTimePrompt);
                                    window.requestAnimationFrame(() => {
                                      hourSelectRef.current?.focus();
                                    });
                                  }

                                  setValidationMessage(null);
                                }}
                              >
                                {option.label}
                              </motion.button>
                            ))}
                          </div>
                        </div>

                        {validationMessage ? (
                          <p className="text-[11px] font-medium leading-5 text-[#b64b2e]">{validationMessage}</p>
                        ) : helperMessage ? (
                          <p className="text-[11px] font-medium leading-5 text-[#2853C7]">{helperMessage}</p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <motion.button
                          type="button"
                          data-no-window-drag="true"
                          className="rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold text-[var(--muted)]"
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setValidationMessage(null);
                            setHelperMessage(null);
                            onChange(null);
                            setIsOpen(false);
                          }}
                        >
                          {t.common.clear}
                        </motion.button>

                        <div className="flex items-center gap-2">
                          <motion.button
                            type="button"
                            data-no-window-drag="true"
                            className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                            whileHover={{ y: -1.5, scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={closeDialog}
                          >
                            {t.common.close}
                          </motion.button>
                          <motion.button
                            type="submit"
                            data-no-window-drag="true"
                            disabled={!draftDate}
                            className={`paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold ${
                              draftDate ? "" : "cursor-not-allowed opacity-60"
                            }`}
                            whileHover={draftDate ? { y: -1.5, scale: 1.01 } : undefined}
                            whileTap={draftDate ? { scale: 0.985 } : undefined}
                          >
                            {t.common.save}
                          </motion.button>
                        </div>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
