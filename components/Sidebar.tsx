"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// TIP: this order is the approved information architecture — Today first
// (what's happening right now), then the three planning surfaces, then
// Settings last. Add a new tab by adding one line here; Sidebar highlights
// it automatically once its route exists.
const links = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/recurring", label: "Timetable" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 border-r border-cream/10 px-4 py-7 flex flex-col justify-between min-h-screen bg-gradient-to-b from-ink-soft/30 to-transparent">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="w-8 h-8 rounded-xl bg-marigold flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(255,201,77,0.55)]">
            <span className="w-3 h-3 rounded-md bg-violet" />
          </span>
          <span className="text-lg font-display font-bold text-cream">Cadence</span>
        </Link>
        <nav className="mt-9 flex flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-ink-soft text-cream font-semibold shadow-[inset_0_0_0_1px_rgba(255,201,77,0.3)]"
                    : "text-cream/60 hover:text-cream hover:bg-ink-soft/60"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-marigold" />
                )}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <button onClick={handleLogout} className="mx-2 text-left text-sm text-cream/50 hover:text-cream transition-colors">
        Log out
      </button>
    </aside>
  );
}
