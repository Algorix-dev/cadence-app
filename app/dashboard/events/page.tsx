"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
        <div>
          <label className="block text-xs text-cream/50 mb-1">Start</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="field" />
        </div>
        <div>
          <label className="block text-xs text-cream/50 mb-1">End</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="field" />
        </div>
        <div>
          <label className="block text-xs text-cream/50 mb-1">Remind me (min before)</label>
          <input
            type="number"
            min={0}
            value={remind}
            onChange={(e) => setRemind(Number(e.target.value))}
            className="field w-24"
          />
        </div>
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {DAYS.map((d, i) => {
            const dayItems = items.filter((it) => it.day_of_week === i);
            if (dayItems.length === 0) return null;
            return (
              <div key={i}>
                <h2 className="text-sm font-semibold text-cream/70">{d}</h2>
                <ul className="mt-2 space-y-2">
                  {dayItems.map((it) => (
                    <li
                      key={it.id}
                      className={`flex items-center justify-between rounded-xl bg-ink-soft/60 border px-3.5 py-2.5 transition hover:border-marigold/30 ${
                        editingId === it.id ? "border-marigold/50" : "border-cream/10"
                      }`}
                    >
                      <span className="flex items-center gap-2.5 text-sm text-cream">
                        <span className="w-2 h-2 rounded-full" style={{ background: it.color }} />
                        {it.title}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-cream/50 tabular-nums">
                          {it.start_time.slice(0, 5)}–{it.end_time.slice(0, 5)}
                        </span>
                        <span className="text-xs text-cream/35 tabular-nums">–{it.remind_minutes_before}m</span>
                        <button onClick={() => startEdit(it)} className="text-xs text-cream/40 hover:text-marigold transition">
                          Edit
                        </button>
                        <button onClick={() => removeItem(it.id)} className="text-xs text-cream/40 hover:text-coral transition">
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
