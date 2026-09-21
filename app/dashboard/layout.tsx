"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Sidebar from "@/components/Sidebar";
import { scheduleNudgesForToday } from "@/lib/notifications";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace("/login");
      } else {
        setChecking(false);
        scheduleNudgesForToday();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-cream/60 text-sm">Loading…</div>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 px-10 py-10 max-w-6xl page-enter">{children}</div>
    </div>
  );
}
