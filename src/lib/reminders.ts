export function buildReminderTimestamp(dateValue: string, hourValue: string, minuteValue: string) {
  if (!dateValue || !hourValue || !minuteValue) {
    return null;
  }

  const nextValue = new Date(`${dateValue}T${hourValue}:${minuteValue}:00`);
  return Number.isNaN(nextValue.getTime()) ? null : nextValue.getTime();
}

export function isFutureReminderTimestamp(timestamp: number | null, now = Date.now()) {
  return timestamp === null || timestamp > now;
}
