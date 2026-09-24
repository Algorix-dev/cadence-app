"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Recurring = { id: string; title: string; day_of_week: number; start_time: string; color: string };
type Task = { id: string; title: string; due_date: string; due_time: string | null; done: boolean };
type OneOffEvent = { id: string; title: string; event_date: string; start_time: string | null; status: "planning" | "confirmed" };

type Item =
  | { kind: "recurring"; id: string; title: string; time: string; color: string }
  | { kind: "task"; id: string; title: string; time: string; done: boolean }
  | { kind: "event"; id: string; title: string; time: string; status: "planning" | "confirmed" };

const DAY_LABELS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS_SHOWN = 4; // 4x7 = 28 days, keeps each cell big enough to read on one screen

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function todayISO() {
  return toISODate(new Date());
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarPage() {
  // Unlike a traditional month grid, this window always starts on today —
  // "windowStart" shifts by 28-day blocks via the arrows, but jumps straight
  // back to today (and today lands back in the top-left cell) on "Today".
  const [windowStart, setWindowStart] = useState(startOfToday());
  const [selected, setSelected] = useState(todayISO());
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<OneOffEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const gridDays = useMemo(
    () => Array.from({ length: WEEKS_SHOWN * 7 }, (_, i) => {
      const d = new Date(windowStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [windowStart]
  );

  useEffect(() => {
    async function load() {
      const rangeStart = toISODate(gridDays[0]);
      const rangeEnd = toISODate(gridDays[gridDays.length - 1]);

      const [{ data: r }, { data: t }, { data: e }] = await Promise.all([
        supabase.from("recurring_events").select("id,title,day_of_week,start_time,color"),
        supabase.from("tasks").select("id,title,due_date,due_time,done").gte("due_date", rangeStart).lte("due_date", rangeEnd),
        supabase
          .from("events")
          .select("id,title,event_date,start_time,status")
          .gte("event_date", rangeStart)
          .lte("event_date", rangeEnd),
      ]);

      setRecurring((r as Recurring[]) ?? []);
      setTasks((t as Task[]) ?? []);
      setEvents((e as OneOffEvent[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowStart.getTime()]);

  function itemsFor(iso: string, dow: number): Item[] {
    const dayRecurring: Item[] = recurring
      .filter((r) => r.day_of_week === dow)
      .map((r) => ({ kind: "recurring", id: r.id, title: r.title, time: r.start_time, color: r.color }));
    const dayTasks: Item[] = tasks
      .filter((t) => t.due_date === iso)
      .map((t) => ({ kind: "task", id: t.id, title: t.title, time: t.due_time ?? "", done: t.done }));
    const dayEvents: Item[] = events
      .filter((e) => e.event_date === iso)
      .map((e) => ({ kind: "event", id: e.id, title: e.title, time: e.start_time ?? "", status: e.status }));
    return [...dayRecurring, ...dayTasks, ...dayEvents].sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"));
  }

  const today = todayISO();
  const selectedDate = new Date(selected + "T00:00");
  const selectedItems = itemsFor(selected, selectedDate.getDay());
  const rangeLabel = `${gridDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${gridDays[
    gridDays.length - 1
  ].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-cream">Calendar</h1>
          <p className="mt-1 text-sm text-cream/60">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowStart((c) => { const d = new Date(c); d.setDate(d.getDate() - WEEKS_SHOWN * 7); return d; })}
            className="btn-ghost px-3 py-1.5"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            onClick={() => {
              const d = startOfToday();
              setWindowStart(d);
              setSelected(todayISO());
            }}
            className="btn-ghost px-3 py-1.5"
          >
            Today
          </button>
          <button
            onClick={() => setWindowStart((c) => { const d = new Date(c); d.setDate(d.getDate() + WEEKS_SHOWN * 7); return d; })}
            className="btn-ghost px-3 py-1.5"
            aria-label="Next"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-cream/60">Loading…</p>
      ) : (
        <>
          {/* Selected day's agenda — sits above the grid so it's the first
              thing you read, not something you have to scroll down for. */}
          <div className="surface mt-5 px-5 py-4 shrink-0">
            <h2 className="text-sm font-semibold text-cream/80">
              {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              {selected === today ? <span className="ml-2 text-xs text-marigold font-normal">Today</span> : null}
            </h2>
            {selectedItems.length === 0 ? (
              <p className="mt-2.5 text-sm text-cream/40">Nothing on the books.</p>
            ) : (
              <ul className="mt-2.5 space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {selectedItems.map((it) => (
                  <li key={`${it.kind}-${it.id}`} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: it.kind === "recurring" ? it.color : it.kind === "task" ? "#FFC94D" : "#FF8A5B" }}
                    />
                    {it.time && <span className="tabular-nums text-cream/40 shrink-0">{it.time.slice(0, 5)}</span>}
                    <span className={it.kind === "task" && it.done ? "text-cream/30 line-through" : "text-cream/85"}>
                      {it.title}
                    </span>
                    {it.kind === "event" && (
                      <span
                        className={`ml-auto text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                          it.status === "confirmed" ? "bg-[#5AA9A3]/15 text-[#5AA9A3]" : "bg-marigold/15 text-marigold"
                        }`}
                      >
                        {it.status === "confirmed" ? "Confirmed" : "Planning"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Grid: cell 1 (top-left) is always today (or the first day of
              the window, once you've navigated away from the present). */}
          <div className="mt-5 grid grid-cols-7 gap-1.5 flex-1 min-h-0">
            {gridDays.map((d) => {
              const iso = toISODate(d);
              const isToday = iso === today;
              const isSelected = iso === selected;
              const items = itemsFor(iso, d.getDay());
              const dow = d.getDay();

              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`surface p-1.5 flex flex-col items-start text-left transition min-h-[64px] ${
                    isSelected ? "!border-marigold/50 !bg-ink-soft" : ""
                  } ${isToday ? "ring-1 ring-marigold/40" : ""}`}
                >
                  <span className="text-[9px] font-semibold text-cream/35 uppercase">{DAY_LABELS_SUN[dow]}</span>
                  <span className={`font-display text-xs font-bold ${isToday ? "text-marigold" : "text-cream/75"}`}>
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="mt-auto flex flex-wrap gap-0.5 pt-1">
                    {items.slice(0, 4).map((it) => (
                      <span
                        key={`${it.kind}-${it.id}`}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: it.kind === "recurring" ? it.color : it.kind === "task" ? "#FFC94D" : "#FF8A5B" }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
