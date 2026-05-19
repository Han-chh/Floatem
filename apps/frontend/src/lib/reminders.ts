import { getSystemTimeZone } from "./models";
import { buildTimestampInTimeZone } from "./timeZoneDate";

export function buildReminderTimestamp(
  dateValue: string,
  hourValue: string,
  minuteValue: string,
  timeZone = getSystemTimeZone(),
) {
  if (!dateValue || !hourValue || !minuteValue) {
    return null;
  }

  return buildTimestampInTimeZone(dateValue, hourValue, minuteValue, timeZone);
}

export function isFutureReminderTimestamp(timestamp: number | null, now = Date.now()) {
  return timestamp === null || timestamp > now;
}

export function isReminderTimeFuture(
  dateValue: string,
  hourValue: string,
  minuteValue: string,
  timeZone = getSystemTimeZone(),
  now = Date.now(),
) {
  const timestamp = buildReminderTimestamp(dateValue, hourValue, minuteValue, timeZone);
  return timestamp !== null && timestamp > now;
}
