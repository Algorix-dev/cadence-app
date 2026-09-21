"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [defaultMinutes, setDefaultMinutes] = useState(15);
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setDefaultMinutes(data.default_reminder_minutes ?? 15);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, display_name: displayName, default_reminder_minutes: defaultMinutes });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  if (loading) return <p className="text-sm text-cream/60">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-cream">Settings</h1>
      <p className="mt-1 text-sm text-cream/60">{email}</p>

      <form onSubmit={save} className="surface mt-6 max-w-sm space-y-4 px-5 py-5">
        <div>
          <label className="block text-xs text-cream/50 mb-1">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full field"
          />
        </div>
        <div>
          <label className="block text-xs text-cream/50 mb-1">Default nudge lead time (minutes)</label>
          <input
            type="number"
            min={1}
            value={defaultMinutes}
            onChange={(e) => setDefaultMinutes(Number(e.target.value))}
            className="w-full field"
          />
        </div>
        <button type="submit" className="btn-solid">
          Save
        </button>
        {saved && <span className="ml-3 text-xs text-marigold">Saved.</span>}
      </form>

      <div className="mt-10 max-w-sm">
        <h2 className="text-sm font-semibold text-cream/70">Nudges</h2>
        {permission === "unsupported" && (
          <p className="mt-2 text-sm text-cream/50">Your browser doesn't support notifications.</p>
        )}
        {permission === "granted" && (
          <p className="mt-2 text-sm text-cream/50">Notifications are on — you'll get nudged while the app is open.</p>
        )}
        {permission === "denied" && (
          <p className="mt-2 text-sm text-cream/50">Notifications are blocked. Re-enable them in your browser's site settings.</p>
        )}
        {permission === "default" && (
          <button
            onClick={requestPermission}
            className="btn-ghost mt-2"
          >
            Turn on nudges
          </button>
        )}
      </div>
    </div>
  );
}
