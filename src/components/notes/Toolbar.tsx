const TOOL_ITEMS = ["B", "I", "U", "Color", "Brush", "Image", "Clear"];

export function Toolbar() {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--sand)] p-2">
      {TOOL_ITEMS.map((item) => (
        <button
          key={item}
          type="button"
          className="rounded-[8px] border border-[var(--border)] bg-[var(--cream)] px-2.5 py-1 text-[11px] font-medium text-[var(--dark-text)]"
        >
          {item}
        </button>
      ))}
    </div>
  );
}
