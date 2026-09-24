"use client";

import { useState } from "react";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DateField({
  label,
  value, // "YYYY-MM-DD"
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = value ? new Date(value + "T00:00") : new Date();
    d.setDate(1);
    return d;
  });

  const selectedDate = value ? new Date(value + "T00:00") : null;
  const todayISO = toISO(new Date());

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const leadBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(leadBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "Pick a date";

  return (
    <div>
      <label className="block text-xs text-cream/50 mb-1">{label}</label>
      <button type="button" onClick={() => setOpen(true)} className="field text-left whitespace-nowrap">
        {displayValue}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="surface w-full sm:w-80 rounded-t-3xl sm:rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="btn-ghost px-3 py-1.5"
              >
                ←
              </button>
              <p className="font-display font-bold text-cream text-sm">
                {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="btn-ghost px-3 py-1.5"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mt-4">
              {DAY_LABELS.map((l, i) => (
                <div key={i} className="text-center text-[10px] font-semibold text-cream/35 pb-1">
                  {l}
                </div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const iso = toISO(d);
                const isSelected = iso === value;
                const isToday = iso === todayISO;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                    className={`aspect-square rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? "bg-marigold text-ink"
                        : isToday
                        ? "text-marigold ring-1 ring-marigold/40"
                        : "text-cream/70 hover:bg-ink-soft"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                onChange(todayISO);
                setOpen(false);
              }}
              className="btn-ghost w-full mt-4 text-sm"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
