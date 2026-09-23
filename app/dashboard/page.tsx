"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Recurring = { id: string; title: string; day_of_week: number; start_time: string; color: string };
type Task = { id: string; title: string; due_date: string; due_time: string | null; done: boolean };
type Item =
  | { kind: "recurring"; id: string; title: string; time: string; color: string }
  | { kind: "task"; id: string; title: string; time: string; done: boolean };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfWeek(d: Date) {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function WeekPage() {
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState<Recurring[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(new Date().getDay());

  const weekStart = startOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    async function load() {
      const weekEnd = toISODate(weekDates[6]);
      const weekStartISO = toISODate(weekDates[0]);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: r }, { data: t }, { data: settings }] = await Promise.all([
        supabase.from("recurring_events").select("id,title,day_of_week,start_time,color"),
        supabase.from("tasks").select("id,title,due_date,due_time,done").gte("due_date", weekStartISO).lte("due_date", weekEnd),
        user ? supabase.from("user_settings").select("display_name").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setName(settings?.display_name || user?.email?.split("@")[0] || "");
      setRecurring((r as Recurring[]) ?? []);
      setTasks((t as Task[]) ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <p className="text-sm text-cream/60">Loading your week…</p>;

  const todayISO = toISODate(new Date());
  const todayIdx = new Date().getDay();
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  function itemsFor(i: number, iso: string): Item[] {
    const dayRecurring: Item[] = recurring
      .filter((r) => r.day_of_week === i)
      .map((r) => ({ kind: "recurring", id: r.id, title: r.title, time: r.start_time, color: r.color }));
    const dayTasks: Item[] = tasks
      .filter((t) => t.due_date === iso)
      .map((t) => ({ kind: "task", id: t.id, title: t.title, time: t.due_time ?? "", done: t.done }));
    return [...dayRecurring, ...dayTasks].sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"));
  }

  return (
    <div>
      <p className="text-sm text-marigold">
        {greeting()}
        {name ? `, ${name}` : ""}
      </p>
      <h1 className="mt-1 text-3xl font-display font-bold text-cream">Give your week a rhythm.</h1>
      <p className="mt-1 text-sm text-cream/50">{todayLabel}</p>

      <div className="mt-8 flex gap-2 items-stretch flex-wrap sm:flex-nowrap">
        {weekDates.map((date, i) => {
          const iso = toISODate(date);
          const isToday = iso === todayISO;
          const isActive = i === activeIdx;
          const items = itemsFor(i, iso);

          return (
            <button
              key={iso}
              onClick={() => setActiveIdx(i)}
              className={`day-chip surface text-left px-3.5 py-3.5 flex flex-col ${
                isActive ? "day-chip-active" : ""
              } ${isToday ? "!border-marigold/40" : ""}`}
              style={isActive ? { flexGrow: 5 } : undefined}
            >
              <div className="flex items-baseline justify-between gap-1.5">
                <span className={`text-xs font-bold whitespace-nowrap ${isToday || isActive ? "text-marigold" : "text-cream/45"}`}>
                  {DAY_LABELS[i]}
                  {isToday && <span className="today-pip" />}
                </span>
                <span className={`font-display font-bold text-base ${isActive ? "text-cream" : "text-cream/70"}`}>
                  {date.getDate()}
                </span>
              </div>

              {!isActive && (
                <div className="mt-auto pt-2.5 flex flex-wrap gap-1">
                  {items.slice(0, 6).map((item) => (
                    <span
                      key={`${item.kind}-${item.id}`}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: item.kind === "task" ? "#FFC94D" : item.color }}
                    />
                  ))}
                </div>
              )}

              <div className={`day-agenda ${isActive ? "day-agenda-open" : ""}`}>
                <div className="mt-3.5 flex flex-col gap-1.5">
                  {items.length === 0 && <p className="text-xs text-cream/30">Nothing on the books.</p>}
                  {items.map((item) => (
                    <div key={`${item.kind}-${item.id}`} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: item.kind === "task" ? "#FFC94D" : item.color }}
                      />
                      {item.time && <span className="tabular-nums text-cream/40 shrink-0">{item.time.slice(0, 5)}</span>}
                      <span
                        className={`truncate ${
                          item.kind === "task" && item.done ? "text-cream/30 line-through" : "text-cream/85"
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}