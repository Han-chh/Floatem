import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../lib/i18n";
import { getSystemTimeZone, type TimeFormat } from "../../lib/models";
import { getFloatemBridge } from "../../lib/nativeBridge";
import {
  buildReminderTimestamp,
  isFutureReminderTimestamp,
  isReminderTimeFuture,
} from "../../lib/reminders";
import {
  formatHourOption,
  formatTimestampInTimeZone,
  getDateTimePartsInTimeZone,
  formatDateKeyInTimeZone,
} from "../../lib/timeZoneDate";
import { ChevronDownIcon, Clock3Icon, XIcon } from "../icons/AppIcons";

type ReminderPickerProps = {
  todoTitle: string;
  todoDateKey?: string;
  reminderAt: number | null;
  onChange: (nextValue: number | null) => void;
  displayValue?: string;
  tooltip?: string;
  className?: string;
  disabled?: boolean;
  timeZone?: string;
  timeFormat?: TimeFormat;
};

type TimeMenu = "hour" | "minute" | null;

type TimeOptionState = {
  disabled: boolean;
  tooltip?: string;
};

type ReminderTimeSelectProps = {
  label: string;
  value: string;
  options: string[];
  formatOption: (value: string) => string;
  getOptionState: (option: string) => TimeOptionState;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
  triggerRef?: Ref<HTMLButtonElement>;
};

const REMINDER_DIALOG_CLOCK_MS = 30_000;

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function roundToNextQuarterTimestamp(now = Date.now()) {
  return Math.ceil((now + 60_000) / 900_000) * 900_000;
}

function getDefaultDraft(reminderAt: number | null, timeZone: string) {
  const baseParts = getDateTimePartsInTimeZone(
    reminderAt ? new Date(reminderAt) : new Date(roundToNextQuarterTimestamp()),
    timeZone,
  );

  return {
    hourValue: pad(baseParts.hour),
    minuteValue: pad(baseParts.minute),
  };
}

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index));
const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index));

