"use client";

import { useState } from "react";
import Link from "next/link";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(data.error || "Something went wrong. Try again.");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-lg font-semibold">
          DOT Navigator<span style={{ color: "var(--color-accent)" }}>.</span>
        </Link>
        <Link href="/navigator" className="text-sm font-medium hover:underline">
          Free roadmap →
        </Link>
      </header>

      <main className="mx-auto max-w-md px-6 pb-24 pt-10">
        <p className="eyebrow">Your saved roadmap</p>
        <h1 className="mt-2 font-serif font-semibold" style={{ fontSize: "var(--text-h2)" }}>
          Sign in to pick up where you left off
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
          No passwords. We email you a one-time link — it remembers every milestone you&apos;ve marked
          done and keeps your deadlines tracked.
        </p>

        {status === "sent" ? (
          <div className="card mt-8 space-y-2 p-6" role="status">
            <p className="font-serif text-lg">Check your inbox.</p>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              If <strong>{email}</strong> has (or just started) a roadmap, a sign-in link is on its way.
              It expires in 15 minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="card mt-8 space-y-5 p-6">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="field"
                placeholder="you@yourcarrier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {status === "error" && (
              <p className="text-sm font-medium" role="alert" style={{ color: "var(--color-accent)" }}>
                {message}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            <p className="text-center text-xs" style={{ color: "var(--color-muted)" }}>
              New here? The same link starts your roadmap — no separate sign-up.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
