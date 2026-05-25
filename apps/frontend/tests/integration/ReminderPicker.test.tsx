import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReminderPicker } from "../../src/components/todos/ReminderPicker";

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Set reminder" }));
}

function selectListboxOption(listboxName: string, label: string) {
  fireEvent.click(screen.getByRole("button", { name: listboxName }));
  const listbox = screen.getByRole("listbox", { name: listboxName });
  const options = within(listbox).getAllByRole("option", { name: label });
  const target = options.find((option) => option.getAttribute("aria-disabled") !== "true") ?? options[0];

  fireEvent.click(target!);
}

function selectHour(label: string) {
  selectListboxOption("Hour", label);
}

function selectMinute(label: string) {
  selectListboxOption("Minute", label);
}

describe("ReminderPicker", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects reminder times earlier than now after the dialog clock advances", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T11:59:00"));
    const onChange = vi.fn();

    render(<ReminderPicker todoTitle="Ship alpha" reminderAt={null} onChange={onChange} />);

    openDialog();
    selectHour("12");
    selectMinute("00");

    vi.setSystemTime(new Date("2026-04-05T12:01:00"));
    vi.advanceTimersByTime(31_000);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Reminder time must be later than the current time.")).toBeInTheDocument();
  });

  it("saves a future reminder from the dialog", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));
    const onChange = vi.fn();

    render(<ReminderPicker todoTitle="Ship beta" todoDateKey="2026-04-06" reminderAt={null} onChange={onChange} />);

    openDialog();

    selectHour("09");
    selectMinute("30");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledWith(new Date("2026-04-06T09:30:00").getTime());
  });

  it("interprets selected reminder time in the configured timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
    const onChange = vi.fn();

    render(
      <ReminderPicker
        todoTitle="Ship timezone"
        todoDateKey="2026-04-06"
        reminderAt={null}
        onChange={onChange}
        timeZone="America/New_York"
      />,
    );

    openDialog();
    selectHour("09");
    selectMinute("30");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledWith(Date.UTC(2026, 3, 6, 13, 30));
  });

  it("uses 12-hour labels when configured", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));

    render(<ReminderPicker todoTitle="Ship clock" reminderAt={null} onChange={vi.fn()} timeFormat="12h" />);

    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Hour" }));
    expect(screen.getByRole("option", { name: "9 AM" })).toBeInTheDocument();
    expect(screen.getByText(/12:15 PM/)).toBeInTheDocument();
  });

  it("uses quick shortcuts to fill valid reminder times on the todo date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));
    const onChange = vi.fn();

    render(<ReminderPicker todoTitle="Ship gamma" reminderAt={null} onChange={onChange} />);

    openDialog();

    fireEvent.click(screen.getByRole("button", { name: "In 30m" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledWith(new Date("2026-04-05T12:30:00").getTime());
  });

  it("highlights the quick shortcut that matches the custom time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));

    render(<ReminderPicker todoTitle="Ship highlight" reminderAt={null} onChange={vi.fn()} />);

    openDialog();

    const thirtyMinuteShortcut = screen.getByRole("button", { name: "In 30m" });
    const oneHourShortcut = screen.getByRole("button", { name: "In 1h" });

    expect(thirtyMinuteShortcut).toHaveAttribute("aria-pressed", "false");
    expect(oneHourShortcut).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(thirtyMinuteShortcut);

    expect(thirtyMinuteShortcut).toHaveAttribute("aria-pressed", "true");
    expect(oneHourShortcut).toHaveAttribute("aria-pressed", "false");

    selectHour("13");
    selectMinute("00");

    expect(thirtyMinuteShortcut).toHaveAttribute("aria-pressed", "false");
    expect(oneHourShortcut).toHaveAttribute("aria-pressed", "true");

    selectMinute("15");

    expect(thirtyMinuteShortcut).toHaveAttribute("aria-pressed", "false");
    expect(oneHourShortcut).toHaveAttribute("aria-pressed", "false");
  });

  it("disables past hour options in the dropdown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));

    render(<ReminderPicker todoTitle="Ship past hour" reminderAt={null} onChange={vi.fn()} />);

    openDialog();
    selectMinute("30");
    fireEvent.click(screen.getByRole("button", { name: "Hour" }));

    const hourListbox = screen.getByRole("listbox", { name: "Hour" });

    expect(within(hourListbox).getByRole("option", { name: "11" })).toHaveAttribute("aria-disabled", "true");
    expect(within(hourListbox).getByRole("option", { name: "13" })).toHaveAttribute("aria-disabled", "false");
  });

  it("does not expose calendar controls in the reminder dialog", () => {
    render(<ReminderPicker todoTitle="Ship calendar-free" reminderAt={null} onChange={vi.fn()} />);

    openDialog();

    expect(screen.queryByLabelText("Month")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Year")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tomorrow" })).not.toBeInTheDocument();
  });

  it("shows close button, time controls, and quick shortcut buttons", async () => {
    render(<ReminderPicker todoTitle="Ship delta" reminderAt={null} onChange={vi.fn()} />);

    openDialog();

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    expect(closeButtons.length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Hour" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Minute" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In 30m" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In 1h" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "In 2h" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Afternoon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tonight" })).toBeInTheDocument();

    fireEvent.click(closeButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Set todo reminder" })).not.toBeVisible();
    });
  });
});
