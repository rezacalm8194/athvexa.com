"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon, TrashIcon } from "@/components/icons";

type Notification = {
  id: string;
  title: string;
  description: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function NotificationsCenter() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setError(null);
    fetch("/api/notifications", { cache: "no-store" })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || "Could not load notifications");
        setNotifications(payload.notifications ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load notifications"));
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    setBusy(true);
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setBusy(false);
    load();
  }

  async function markAllRead() {
    setBusy(true);
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setBusy(false);
    load();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setBusy(false);
    load();
  }

  const unreadCount = notifications?.filter((item) => !item.readAt).length ?? 0;

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow">Notifications</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">Notification center</h1>
          <p className="mt-1 text-sm text-smoke-3">{unreadCount} unread</p>
        </div>
        <button className="btn-ghost !px-4 !py-2 text-xs" onClick={markAllRead} disabled={busy || unreadCount === 0}>
          Mark all as read
        </button>
      </div>

      {!notifications && !error ? (
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="card px-5 py-8 text-center">
          <p className="text-sm text-red-glow">{error}</p>
          <button className="btn-ghost mt-4 !px-4 !py-2 text-xs" onClick={load}>
            Try again
          </button>
        </div>
      ) : null}

      {notifications?.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-smoke-4">
            <BellIcon className="h-6 w-6" />
          </div>
          <p className="font-display text-base font-bold text-white">No notifications yet.</p>
          <p className="max-w-sm text-sm text-smoke-3">Program, check-in, assessment, and training updates will appear here.</p>
        </div>
      ) : null}

      {notifications && notifications.length > 0 ? (
        <div className="flex flex-col gap-2">
          {notifications.map((item) => (
            <div key={item.id} className={`rounded-lg border p-4 ${item.readAt ? "border-white/5 bg-ink-3" : "border-red/30 bg-red/5"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!item.readAt ? <span className="h-2 w-2 rounded-full bg-red" /> : null}
                    <h2 className="font-display text-base font-bold text-white">{item.title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-smoke-3">{item.description}</p>
                  <p className="mt-2 text-xs text-smoke-4">{relativeTime(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.actionHref ? (
                    <Link className="btn-ghost !px-3 !py-1.5 text-xs" href={item.actionHref}>
                      Open
                    </Link>
                  ) : null}
                  {!item.readAt ? (
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => markRead(item.id)} disabled={busy}>
                      Mark as read
                    </button>
                  ) : null}
                  <button className="btn-ghost !px-2.5 !py-1.5 text-xs text-red-glow" onClick={() => remove(item.id)} disabled={busy}>
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
