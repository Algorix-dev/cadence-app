"use client";

import { useState } from "react";
import WheelModal from "./WheelModal";

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240].map((m) => ({
  value: m,
  label: m === 0 ? "At the time" : m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ` ${m % 60}m` : ""}`,
}));

export default function MinutesField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = MINUTE_OPTIONS.find((o) => o.value === value);
  return (
    <div>
      <label className="block text-xs text-cream/50 mb-1">{label}</label>
      <button type="button" onClick={() => setOpen(true)} className="field w-28 text-left">
        {current ? current.label : `${value} min`}
      </button>
      <WheelModal
        open={open}
        onClose={() => setOpen(false)}
        options={MINUTE_OPTIONS}
        value={value}
        onChange={(v) => onChange(Number(v))}
        title={label}
      />
    </div>
  );
}
