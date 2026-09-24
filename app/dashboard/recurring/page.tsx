"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import TimeField from "@/components/pickers/TimeField";
import MinutesField from "@/components/pickers/MinutesField";

type Recurring = {
  id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  color: string;
  remind_minutes_before: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PALETTE = ["#6B4EFF", "#FF8A5B", "#FFC94D", "#5AA9A3", "#B5715A"];
const HOUR_H = 56; // px per hour in the grid below

function toMinutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export default function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  // Pulled from Settings > "Default nudge lead time" and used to prefill
  // new items below. Falls back to 15 if the user has no saved settings row
  // yet — matches the recurring_events.remind_minutes_before column default.
  const [defaultRemind, setDefaultRemind] = useState(15);
  const [remind, setRemind] = useState(15);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [{ data }, { data: settings }] = await Promise.all([
      supabase.from("recurring_events").select("*").order("day_of_week").order("start_time"),
      user
        ? supabase.from("user_settings").select("default_reminder_minutes").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setItems((data as Recurring[]) ?? []);
    const fallback = settings?.default_reminder_minutes ?? 15;
    setDefaultRemind(fallback);
    setRemind(fallback);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDay("1");
    setStart("09:00");
    setEnd("10:00");
    setRemind(defaultRemind);
  }

  function startEdit(item: Recurring) {
    setEditingId(item.id);
    setTitle(item.title);
    setDay(String(item.day_of_week));
    setStart(item.start_time.slice(0, 5));
    setEnd(item.end_time.slice(0, 5));
    setRemind(item.remind_minutes_before);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingId) {
      await supabase
        .from("recurring_events")
        .update({ title, day_of_week: Number(day), start_time: start, end_time: end, remind_minutes_before: remind })
        .eq("id", editingId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const color = PALETTE[items.length % PALETTE.length];
      await supabase.from("recurring_events").insert({
        user_id: user.id,
        title,
        day_of_week: Number(day),
        start_time: start,
        end_time: end,
        color,
        remind_minutes_before: remind,
      });
    }
    resetForm();
    load();
  }

  async function removeItem(id: string) {
    if (editingId === id) resetForm();
    await supabase.from("recurring_events").delete().eq("id", id);
    load();
  }

  // The grid always covers a sane school/work day (6am-10pm) but stretches
  // to fit anything earlier or later than that, so a 5am shift or an 11pm
  // class still shows up instead of getting clipped off the top/bottom.
  const { rangeStartMin, totalHours } = useMemo(() => {
    let earliest = 6 * 60;
    let latest = 22 * 60;
    items.forEach((it) => {
      earliest = Math.min(earliest, toMinutes(it.start_time));
      latest = Math.max(latest, toMinutes(it.end_time));
    });
    const startHour = Math.floor(earliest / 60);
    const endHour = Math.ceil(latest / 60);
    return { rangeStartMin: startHour * 60, totalHours: Math.max(1, endHour - startHour) };
  }, [items]);

  const hourMarks = Array.from({ length: totalHours + 1 }, (_, i) => rangeStartMin / 60 + i);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-cream">What repeats</h1>
      <p className="mt-1 text-sm text-cream/60">Classes, shifts, gym days — set them up once.</p>

      <form onSubmit={submit} className="surface mt-6 px-5 py-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-cream/50 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="CS 301, Warehouse shift…"
            className="field"
          />
        </div>
        <div>
          <label className="block text-xs text-cream/50 mb-1">Day</label>
          <select value={day} onChange={(e) => setDay(e.target.value)} className="field">
            {DAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <TimeField label="Start" value={start} onChange={setStart} />
        <TimeField label="End" value={end} onChange={setEnd} />
        <MinutesField label="Remind" value={remind} onChange={setRemind} />
        <button type="submit" className="btn-solid">
          {editingId ? "Save changes" : "Add"}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="btn-ghost">
            Cancel
          </button>
        )}
      </form>

      {loading ? (
        <p className="mt-8 text-sm text-cream/60">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-cream/60">Nothing set up yet — add your first recurring block above.</p>
      ) : (
        <div className="surface mt-8 px-4 py-4 overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Day headers */}
            <div className="grid pl-12" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-cream/50 pb-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Time grid: a time-label rail + 7 day columns, each an absolute
                canvas that event blocks are positioned into by start/duration. */}
            <div className="flex">
              <div className="w-12 shrink-0 relative" style={{ height: totalHours * HOUR_H }}>
                {hourMarks.map((h) => (
                  <div
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[10px] text-cream/35 tabular-nums"
                    style={{ top: (h - rangeStartMin / 60) * HOUR_H }}
                  >
                    {((h % 24) === 0 ? 12 : h % 24 > 12 ? h % 24 - 12 : h % 24)}
                    {h % 24 >= 12 ? "p" : "a"}
                  </div>
                ))}
              </div>

              <div
                className="flex-1 grid relative"
                style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", height: totalHours * HOUR_H }}
              >
                {/* hour gridlines, spanning all columns */}
                {hourMarks.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-cream/[0.06]"
                    style={{ top: (h - rangeStartMin / 60) * HOUR_H }}
                  />
                ))}

                {DAYS.map((_, dayIdx) => (
                  <div key={dayIdx} className="relative border-l border-cream/[0.06] first:border-l-0">
                    {items
                      .filter((it) => it.day_of_week === dayIdx)
                      .map((it) => {
                        const top = ((toMinutes(it.start_time) - rangeStartMin) / 60) * HOUR_H;
                        const height = Math.max(
                          20,
                          ((toMinutes(it.end_time) - toMinutes(it.start_time)) / 60) * HOUR_H
                        );
                        const isEditing = editingId === it.id;
                        return (
                          <button
                            key={it.id}
                            onClick={() => startEdit(it)}
                            className={`group absolute left-0.5 right-0.5 rounded-lg text-left px-2 py-1 overflow-hidden transition ${
                              isEditing ? "ring-2 ring-marigold" : "hover:brightness-110"
                            }`}
                            style={{ top, height, background: `${it.color}30`, borderLeft: `3px solid ${it.color}` }}
                          >
                            <p className="text-[11px] font-semibold text-cream truncate leading-tight">{it.title}</p>
                            {height > 34 && (
                              <p className="text-[10px] text-cream/50 tabular-nums leading-tight">
                                {it.start_time.slice(0, 5)}–{it.end_time.slice(0, 5)}
                              </p>
                            )}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                removeItem(it.id);
                              }}
                              className="absolute top-0.5 right-1 text-[10px] text-cream/0 group-hover:text-cream/50 hover:!text-coral transition"
                            >
                              ✕
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
