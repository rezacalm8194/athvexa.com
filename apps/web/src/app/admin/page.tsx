import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { activityLogs, platformAdmins, sessions, users, workspaces } from "@fpp/database";
import { getDatabase } from "../auth-db";
import { getPlatformAdminFromCookies, listPlatformAdmins } from "../admin-auth";

async function getPlatformStats() {
  const db = getDatabase();
  const [[userStats], [workspaceStats], [sessionStats], [adminStats]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workspaces)
      .where(sql`${workspaces.deletedAt} is null`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(sql`${sessions.revokedAt} is null and ${sessions.expiresAt} > now()`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformAdmins)
      .where(sql`${platformAdmins.revokedAt} is null and ${platformAdmins.deletedAt} is null`)
  ]);

  return {
    users: userStats.count,
    workspaces: workspaceStats.count,
    sessions: sessionStats.count,
    admins: adminStats.count
  };
}

async function getRecentActivity() {
  const db = getDatabase();

  return db
    .select({
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      createdAt: activityLogs.createdAt
    })
    .from(activityLogs)
    .orderBy(sql`${activityLogs.createdAt} desc`)
    .limit(6);
}

export default async function AdminPage() {
  const currentAdmin = await getPlatformAdminFromCookies();

  if (!currentAdmin) {
    redirect("/login?returnTo=/admin");
  }

  const [admins, stats, activity] = await Promise.all([
    listPlatformAdmins(),
    getPlatformStats(),
    getRecentActivity()
  ]);

  return (
    <main className="coach-shell admin-shell" data-theme="dark">
      <header className="coach-header admin-header">
        <div>
          <p className="ui-eyebrow">Platform Admin</p>
          <h1>Control the ATHVEXA platform.</h1>
        </div>
        <p>
          This dashboard is reserved for platform administrators. Admins can manage global
          administrators and inspect platform-wide users, workspaces, sessions, and audit activity.
        </p>
        <div className="coach-header__actions">
          <Link className="ui-button ui-button--secondary" href="/coach">
            Coach dashboard
          </Link>
          <Link className="ui-button ui-button--secondary" href="/ui-preview">
            UI preview
          </Link>
        </div>
      </header>

      <section className="coach-grid admin-stats" aria-label="Platform totals">
        <article className="coach-card">
          <span className="ui-eyebrow">Users</span>
          <strong>{stats.users}</strong>
        </article>
        <article className="coach-card">
          <span className="ui-eyebrow">Workspaces</span>
          <strong>{stats.workspaces}</strong>
        </article>
        <article className="coach-card">
          <span className="ui-eyebrow">Active sessions</span>
          <strong>{stats.sessions}</strong>
        </article>
        <article className="coach-card">
          <span className="ui-eyebrow">Platform admins</span>
          <strong>{stats.admins}</strong>
        </article>
      </section>

      <section className="admin-layout">
        <article className="coach-card">
          <div className="coach-card__top">
            <div>
              <p className="ui-eyebrow">Access</p>
              <h2>Platform administrators</h2>
            </div>
            <span className="ui-badge" data-tone="success">
              Full access
            </span>
          </div>

          <form className="admin-form" action="/api/admin/platform-admins" method="post">
            <label className="ui-field">
              <span>Email</span>
              <input className="ui-input" name="email" type="email" required />
            </label>
            <button className="ui-button ui-button--primary" type="submit">
              Add admin
            </button>
          </form>

          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.email}</td>
                    <td>{admin.userId ? "Account linked" : "Pending signup"}</td>
                    <td>
                      <form action="/api/admin/platform-admins/remove" method="post">
                        <input name="email" type="hidden" value={admin.email} />
                        <button
                          className="ui-button ui-button--danger"
                          disabled={admin.email === currentAdmin.email && admins.length <= 1}
                          type="submit"
                        >
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="coach-card">
          <p className="ui-eyebrow">Recent audit activity</p>
          <h2>Latest events</h2>
          <div className="admin-activity">
            {activity.length ? (
              activity.map((item) => (
                <p key={`${item.action}-${item.createdAt.toISOString()}`}>
                  <strong>{item.action}</strong>
                  <span>
                    {item.entityType} · {item.createdAt.toISOString()}
                  </span>
                </p>
              ))
            ) : (
              <p>No audit activity yet.</p>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
