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

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function todayISO() {
  return toISODate(new Date());
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState(todayISO());
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(1); // Monday, matches the schema default
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<OneOffEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // The grid always shows full weeks, so it can span into the previous/next
  // month's days too — widen the query range to cover those, not just [1, last day].
  const gridStart = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = weekStartsOn === 1 ? (first.getDay() + 6) % 7 : first.getDay();
    const d = new Date(first);
    d.setDate(d.getDate() - lead);
    return d;
  }, [cursor, weekStartsOn]);

  const gridDays = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [gridStart]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const rangeStart = toISODate(gridDays[0]);
      const rangeEnd = toISODate(gridDays[41]);

      const [{ data: r }, { data: t }, { data: e }, { data: settings }] = await Promise.all([
        supabase.from("recurring_events").select("id,title,day_of_week,start_time,color"),
        supabase.from("tasks").select("id,title,due_date,due_time,done").gte("due_date", rangeStart).lte("due_date", rangeEnd),
        supabase
          .from("events")
          .select("id,title,event_date,start_time,status")
          .gte("event_date", rangeStart)
          .lte("event_date", rangeEnd),
        user ? supabase.from("user_settings").select("week_starts_on").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      setRecurring((r as Recurring[]) ?? []);
      setTasks((t as Task[]) ?? []);
      setEvents((e as OneOffEvent[]) ?? []);
      if (settings?.week_starts_on !== undefined && settings?.week_starts_on !== null) {
        setWeekStartsOn(settings.week_starts_on as 0 | 1);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridDays[0]?.getTime()]);

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

  const orderedLabels = weekStartsOn === 1 ? [...DAY_LABELS_SUN.slice(1), DAY_LABELS_SUN[0]] : DAY_LABELS_SUN;
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = todayISO();
  const selectedItems = itemsFor(selected, new Date(selected + "T00:00").getDay());

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-cream">{monthLabel}</h1>
          <p className="mt-1 text-sm text-cream/60">Classes, tasks, and events, all in one grid.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="btn-ghost px-3 py-1.5"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(1);
              d.setHours(0, 0, 0, 0);
              setCursor(d);
              setSelected(todayISO());
            }}
            className="btn-ghost px-3 py-1.5"
          >
            Today
          </button>
          <button
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="btn-ghost px-3 py-1.5"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-cream/60">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-7 gap-1.5">
            {orderedLabels.map((l) => (
              <div key={l} className="text-center text-[11px] font-semibold text-cream/40 pb-1">
                {l}
              </div>
            ))}
            {gridDays.map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = iso === today;
              const isSelected = iso === selected;
              const items = itemsFor(iso, d.getDay());

              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`surface aspect-square p-1.5 flex flex-col items-start text-left transition ${
                    inMonth ? "" : "opacity-30"
                  } ${isSelected ? "!border-marigold/50 !bg-ink-soft" : ""} ${isToday ? "ring-1 ring-marigold/40" : ""}`}
                >
                  <span className={`font-display text-xs font-bold ${isToday ? "text-marigold" : "text-cream/75"}`}>
                    {d.getDate()}
                  </span>
                  <span className="mt-auto flex flex-wrap gap-0.5">
                    {items.slice(0, 4).map((it) => (
                      <span
                        key={`${it.kind}-${it.id}`}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            it.kind === "recurring" ? it.color : it.kind === "task" ? "#FFC94D" : "#FF8A5B",
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="surface mt-6 px-5 py-4">
            <h2 className="text-sm font-semibold text-cream/80">
              {new Date(selected + "T00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {selected === today ? <span className="ml-2 text-xs text-marigold font-normal">Today</span> : null}
            </h2>
            {selectedItems.length === 0 ? (
              <p className="mt-2.5 text-sm text-cream/40">Nothing on the books.</p>
            ) : (
              <ul className="mt-2.5 space-y-1.5">
                {selectedItems.map((it) => (
                  <li key={`${it.kind}-${it.id}`} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: it.kind === "recurring" ? it.color : it.kind === "task" ? "#FFC94D" : "#FF8A5B",
                      }}
                    />
                    {it.time && <span className="tabular-nums text-cream/40 shrink-0">{it.time.slice(0, 5)}</span>}
                    <span
                      className={
                        it.kind === "task" && it.done ? "text-cream/30 line-through" : "text-cream/85"
                      }
                    >
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
        </>
      )}
    </div>
  );
}