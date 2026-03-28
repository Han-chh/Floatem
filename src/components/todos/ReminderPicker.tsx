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
        className="surface-field w-full min-w-0 rounded-[18px] px-3 py-3 text-[11px] font-medium text-[var(--dark-text)] outline-none"
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