function ReminderTimeSelect({
  label,
  value,
  options,
  formatOption,
  getOptionState,
  isOpen,
  onOpenChange,
  onChange,
  triggerRef,
}: ReminderTimeSelectProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isOpen, onOpenChange]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        data-no-window-drag="true"
        className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-[rgba(213,198,180,0.88)] bg-white/92 px-2.5 py-2 text-left text-[11.5px] font-semibold text-[var(--brown-strong)] outline-none focus:border-[rgba(47,107,255,0.45)]"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className="min-w-0 truncate">{formatOption(value)}</span>
        <ChevronDownIcon className={isOpen ? "rotate-180" : ""} size={13} />
      </button>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-36 overflow-y-auto rounded-[14px] border border-[rgba(213,198,180,0.92)] bg-white p-1 shadow-[0_14px_28px_rgba(30,25,21,0.14)]"
          >
            {options.map((option) => {
              const selected = option === value;
              const { disabled, tooltip } = getOptionState(option);

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-disabled={disabled}
                  data-tooltip={disabled ? tooltip : undefined}
                  data-no-window-drag="true"
                  className={`flex w-full items-center justify-between rounded-[10px] px-2.5 py-1.75 text-left text-[11.5px] font-semibold ${
                    disabled
                      ? "cursor-not-allowed text-[rgba(30,25,21,0.32)]"
                      : selected
                        ? "bg-[rgba(47,107,255,0.10)] text-[#2853C7]"
                        : "text-[var(--brown-strong)] hover:bg-[rgba(30,25,21,0.05)]"
                  }`}
                  onClick={() => {
                    if (disabled) {
                      return;
                    }

                    onChange(option);
                    onOpenChange(false);
                  }}
                >
                  <span>{formatOption(option)}</span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      disabled ? "bg-transparent" : selected ? "bg-[var(--accent-cobalt)]" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ReminderPicker({
  todoTitle,
  todoDateKey,
  reminderAt,
  onChange,
  displayValue,
  tooltip,
  className = "",
  disabled = false,
  timeZone = getSystemTimeZone(),
  timeFormat = "24h",
}: ReminderPickerProps) {
  const { language, t } = useI18n();
  const hourButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftHour, setDraftHour] = useState("09");
  const [draftMinute, setDraftMinute] = useState("00");
  const [openMenu, setOpenMenu] = useState<TimeMenu>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const reminderDateKey = todoDateKey ?? formatDateKeyInTimeZone(new Date(), timeZone);
  const todayDateKey = formatDateKeyInTimeZone(new Date(nowMs), timeZone);
  const pastTooltip = t.todos.reminderPastTooltip;

  const quickOptions = useMemo(() => {
    const relativeShortcut = (label: string, offsetMs: number) => {
      const shortcutDate = new Date(nowMs + offsetMs);
      const shortcutDateKey = formatDateKeyInTimeZone(shortcutDate, timeZone);
      const parts = getDateTimePartsInTimeZone(shortcutDate, timeZone);
      const hourValue = pad(parts.hour);
      const minuteValue = pad(parts.minute);
      const timestamp = buildReminderTimestamp(reminderDateKey, hourValue, minuteValue, timeZone);
      const isPastDate = reminderDateKey < todayDateKey;
      const isDifferentDate = shortcutDateKey !== reminderDateKey;

      return {
        disabled: isPastDate || isDifferentDate || timestamp === null || !isFutureReminderTimestamp(timestamp, nowMs),
        displayLabel: label,
        hourValue,
        label,
        minuteValue,
        tooltip: isPastDate ? pastTooltip : isDifferentDate ? t.todos.notSameDay : label,
      };
    };
    const timeOfDayShortcut = (label: string, hourValue: string, minuteValue: string) => {
      const timestamp = buildReminderTimestamp(reminderDateKey, hourValue, minuteValue, timeZone);

      return {
        disabled: timestamp === null || !isFutureReminderTimestamp(timestamp, nowMs),
        displayLabel: label,
        hourValue,
        label,
        minuteValue,
        tooltip:
          timestamp === null || !isFutureReminderTimestamp(timestamp, nowMs)
            ? pastTooltip
            : formatTimestampInTimeZone(timestamp, timeZone, "time", timeFormat),
      };
    };

    return [
      relativeShortcut(t.todos.inThirtyMinutes, 30 * 60 * 1000),
      relativeShortcut(t.todos.inOneHour, 60 * 60 * 1000),
      timeOfDayShortcut(t.todos.earlyMorning, "07", "00"),
      timeOfDayShortcut(t.todos.morning, "10", "00"),
      timeOfDayShortcut(t.todos.afternoon, "15", "00"),
      timeOfDayShortcut(t.todos.evening, "20", "00"),
    ];
  }, [
    nowMs,
    reminderDateKey,
    todayDateKey,
    t.todos.afternoon,
    t.todos.earlyMorning,
    t.todos.inOneHour,
    t.todos.inThirtyMinutes,
    t.todos.notSameDay,
    t.todos.morning,
    t.todos.evening,
    timeFormat,
    timeZone,
  ]);

  const getHourOptionState = useMemo(() => {
    return (hour: string): TimeOptionState => {
      const enabled = isReminderTimeFuture(reminderDateKey, hour, "59", timeZone, nowMs);

      return {
        disabled: !enabled,
        tooltip: enabled ? undefined : pastTooltip,
      };
    };
  }, [nowMs, pastTooltip, reminderDateKey, timeZone]);

  const getMinuteOptionState = useMemo(() => {
    return (minute: string): TimeOptionState => {
      const enabled = isReminderTimeFuture(reminderDateKey, draftHour, minute, timeZone, nowMs);

      return {
        disabled: !enabled,
        tooltip: enabled ? undefined : pastTooltip,
      };
    };
  }, [draftHour, nowMs, pastTooltip, reminderDateKey, timeZone]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextDraft = getDefaultDraft(reminderAt, timeZone);

    setDraftHour(nextDraft.hourValue);
    setDraftMinute(nextDraft.minuteValue);
    setOpenMenu(null);
    setValidationMessage(null);
    setNowMs(Date.now());
  }, [isOpen, reminderAt, timeZone]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, REMINDER_DIALOG_CLOCK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      hourButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openMenu) {
          setOpenMenu(null);
          return;
        }

        setValidationMessage(null);
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, openMenu]);

  const handleToggleOpen = () => {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  };

  const closeDialog = () => {
    setOpenMenu(null);
    setValidationMessage(null);
    setIsOpen(false);
  };

  const handleSave = async () => {
    const nextValue = buildReminderTimestamp(reminderDateKey, draftHour, draftMinute, timeZone);

    if (nextValue === null) {
      setValidationMessage(t.todos.reminderPastError);
      return;
    }

    if (!isFutureReminderTimestamp(nextValue)) {
      setValidationMessage(t.todos.reminderPastError);
      return;
    }

    setValidationMessage(null);
    onChange(nextValue);
    setIsOpen(false);

    try {
      const checkPermission = getFloatemBridge().checkNotificationPermission;
      const permission = checkPermission ? await checkPermission({ language }) : { allowed: false };
      setShowPermissionWarning(!permission.allowed && !document.querySelector("[data-guide-dialog]"));
    } catch {
      setShowPermissionWarning(!document.querySelector("[data-guide-dialog]"));
    }
  };

  const currentReminderLabel = reminderAt
    ? formatTimestampInTimeZone(reminderAt, timeZone, "dateTime", timeFormat)
    : t.todos.notScheduled;
  const draftReminderAt = buildReminderTimestamp(reminderDateKey, draftHour, draftMinute, timeZone);
  const draftReminderLabel =
    draftReminderAt === null
      ? t.todos.notScheduled
      : formatTimestampInTimeZone(draftReminderAt, timeZone, "dateTime", timeFormat);

  return (
    <>
      <motion.button
        type="button"
        aria-label={reminderAt ? t.todos.changeReminder : t.todos.setReminder}
        data-action="todo-reminder"
        data-tooltip={tooltip ?? displayValue ?? (reminderAt ? t.todos.changeReminder : t.todos.setReminder)}
        data-no-window-drag="true"
        className={`inline-flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border px-2.5 py-1.25 text-[10.5px] font-semibold shadow-[0_7px_14px_rgba(61,49,34,0.08)] ${className}`}
        whileHover={disabled ? undefined : { y: -1.5, scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          handleToggleOpen();
        }}
      >
        <Clock3Icon size={12} />
        {displayValue ? <span className="min-w-0 whitespace-nowrap">{displayValue}</span> : null}
      </motion.button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <motion.div
                  data-no-window-drag="true"
                  className="floatem-modal-backdrop fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-4 py-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeDialog}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.todos.dialogTitle}
                    className="paper-panel w-full max-w-[336px] rounded-[20px] p-3 shadow-[0_26px_48px_rgba(30,25,21,0.22)]"
                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="status-chip" data-tone="blue">
                          <Clock3Icon size={11} />
                          {t.todos.reminder}
                        </span>
                        <span className="sr-only">{todoTitle}</span>
                      </div>
                      <motion.button
                        type="button"
                        aria-label={t.common.close}
                        data-tooltip={t.common.close}
                        data-no-window-drag="true"
                        className="paper-icon-button inline-flex h-8 w-8 min-h-0 min-w-0 rounded-[11px]"
                        whileHover={{ y: -1.5, scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={closeDialog}
                      >
                        <XIcon size={14} />
                      </motion.button>
                    </div>

                    <form
                      className="flex flex-col gap-2.5"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleSave();
                      }}
                    >
                      <motion.div
                        className="rounded-[14px] border border-[rgba(47,107,255,0.14)] bg-[rgba(47,107,255,0.05)] px-2.5 py-2"
                        layout
                      >
                        <div className="flex items-baseline justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                          <span>{t.todos.currentReminder}</span>
                          <span>{t.todos.scheduledFor}</span>
                        </div>
                        <motion.div className="mt-1 grid grid-cols-2 gap-2">
                          <p className="truncate text-[11px] font-semibold text-[var(--brown-strong)]">
                            {currentReminderLabel}
                          </p>
                          <p className="truncate text-right font-display text-[15px] font-semibold tracking-[-0.03em] text-[var(--brown-strong)]">
                            {draftReminderLabel}
                          </p>
                        </motion.div>
                      </motion.div>

                      <motion.div className="grid grid-cols-2 gap-2" layout>
                        <ReminderTimeSelect
                          label={t.todos.hour}
                          value={draftHour}
                          options={hourOptions}
                          formatOption={(hour) => formatHourOption(Number(hour), timeFormat)}
                          getOptionState={getHourOptionState}
                          isOpen={openMenu === "hour"}
                          triggerRef={hourButtonRef}
                          onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "hour" : null)}
                          onChange={(hour) => {
                            setDraftHour(hour);
                            setValidationMessage(null);
                          }}
                        />
                        <ReminderTimeSelect
                          label={t.todos.minute}
                          value={draftMinute}
                          options={minuteOptions}
                          formatOption={(minute) => minute}
                          getOptionState={getMinuteOptionState}
                          isOpen={openMenu === "minute"}
                          onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "minute" : null)}
                          onChange={(minute) => {
                            setDraftMinute(minute);
                            setValidationMessage(null);
                          }}
                        />
                      </motion.div>

                      <motion.div className="grid grid-cols-2 gap-1.5" layout>
                        {quickOptions.map((option) => {
                          const isSelected =
                            !option.disabled && option.hourValue === draftHour && option.minuteValue === draftMinute;

                          return (
                            <motion.button
                              key={option.label}
                              type="button"
                              aria-disabled={option.disabled}
                              aria-pressed={isSelected}
                              data-guide-reminder={option.label === t.todos.morning ? "morning" : undefined}
                              data-tooltip={option.tooltip}
                              data-no-window-drag="true"
                              className={`rounded-[11px] border px-2 py-1.75 text-[10.5px] font-semibold ${
                                option.disabled
                                  ? "cursor-not-allowed border-[rgba(213,198,180,0.52)] bg-[rgba(30,25,21,0.04)] text-[rgba(30,25,21,0.32)]"
                                  : isSelected
                                    ? "border-[#E2A928] bg-[rgba(255,246,214,0.96)] text-[#76510B] shadow-[0_0_0_2px_rgba(226,169,40,0.32),0_8px_18px_rgba(226,169,40,0.16)]"
                                    : "border-[rgba(213,198,180,0.9)] bg-white/84 text-[var(--brown-strong)]"
                              }`}
                              whileHover={!option.disabled ? { y: -1, scale: 1.01 } : undefined}
                              whileTap={!option.disabled ? { scale: 0.98 } : undefined}
                              onClick={() => {
                                if (option.disabled) {
                                  return;
                                }

                                setDraftHour(option.hourValue);
                                setDraftMinute(option.minuteValue);
                                setValidationMessage(null);
                              }}
                            >
                              {option.displayLabel}
                            </motion.button>
                          );
                        })}
                      </motion.div>

                      {validationMessage ? (
                        <p className="text-[10.5px] font-medium leading-5 text-[#b64b2e]" role="alert">
                          {validationMessage}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <motion.button
                          type="button"
                          data-no-window-drag="true"
                          data-tooltip={t.common.clear}
                          className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                          whileHover={{ y: -1.5, scale: 1.01 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => {
                            setValidationMessage(null);
                            onChange(null);
                            setIsOpen(false);
                          }}
                        >
                          {t.common.clear}
                        </motion.button>

                        <motion.div className="flex items-center gap-2">
                          <motion.button
                            type="button"
                            data-no-window-drag="true"
                            data-tooltip={t.common.close}
                            className="paper-button inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--dark-text)]"
                            whileHover={{ y: -1.5, scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                            onClick={closeDialog}
                          >
                            {t.common.close}
                          </motion.button>
                          <motion.button
                            type="submit"
                            data-guide="reminder-save"
                            data-no-window-drag="true"
                            data-tooltip={t.common.save}
                            className="paper-button paper-button-primary inline-flex items-center justify-center rounded-[14px] px-3.5 py-2.5 text-[12px] font-semibold"
                            whileHover={{ y: -1.5, scale: 1.01 }}
                            whileTap={{ scale: 0.985 }}
                          >
                            {t.common.save}
                          </motion.button>
                        </motion.div>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {showPermissionWarning ? (
                <motion.div
                  className="floatem-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(30,25,21,0.24)] px-4 py-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowPermissionWarning(false)}
                >
                  <motion.div
                    role="alertdialog"
                    aria-modal="true"
                    aria-label={t.todos.notificationPermissionTitle}
                    className="paper-panel w-full max-w-[336px] rounded-[20px] p-4 shadow-[0_26px_48px_rgba(30,25,21,0.22)]"
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 6 }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <h3 className="font-display text-[17px] font-semibold text-[var(--dark-text)]">
                      {t.todos.notificationPermissionTitle}
                    </h3>
                    <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
                      {t.todos.notificationPermissionBody}
                    </p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        className="paper-button rounded-[13px] px-3.5 py-2 text-[12px] font-semibold"
                        onClick={() => setShowPermissionWarning(false)}
                      >
                        {t.common.close}
                      </button>
                      <button
                        type="button"
                        className="paper-button rounded-[13px] px-3.5 py-2 text-[12px] font-semibold text-[var(--accent-cobalt)]"
                        onClick={() => {
                          void getFloatemBridge().openNotificationSettings();
                          setShowPermissionWarning(false);
                        }}
                      >
                        {t.todos.notificationPermissionOpenSettings}
                      </button>
                    </div>
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
