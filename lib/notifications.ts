"use client";

import { supabase } from "@/lib/supabase/client";

// Cadence's "nudges" for this build are browser Notification API alerts,
// scheduled client-side for whatever's left today. That only fires while
// the tab is open — true background push (a scheduled function + service
// worker) is a real next step, noted in the README.

let scheduledToday = false;

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function scheduleNudgesForToday() {
  if (scheduledToday) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission !== "granted") return;

  scheduledToday = true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay();
  const today = now.toISOString().slice(0, 10);

  const [{ data: recurring }, { data: tasks }] = await Promise.all([
    supabase.from("recurring_events").select("*").eq("day_of_week", dayOfWeek),
    supabase.from("tasks").select("*").eq("due_date", today).eq("done", false).not("due_time", "is", null),
  ]);

  const items = [
    ...(recurring ?? []).map((r: any) => ({
      title: r.title,
      atMinutes: timeToMinutes(r.start_time),
      remindBefore: r.remind_minutes_before,
    })),
    ...(tasks ?? []).map((t: any) => ({
      title: t.title,
      atMinutes: timeToMinutes(t.due_time),
      remindBefore: t.remind_minutes_before,
    })),
  ];

  for (const item of items) {
    const fireAt = item.atMinutes - item.remindBefore;
    const minutesUntilFire = fireAt - nowMinutes;
    // Only schedule things still ahead of us today, and cap how long a
    // single tab session is realistically going to stay open for.
    if (minutesUntilFire > 0 && minutesUntilFire < 12 * 60) {
      setTimeout(() => {
        new Notification("Cadence", { body: `${item.title} in ${item.remindBefore} min` });
      }, minutesUntilFire * 60 * 1000);
    }
  }
}
