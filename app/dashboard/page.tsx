"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Priority = "low" | "medium" | "high";
type Task = {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  notes: string | null;
  priority: Priority;
  category: string | null;
  done: boolean;
  remind_minutes_before: number;
};

type Filter = "all" | "today" | "upcoming" | "done";

const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
// TIP: swap these three classes to restyle priority tags without touching
// any JSX below — everything reads from this one map.
const PRIORITY_CLASS: Record<Priority, string> = {
  high: "bg-coral/15 text-coral",
  medium: "bg-marigold/15 text-marigold",
  low: "bg-[#5AA9A3]/15 text-[#5AA9A3]",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dueLabel(dateISO: string) {
  const today = todayISO();
  if (dateISO === today) return "Today";
  const d = new Date(dateISO + "T00:00");
  const diffDays = Math.round((d.getTime() - new Date(today + "T00:00").getTime()) / 86400000);
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// One shared shape for the add form and the edit form, so editing a task
// reuses the exact same fields instead of a second, slightly different form.
type Draft = {
  title: string;
  due_date: string;
  due_time: string;
  priority: Priority;
  category: string;
  notes: string;
  remind: number;
};
const emptyDraft = (remind = 60): Draft => ({
  title: "",
  due_date: todayISO(),
  due_time: "",
  priority: "medium",
  category: "",
  notes: "",
  remind,
});

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Pulled from Settings > "Default nudge lead time"; prefills new tasks'
  // reminder field. Falls back to 60 (the tasks.remind_minutes_before
  // column default) if the user has no saved settings row yet.
  const [defaultRemind, setDefaultRemind] = useState(60);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [{ data }, { data: settings }] = await Promise.all([
      supabase.from("tasks").select("*").order("due_date").order("due_time"),
      user
        ? supabase.from("user_settings").select("default_reminder_minutes").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setTasks((data as Task[]) ?? []);
    const fallback = settings?.default_reminder_minutes ?? 60;
    setDefaultRemind(fallback);
    setDraft((d) => (d.remind === 60 ? { ...d, remind: fallback } : d));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const today = todayISO();
    return {
      today: tasks.filter((t) => !t.done && t.due_date === today).length,
      upcoming: tasks.filter((t) => !t.done && t.due_date > today).length,
      done: tasks.filter((t) => t.done).length,
    };
  }, [tasks]);

  const visible = useMemo(() => {
    const today = todayISO();
    switch (filter) {
      case "today":
        return tasks.filter((t) => !t.done && t.due_date === today);
      case "upcoming":
        return tasks.filter((t) => !t.done && t.due_date > today);
      case "done":
        return tasks.filter((t) => t.done);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  function startEdit(t: Task) {
    setEditingId(t.id);
    setDraft({
      title: t.title,
      due_date: t.due_date,
      due_time: t.due_time ?? "",
      priority: t.priority,
      category: t.category ?? "",
      notes: t.notes ?? "",
      remind: t.remind_minutes_before,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft(defaultRemind));
    setError(null);
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError("Give the task a title first.");
      return;
    }
    if (!draft.due_date) {
      setError("Pick a due date.");
      return;
    }
    setError(null);

    const payload = {
      title: draft.title.trim(),
      due_date: draft.due_date,
      due_time: draft.due_time || null,
      priority: draft.priority,
      category: draft.category.trim() || null,
      notes: draft.notes.trim() || null,
      remind_minutes_before: draft.remind,
    };

    if (editingId) {
      // Optimistic update: the row reflects the edit immediately, and we
      // reconcile with the server response after. If the request fails the
      // load() below will pull the previous saved state back in.
      setTasks((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...payload } : t)));
      await supabase.from("tasks").update(payload).eq("id", editingId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("tasks").insert({ ...payload, user_id: user.id });
    }

    cancelEdit();
    load();
  }

  async function toggleDone(t: Task) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
  }

  async function removeTask(id: string) {
    // Let the exit animation play (row-out, ~220ms) before the row actually
    // leaves the tasks array — otherwise React unmounts it instantly and the
    // CSS animation never gets a chance to run.
    setExitingIds((prev) => new Set(prev).add(id));
    setTimeout(async () => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await supabase.from("tasks").delete().eq("id", id);
    }, 220);
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-cream">Tasks</h1>
      <p className="mt-1 text-sm text-cream/60">One-off deadlines, right next to your routine.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          All ({tasks.length})
        </button>
        <button className="chip" aria-pressed={filter === "today"} onClick={() => setFilter("today")}>
          Today ({counts.today})
        </button>
        <button className="chip" aria-pressed={filter === "upcoming"} onClick={() => setFilter("upcoming")}>
          Upcoming ({counts.upcoming})
        </button>
        <button className="chip" aria-pressed={filter === "done"} onClick={() => setFilter("done")}>
          Done ({counts.done})
        </button>
      </div>

      <form onSubmit={saveDraft} className="surface mt-5 px-5 py-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-cream/50 mb-1">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Submit assignment…"
              className="field w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">Due date</label>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">Due time</label>
            <input
              type="time"
              value={draft.due_time}
              onChange={(e) => setDraft({ ...draft, due_time: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">Category</label>
            <input
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              placeholder="CSC 201…"
              className="field w-32"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">Remind (min before)</label>
            <input
              type="number"
              min={0}
              value={draft.remind}
              onChange={(e) => setDraft({ ...draft, remind: Number(e.target.value) })}
              className="field w-24"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cream/50">Priority</span>
            <div className="flex gap-1.5">
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  className="chip"
                  aria-pressed={draft.priority === p}
                  onClick={() => setDraft({ ...draft, priority: p })}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {error && <span className="text-xs text-coral">{error}</span>}
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn-ghost">
                Cancel
              </button>
            )}
            <button type="submit" className="btn-solid">
              {editingId ? "Save changes" : "Drop it in"}
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <p className="mt-8 text-sm text-cream/60">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-cream/60">
          {filter === "done" ? "Nothing marked done yet." : "Nothing here — add a task above."}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className={`group flex items-center justify-between gap-3 rounded-xl bg-ink-soft/60 border border-cream/10 px-3.5 py-3 transition hover:border-marigold/30 ${
                exitingIds.has(t.id) ? "row-out" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <label className="check">
                  <input type="checkbox" checked={t.done} onChange={() => toggleDone(t)} />
                  <span className="box">
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </span>
                </label>
                <div className="min-w-0">
                  <p className={`text-sm truncate ${t.done ? "text-cream/40 line-through" : "text-cream"}`}>
                    {t.title}
                  </p>
                  <p className="text-xs text-cream/45 tabular-nums">
                    {dueLabel(t.due_date)}
                    {t.due_time ? ` · ${t.due_time.slice(0, 5)}` : ""}
                    {t.category ? ` · ${t.category}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_CLASS[t.priority]}`}>
                  {PRIORITY_LABEL[t.priority]}
                </span>
                <button
                  onClick={() => startEdit(t)}
                  className="text-xs text-cream/40 opacity-0 group-hover:opacity-100 hover:text-marigold transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeTask(t.id)}
                  className="text-xs text-cream/40 opacity-0 group-hover:opacity-100 hover:text-coral transition"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}