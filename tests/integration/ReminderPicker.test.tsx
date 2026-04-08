import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReminderPicker } from "../../src/components/todos/ReminderPicker";

describe("ReminderPicker", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("rejects reminder times earlier than now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));
    const onChange = vi.fn();

    render(<ReminderPicker todoTitle="Ship alpha" reminderAt={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Set reminder" }));
    expect(screen.getByRole("dialog", { name: "Set todo reminder" })).toBeInTheDocument();
    expect(screen.getByText("Ship alpha")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Month"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Hour"), {
      target: { value: "11" },
    });
    fireEvent.change(screen.getByLabelText("Minute"), {
      target: { value: "55" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Reminder time must be later than the current time.")).toBeInTheDocument();
  });

  it("saves a future reminder from the dialog", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));
    const onChange = vi.fn();

    render(<ReminderPicker todoTitle="Ship beta" reminderAt={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Set reminder" }));

    fireEvent.click(screen.getByRole("button", { name: "6" }));
    fireEvent.change(screen.getByLabelText("Hour"), {
      target: { value: "09" },
    });
    fireEvent.change(screen.getByLabelText("Minute"), {
      target: { value: "30" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledWith(new Date("2026-04-06T09:30:00").getTime());
  });

  it("uses tomorrow as a date-only shortcut and prompts for time selection", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-05T12:00:00"));

    render(<ReminderPicker todoTitle="Ship gamma" reminderAt={null} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set reminder" }));

    expect(screen.getByRole("button", { name: "Tomorrow" })).toBeInTheDocument();
    expect(screen.queryByText("Tomorrow 09:00")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));

    expect(screen.getByText("Tomorrow selected. Choose the hour and minute below.")).toBeInTheDocument();
  });

  it("shows a close button, specific time controls, and quick shortcut buttons", async () => {
    render(<ReminderPicker todoTitle="Ship delta" reminderAt={null} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set reminder" }));

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    expect(closeButtons.length).toBeGreaterThan(0);
    expect(screen.getByText("Specific time")).toBeInTheDocument();
    expect(screen.getByText("Quick shortcuts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In 1h" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tonight" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tomorrow" })).toBeInTheDocument();

    fireEvent.click(closeButtons[0]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Set todo reminder" })).not.toBeVisible();
    });
  });
});
