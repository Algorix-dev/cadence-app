"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Task = {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  notes: string | null;
  done: boolean;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("tasks").select("*").order("due_date").order("due_time");
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      due_date: dueDate,
      due_time: dueTime || null,
    });
    setTitle("");
    setDueTime("");
    load();
  }

  async function toggleDone(id: string, done: boolean) {
    await supabase.from("tasks").update({ done: !done }).eq("id", id);
    load();
  }

  async function removeTask(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  const upcoming = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-cream">Tasks</h1>
      <p className="mt-1 text-sm text-cream/60">One-off deadlines, right next to your routine.</p>

      <form onSubmit={addTask} className="surface mt-6 px-5 py-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-cream/50 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Submit assignment…"
            className="field"
          />
        </div>
        <div>
          <label className="block text-xs text-cream/50 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="block text-xs text-cream/50 mb-1">Due time (optional)</label>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="field"
          />
        </div>
        <button type="submit" className="btn-solid">
          Drop it in
        </button>
      </form>

      {loading ? (
        <p className="mt-8 text-sm text-cream/60">Loading…</p>
      ) : (
        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-sm font-semibold text-cream/70">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-cream/50">Nothing pending — nice.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {upcoming.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-xl bg-ink-soft/60 border border-cream/10 px-3.5 py-2.5 transition hover:border-marigold/30"
                  >
                    <label className="flex items-center gap-3 text-sm text-cream cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleDone(t.id, t.done)}
                        className="accent-marigold w-4 h-4"
                      />
                      {t.title}
                    </label>
                    <div className="flex items-center gap-3 text-xs text-cream/50">
                      <span className="tabular-nums">
                        {t.due_date}
                        {t.due_time ? ` · ${t.due_time.slice(0, 5)}` : ""}
                      </span>
                      <button onClick={() => removeTask(t.id)} className="hover:text-coral transition">
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-cream/70">Done</h2>
              <ul className="mt-2 space-y-2">
                {done.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-xl bg-ink-soft/50 border border-cream/5 px-3.5 py-2.5"
                  >
                    <label className="flex items-center gap-3 text-sm text-cream/50 line-through cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleDone(t.id, t.done)}
                        className="accent-marigold w-4 h-4"
                      />
                      {t.title}
                    </label>
                    <button onClick={() => removeTask(t.id)} className="text-xs text-cream/40 hover:text-coral transition">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
