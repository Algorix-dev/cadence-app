"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 page-enter">
      <div className="w-full max-w-sm surface px-8 py-9">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-display font-bold text-cream">
          <span className="w-8 h-8 rounded-xl bg-marigold flex items-center justify-center">
            <span className="w-3 h-3 rounded bg-violet" />
          </span>
          Cadence
        </Link>
        <h1 className="mt-8 text-2xl font-display font-bold text-cream">Welcome back</h1>
        <p className="mt-2 text-sm text-cream/60">Log in to see your week.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-cream/60 mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field w-full"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-cream/60 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field w-full"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-coral">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-solid w-full disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-cream/60">
          New to Cadence?{" "}
          <Link href="/signup" className="text-marigold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
