"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Recurring = { id: string; title: string; day_of_week: number; start_time: string; color: string };
type Task = { id: string; title: string; due_date: string; due_time: string | null; done: boolean };

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
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div>
      <p className="text-sm text-marigold">{greeting()}{name ? `, ${name}` : ""}</p>
      <h1 className="mt-1 text-3xl font-display font-bold text-cream">Give your week a rhythm.</h1>
      <p className="mt-1 text-sm text-cream/50">{todayLabel}</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDates.map((date, i) => {
          const iso = toISODate(date);
          const isToday = iso === todayISO;
          const dayRecurring = recurring
            .filter((r) => r.day_of_week === i)
            .map((r) => ({ kind: "recurring" as const, title: r.title, time: r.start_time, color: r.color, id: r.id }));
          const dayTasks = tasks
            .filter((t) => t.due_date === iso)
            .map((t) => ({
              kind: "task" as const,
              title: t.title,
              time: t.due_time ?? "",
              done: t.done,
              id: t.id,
            }));
          const items = [...dayRecurring, ...dayTasks].sort((a, b) => (a.time || "24:00").localeCompare(b.time || "24:00"));

          return (
            <div
              key={iso}
              className={`surface surface-hover px-3.5 py-3.5 min-h-[150px] ${
                isToday ? "!border-marigold/50 shadow-[0_0_0_1px_rgba(255,201,77,0.35),0_20px_40px_-20px_rgba(0,0,0,0.55)]" : ""
              }`}
            >
              <div className={`text-xs font-bold ${isToday ? "text-marigold" : "text-cream/50"}`}>
                {DAY_LABELS[i]} {date.getDate()}
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {items.length === 0 && <li className="text-xs text-cream/25">—</li>}
                {items.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="text-xs">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                        item.kind === "task" ? "bg-marigold" : ""
                      }`}
                      style={item.kind === "recurring" ? { background: (item as any).color } : undefined}
                    />
                    <span
                      className={
                        item.kind === "task" && (item as any).done ? "text-cream/30 line-through" : "text-cream/85"
                      }
                    >
                      {item.time && <span className="tabular-nums text-cream/40">{item.time.slice(0, 5)} </span>}
                      {item.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
