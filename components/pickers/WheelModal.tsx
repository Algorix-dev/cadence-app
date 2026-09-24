"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string | number; label: string };

const ROW_H = 44;
const VISIBLE_ROWS = 5;
const PAD = Math.floor(VISIBLE_ROWS / 2) * ROW_H;

/**
 * A modern "scroll to pick" wheel: full-screen darkened backdrop, a snap-
 * scrolling column of options with the current pick held under a fixed
 * center window. Used for time-of-day and reminder-lead-time pickers —
 * see TimeField / MinutesField below, which just feed it different option
 * lists and a formatter for the trigger button's label.
 */
export default function WheelModal({
  open,
  onClose,
  options,
  value,
  onChange,
  title,
}: {
  open: boolean;
  onClose: () => void;
  options: Option[];
  value: string | number;
  onChange: (v: string | number) => void;
  title: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(value);

  useEffect(() => {
    if (!open) return;
    setHighlighted(value);
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: idx * ROW_H, behavior: "auto" });
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ROW_H);
    const clamped = Math.min(options.length - 1, Math.max(0, idx));
    setHighlighted(options[clamped]?.value);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="surface w-full sm:w-80 rounded-t-3xl sm:rounded-3xl pb-5 pt-4 px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-xs font-semibold text-cream/50 mb-2">{title}</p>

        <div className="relative" style={{ height: ROW_H * VISIBLE_ROWS }}>
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 border-y border-marigold/40 bg-marigold/5"
            style={{ height: ROW_H }}
          />
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto no-scrollbar"
            style={{ scrollSnapType: "y mandatory", paddingTop: PAD, paddingBottom: PAD }}
          >
            {options.map((o) => (
              <div
                key={o.value}
                onClick={() => {
                  const idx = options.findIndex((opt) => opt.value === o.value);
                  listRef.current?.scrollTo({ top: idx * ROW_H, behavior: "smooth" });
                }}
                className={`flex items-center justify-center font-display transition-colors cursor-pointer ${
                  o.value === highlighted ? "text-cream text-lg font-bold" : "text-cream/35 text-base"
                }`}
                style={{ height: ROW_H, scrollSnapAlign: "center" }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onChange(highlighted);
            onClose();
          }}
          className="btn-solid w-full mt-4"
        >
          Done
        </button>
      </div>
    </div>
  );
}
