"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Status = "planning" | "confirmed";
type EventItem = { id: string; title: string; done: boolean; position: number };
type Event = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  status: Status;
  remind_minutes_before: number;
  event_items: EventItem[];
};

type Draft = {
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  status: Status;
  remind: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
const emptyDraft = (remind = 60): Draft => ({
  title: "",
  event_date: todayISO(),
  start_time: "",
  end_time: "",
  location: "",
  notes: "",
  status: "planning",
  remind,
});

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [defaultRemind, setDefaultRemind] = useState(60);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Nested select pulls each event's checklist in the same round trip
    // (events -> event_items via the event_id foreign key).
    const [{ data }, { data: settings }] = await Promise.all([
      supabase.from("events").select("*, event_items(*)").order("event_date"),
      user
        ? supabase.from("user_settings").select("default_reminder_minutes").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const withSortedItems = ((data as Event[]) ?? []).map((e) => ({
      ...e,
      event_items: [...(e.event_items ?? [])].sort((a, b) => a.position - b.position),
    }));
    setEvents(withSortedItems);
    const fallback = settings?.default_reminder_minutes ?? 60;
    setDefaultRemind(fallback);
    setDraft((d) => (d.remind === 60 ? { ...d, remind: fallback } : d));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft(defaultRemind));
  }

  function startEdit(e: Event) {
    setEditingId(e.id);
    setDraft({
      title: e.title,
      event_date: e.event_date,
      start_time: e.start_time?.slice(0, 5) ?? "",
      end_time: e.end_time?.slice(0, 5) ?? "",
      location: e.location ?? "",
      notes: e.notes ?? "",
      status: e.status,
      remind: e.remind_minutes_before,
    });
    setExpandedId(e.id);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!draft.title.trim() || !draft.event_date) return;

    const payload = {
      title: draft.title.trim(),
      event_date: draft.event_date,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      location: draft.location.trim() || null,
      notes: draft.notes.trim() || null,
      status: draft.status,
      remind_minutes_before: draft.remind,
    };

    if (editingId) {
      await supabase.from("events").update(payload).eq("id", editingId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: inserted } = await supabase
        .from("events")
        .insert({ ...payload, user_id: user.id })
        .select("id")
        .single();
      if (inserted) setExpandedId(inserted.id);
    }
    resetForm();
    load();
  }

  async function removeEvent(id: string) {
    if (editingId === id) resetForm();
    if (expandedId === id) setExpandedId(null);
    await supabase.from("events").delete().eq("id", id);
    load();
  }

  async function addItem(eventId: string) {
    if (!newItemTitle.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const event = events.find((e) => e.id === eventId);
    const position = event ? event.event_items.length : 0;
    await supabase
      .from("event_items")
      .insert({ event_id: eventId, user_id: user.id, title: newItemTitle.trim(), position });
    setNewItemTitle("");
    load();
  }

  async function toggleItem(item: EventItem) {
    // Optimistic — flips instantly, reconciles with load() after.
    setEvents((prev) =>
      prev.map((e) => ({
        ...e,
        event_items: e.event_items.map((it) => (it.id === item.id ? { ...it, done: !it.done } : it)),
      }))
    );
    await supabase.from("event_items").update({ done: !item.done }).eq("id", item.id);
  }

  async function removeItem(id: string) {
    await supabase.from("event_items").delete().eq("id", id);
    load();
  }

  if (loading) return <p className="text-sm text-cream/60">Loading…</p>;

  const today = todayISO();
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-cream">Events</h1>
      <p className="mt-1 text-sm text-cream/60">One-off things — a trip, a demo day, a birthday — with their own prep checklist.</p>

      <form onSubmit={submit} className="surface mt-6 px-5 py-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-cream/50 mb-1">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Capstone demo day…"
              className="field w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">Date</label>
            <input
              type="date"
              value={draft.event_date}
              onChange={(e) => setDraft({ ...draft, event_date: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">Start</label>
            <input
              type="time"
              value={draft.start_time}
              onChange={(e) => setDraft({ ...draft, start_time: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="block text-xs text-cream/50 mb-1">End</label>
            <input
              type="time"
              value={draft.end_time}
              onChange={(e) => setDraft({ ...draft, end_time: e.target.value })}
              className="field"
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

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-cream/50 mb-1">Location</label>
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="CU main hall…"
              className="field w-full"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-cream/50 mb-1">Notes</label>
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="field w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-cream/50">Status</span>
            <div className="flex gap-1.5">
              {(["planning", "confirmed"] as Status[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  className="chip"
                  aria-pressed={draft.status === s}
                  onClick={() => setDraft({ ...draft, status: s })}
                >
                  {s === "planning" ? "Planning" : "Confirmed"}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-ghost">
                Cancel
              </button>
            )}
            <button type="submit" className="btn-solid">
              {editingId ? "Save changes" : "Add event"}
            </button>
          </div>
        </div>
      </form>

      {events.length === 0 ? (
        <p className="mt-8 text-sm text-cream/60">No events yet — add one above.</p>
      ) : (
        <>
          <EventGroup
            title="Upcoming"
            events={upcoming}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            startEdit={startEdit}
            removeEvent={removeEvent}
            newItemTitle={newItemTitle}
            setNewItemTitle={setNewItemTitle}
            addItem={addItem}
            toggleItem={toggleItem}
            removeItem={removeItem}
          />
          <EventGroup
            title="Past"
            events={past}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            startEdit={startEdit}
            removeEvent={removeEvent}
            newItemTitle={newItemTitle}
            setNewItemTitle={setNewItemTitle}
            addItem={addItem}
            toggleItem={toggleItem}
            removeItem={removeItem}
            faded
          />
        </>
      )}
    </div>
  );
}

function EventGroup({
  title,
  events,
  expandedId,
  setExpandedId,
  startEdit,
  removeEvent,
  newItemTitle,
  setNewItemTitle,
  addItem,
  toggleItem,
  removeItem,
  faded = false,
}: {
  title: string;
  events: Event[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  startEdit: (e: Event) => void;
  removeEvent: (id: string) => void;
  newItemTitle: string;
  setNewItemTitle: (v: string) => void;
  addItem: (eventId: string) => void;
  toggleItem: (item: EventItem) => void;
  removeItem: (id: string) => void;
  faded?: boolean;
}) {
  if (events.length === 0) return null;
  return (
    <div className={`mt-8 ${faded ? "opacity-60" : ""}`}>
      <h2 className="text-sm font-semibold text-cream/70">{title}</h2>
      <ul className="mt-3 space-y-3">
        {events.map((e) => {
          const isOpen = expandedId === e.id;
          const doneCount = e.event_items.filter((it) => it.done).length;
          return (
            <li key={e.id} className="surface px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setExpandedId(isOpen ? null : e.id)}
                  className="flex-1 min-w-0 text-left flex items-center gap-3"
                >
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      e.status === "confirmed" ? "bg-[#5AA9A3]/15 text-[#5AA9A3]" : "bg-marigold/15 text-marigold"
                    }`}
                  >
                    {e.status === "confirmed" ? "Confirmed" : "Planning"}
                  </span>
                  <span className="min-w-0">
                    <p className="text-sm text-cream truncate">{e.title}</p>
                    <p className="text-xs text-cream/45 tabular-nums">
                      {new Date(e.event_date + "T00:00").toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}
                      {e.location ? ` · ${e.location}` : ""}
                      {e.event_items.length > 0 ? ` · ${doneCount}/${e.event_items.length} done` : ""}
                    </p>
                  </span>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => startEdit(e)} className="text-xs text-cream/40 hover:text-marigold transition">
                    Edit
                  </button>
                  <button onClick={() => removeEvent(e.id)} className="text-xs text-cream/40 hover:text-coral transition">
                    Remove
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3.5 pt-3.5 border-t border-cream/10">
                  {e.notes && <p className="text-xs text-cream/50 mb-3">{e.notes}</p>}
                  <ul className="space-y-1.5">
                    {e.event_items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5 group">
                        <label className="check">
                          <input type="checkbox" checked={item.done} onChange={() => toggleItem(item)} />
                          <span className="box">
                            <svg viewBox="0 0 24 24">
                              <path d="M5 12.5l4.5 4.5L19 7" />
                            </svg>
                          </span>
                        </label>
                        <span className={`text-sm flex-1 ${item.done ? "text-cream/35 line-through" : "text-cream/85"}`}>
                          {item.title}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-cream/30 opacity-0 group-hover:opacity-100 hover:text-coral transition"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      value={newItemTitle}
                      onChange={(ev) => setNewItemTitle(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.preventDefault();
                          addItem(e.id);
                        }
                      }}
                      placeholder="Add a checklist item…"
                      className="field flex-1 text-xs py-2"
                    />
                    <button onClick={() => addItem(e.id)} className="btn-ghost text-xs px-3.5 py-2">
                      Add
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}