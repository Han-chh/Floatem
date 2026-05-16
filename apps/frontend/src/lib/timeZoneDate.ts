import { getSystemTimeZone, isValidTimeZone, type TimeFormat } from "./models";

export type DateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

export type DateTimeParts = DateParts & {
  hour: number;
  minute: number;
  second: number;
};

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

export function formatHourOption(hour: number, timeFormat: TimeFormat) {
  if (timeFormat === "24h") {
    return pad(hour);
  }

  const hour12 = hour % 12 || 12;
  return `${hour12} ${hour < 12 ? "AM" : "PM"}`;
}

function formatClock(hour: number, minute: number, timeFormat: TimeFormat) {
  if (timeFormat === "24h") {
    return `${pad(hour)}:${pad(minute)}`;
  }

  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}

function resolveTimeZone(timeZone: string) {
  return isValidTimeZone(timeZone) ? timeZone : getSystemTimeZone();
}

function wallClockUtcMs(parts: DateTimeParts) {
  return Date.UTC(parts.year, parts.monthIndex, parts.day, parts.hour, parts.minute, parts.second, 0);
}

export function buildDateKey(parts: DateParts) {
  return `${parts.year}-${pad(parts.monthIndex + 1)}-${pad(parts.day)}`;
}

export function parseDateKey(dateKey: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
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
  return day >= 1 && day <= daysInMonth ? { year, monthIndex, day } : null;
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function addDaysToDateKey(dateKey: string, amount: number) {
  const parts = parseDateKey(dateKey) ?? getDatePartsInTimeZone(new Date(), getSystemTimeZone());
  const date = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day + amount));
  return buildDateKey({
    year: date.getUTCFullYear(),
    monthIndex: date.getUTCMonth(),
    day: date.getUTCDate(),
  });
}

export function dateKeyToPlainDate(dateKey: string) {
  const parts = parseDateKey(dateKey) ?? getDatePartsInTimeZone(new Date(), getSystemTimeZone());
  return new Date(parts.year, parts.monthIndex, parts.day);
}

export function getDateTimePartsInTimeZone(date: Date, timeZone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: resolveTimeZone(timeZone),
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    monthIndex: Number(parts.month) - 1,
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const { year, monthIndex, day } = getDateTimePartsInTimeZone(date, timeZone);
  return { year, monthIndex, day };
}

export function formatDateKeyInTimeZone(date: Date, timeZone: string) {
  return buildDateKey(getDatePartsInTimeZone(date, timeZone));
}

export function buildTimestampInTimeZone(
  dateValue: string,
  hourValue: string,
  minuteValue: string,
  timeZone: string,
) {
  const dateParts = parseDateKey(dateValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (!dateParts || !Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const desired: DateTimeParts = {
    ...dateParts,
    hour,
    minute,
    second: 0,
  };
  let timestamp = wallClockUtcMs(desired);

  for (let index = 0; index < 4; index += 1) {
    const actual = getDateTimePartsInTimeZone(new Date(timestamp), timeZone);
    const diff = wallClockUtcMs(desired) - wallClockUtcMs(actual);

    if (diff === 0) {
      return timestamp;
    }

    timestamp += diff;
  }

  const resolved = getDateTimePartsInTimeZone(new Date(timestamp), timeZone);
  return resolved.year === desired.year &&
    resolved.monthIndex === desired.monthIndex &&
    resolved.day === desired.day &&
    resolved.hour === desired.hour &&
    resolved.minute === desired.minute
    ? timestamp
    : null;
}

export function formatTimeInTimeZone(date: Date, timeZone: string, timeFormat: TimeFormat) {
  const parts = getDateTimePartsInTimeZone(date, timeZone);
  return formatClock(parts.hour, parts.minute, timeFormat);
}

export function formatDateKeyLong(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
  }).format(dateKeyToUtcDate(dateKey));
}

export function formatDateKeyMonthYear(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(dateKeyToUtcDate(dateKey));
}

export function formatTimestampInTimeZone(
  timestamp: number,
  timeZone: string,
  pattern: "dateTime" | "compact" | "time",
  timeFormat: TimeFormat,
) {
  const parts = getDateTimePartsInTimeZone(new Date(timestamp), timeZone);
  const clock = formatClock(parts.hour, parts.minute, timeFormat);

  if (pattern === "time") {
    return clock;
  }

  if (pattern === "compact") {
    return `${parts.monthIndex + 1}/${parts.day} ${clock}`;
  }

  return `${parts.year}/${pad(parts.monthIndex + 1)}/${pad(parts.day)} ${clock}`;
}

export function dateKeyToUtcDate(dateKey: string) {
  const parts = parseDateKey(dateKey) ?? getDatePartsInTimeZone(new Date(), getSystemTimeZone());
  return new Date(Date.UTC(parts.year, parts.monthIndex, parts.day));
}
