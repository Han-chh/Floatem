import { format } from "date-fns";

type ReminderPickerProps = {
  reminderAt: number | null;
  onChange: (nextValue: number | null) => void;
};

export function ReminderPicker({ reminderAt, onChange }: ReminderPickerProps) {
  return (
    <label className="block">
      <span className="sr-only">Reminder time</span>
      <input
        type="datetime-local"
        value={reminderAt ? format(new Date(reminderAt), "yyyy-MM-dd'T'HH:mm") : ""}
        className="w-full rounded-[16px] border border-[var(--border)] bg-[rgba(255,255,255,0.68)] px-3 py-2 text-[11px] font-medium text-[var(--dark-text)] outline-none"
        onChange={(event) => {
          const nextValue = event.currentTarget.value
            ? new Date(event.currentTarget.value).getTime()
            : null;
          onChange(nextValue);
        }}
      />
    </label>
  );
}
