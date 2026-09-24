"use client";

import { useState } from "react";
import WheelModal from "./WheelModal";

// Every time in the app in 5-minute steps, 24-hour "HH:MM" — scrollable,
// so "23:50" is as reachable as "09:00".
const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, i) => {
  const h = Math.floor(i / 12);
  const m = (i % 12) * 5;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { value, label: value };
});

export default function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "HH:MM"
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="block text-xs text-cream/50 mb-1">{label}</label>
      <button type="button" onClick={() => setOpen(true)} className="field w-24 text-left tabular-nums">
        {value || "--:--"}
      </button>
      <WheelModal
        open={open}
        onClose={() => setOpen(false)}
        options={TIME_OPTIONS}
        value={value}
        onChange={(v) => onChange(String(v))}
        title={label}
      />
    </div>
  );
}
