"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon, TrashIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

type Notification = {
  id: string;
  title: string;
  description: string;
  type: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

function resolveNotificationText(item: Notification, locale: Locale): { title: string; description: string } {
  switch (item.type) {
    case "CHECK_IN_REMINDER":
      return {
        title: t(locale, "notifications.types.checkInReminder.title"),
        description: t(locale, "notifications.types.checkInReminder.body"),
      };
    case "TRAINING_REMINDER": {
      const sessionSuffix = " is scheduled for today.";
      let session = item.description;
      if (item.description.endsWith(sessionSuffix)) {
        session = item.description.slice(0, -sessionSuffix.length);
      }
      return {
        title: t(locale, "notifications.types.trainingReminder.title"),
        description: t(locale, "notifications.types.trainingReminder.body", { session }),
      };
    }
    case "PLAYER_NO_CHECK_IN": {
      const nameSuffix = " has not completed today's check-in.";
      let name = item.description;
      if (item.description.endsWith(nameSuffix)) {
        name = item.description.slice(0, -nameSuffix.length);
      }
      return {
        title: t(locale, "notifications.types.playerNoCheckIn.title"),
        description: t(locale, "notifications.types.playerNoCheckIn.body", { name }),
      };
    }
    case "TEAM_INVITE":
      return {
        title: t(locale, "notifications.types.teamInvite.title"),
        description: item.description,
      };
    case "PROGRAM_ASSIGNED":
      return {
        title: t(locale, "notifications.types.programAssigned.title"),
        description: item.description,
      };
    case "PROGRAM_UPDATED":
      return {
        title: t(locale, "notifications.types.programUpdated.title"),
        description: item.description,
      };
    case "COACH_MESSAGE":
      return {
        title: t(locale, "notifications.types.coachMessage.title"),
        description: item.description,
      };
    default:
      return {
        title:
          item.title ||
          (item.type === "ASSISTANT_ACTIVITY"
            ? t(locale, "notifications.types.assistantActivity.fallbackTitle")
            : item.title),
        description: item.description,
      };
  }
}

function relativeTime(value: string, locale: Locale) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return t(locale, "notifications.timeMinutesAgo", { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t(locale, "notifications.timeHoursAgo", { n: hours });
  return t(locale, "notifications.timeDaysAgo", { n: Math.round(hours / 24) });
}

export default function NotificationsCenter({ locale }: { locale: Locale }) {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setError(null);
    fetch("/api/notifications", { cache: "no-store" })
      .then((res) => res.json().then((payload) => ({ ok: res.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) throw new Error(payload.error || t(locale, "notifications.loadError"));
        setNotifications(payload.notifications ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t(locale, "notifications.loadError")));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="eyebrow">{t(locale, "notifications.eyebrow")}</div>
          <h1 className="font-display text-3xl font-extrabold tracking-wide text-white">{t(locale, "notifications.title")}</h1>
          <p className="mt-1 text-sm text-smoke-3">{t(locale, "notifications.unreadCount", { count: unreadCount })}</p>
        </div>
        <button className="btn-ghost !px-4 !py-2 text-xs" onClick={markAllRead} disabled={busy || unreadCount === 0}>
          {t(locale, "notifications.markAllRead")}
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
            {t(locale, "notifications.tryAgain")}
          </button>
        </div>
      ) : null}

      {notifications?.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-smoke-4">
            <BellIcon className="h-6 w-6" />
          </div>
          <p className="font-display text-base font-bold text-white">{t(locale, "notifications.emptyTitle")}</p>
          <p className="max-w-sm text-sm text-smoke-3">{t(locale, "notifications.emptyBody")}</p>
        </div>
      ) : null}

      {notifications && notifications.length > 0 ? (
        <div className="flex flex-col gap-2">
          {notifications.map((item) => {
            const { title, description } = resolveNotificationText(item, locale);
            return (
            <div key={item.id} className={`rounded-lg border p-4 ${item.readAt ? "border-white/5 bg-ink-3" : "border-red/30 bg-red/5"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!item.readAt ? <span className="h-2 w-2 rounded-full bg-red" /> : null}
                    <h2 className="font-display text-base font-bold text-white">{title}</h2>
                  </div>
                  <p className="mt-1 text-sm text-smoke-3">{description}</p>
                  <p className="mt-2 text-xs text-smoke-4">{relativeTime(item.createdAt, locale)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.actionHref ? (
                    <Link className="btn-ghost !px-3 !py-1.5 text-xs" href={item.actionHref}>
                      {t(locale, "notifications.open")}
                    </Link>
                  ) : null}
                  {!item.readAt ? (
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => markRead(item.id)} disabled={busy}>
                      {t(locale, "notifications.markRead")}
                    </button>
                  ) : null}
                  <button className="btn-ghost !px-2.5 !py-1.5 text-xs text-red-glow" onClick={() => remove(item.id)} disabled={busy}>
                    <TrashIcon className="h-4 w-4" />
                    {t(locale, "notifications.delete")}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
