import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { activityLogs, platformAdmins, sessions, users, workspaces } from "@fpp/database";
import { getDatabase } from "../auth-db";
import {
  getPlatformAdminFromCookies,
  getPlatformSetting,
  listPlatformAdmins,
  listPlatformUsers
} from "../admin-auth";

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

  const [admins, platformUsers, defaultLocale, stats, activity] = await Promise.all([
    listPlatformAdmins(),
    listPlatformUsers(),
    getPlatformSetting("default_locale", "en"),
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
              <p className="ui-eyebrow">Settings</p>
              <h2>Program language</h2>
            </div>
            <span className="ui-badge" data-tone="info">
              {defaultLocale.toUpperCase()}
            </span>
          </div>
          <p>Choose the default language used by platform-level screens and future defaults.</p>
          <form className="admin-form admin-form--inline" action="/api/admin/settings/language" method="post">
            <label className="ui-field">
              <span>Default language</span>
              <select className="ui-input ui-select" defaultValue={defaultLocale} name="locale">
                <option value="en">English</option>
                <option value="fa">Persian</option>
                <option value="ar">Arabic</option>
              </select>
            </label>
            <button className="ui-button ui-button--primary" type="submit">
              Save language
            </button>
          </form>
        </article>

        <article className="coach-card">
          <div className="coach-card__top">
            <div>
              <p className="ui-eyebrow">Users</p>
              <h2>Add account</h2>
            </div>
            <span className="ui-badge" data-tone="info">
              Secure create
            </span>
          </div>
          <form className="admin-form admin-user-form" action="/api/admin/users" method="post">
            <label className="ui-field">
              <span>Name</span>
              <input className="ui-input" name="name" required />
            </label>
            <label className="ui-field">
              <span>Email</span>
              <input className="ui-input" name="email" type="email" required />
            </label>
            <label className="ui-field">
              <span>Temporary password</span>
              <input className="ui-input" name="password" type="password" required />
            </label>
            <label className="ui-check">
              <input name="platformAdmin" type="checkbox" />
              <span>Grant platform admin access</span>
            </label>
            <button className="ui-button ui-button--primary" type="submit">
              Add user
            </button>
          </form>
        </article>

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

        <article className="coach-card admin-wide">
          <div className="coach-card__top">
            <div>
              <p className="ui-eyebrow">Users</p>
              <h2>User control</h2>
            </div>
            <span className="ui-badge" data-tone="info">
              Latest 50
            </span>
          </div>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Workspaces</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {platformUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name ?? "Unnamed user"}</strong>
                      <span>{user.email}</span>
                    </td>
                    <td>{user.deletedAt ? "deleted" : user.status}</td>
                    <td>{user.workspaceCount}</td>
                    <td>{user.createdAt.toISOString().slice(0, 10)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <form action="/api/admin/users/status" method="post">
                          <input name="userId" type="hidden" value={user.id} />
                          <input
                            name="action"
                            type="hidden"
                            value={user.status === "active" && !user.deletedAt ? "disable" : "activate"}
                          />
                          <button
                            className="ui-button ui-button--secondary"
                            disabled={user.id === currentAdmin.userId}
                            type="submit"
                          >
                            {user.status === "active" && !user.deletedAt ? "Disable" : "Activate"}
                          </button>
                        </form>
                        <form action="/api/admin/users/status" method="post">
                          <input name="userId" type="hidden" value={user.id} />
                          <input name="action" type="hidden" value="delete" />
                          <button
                            className="ui-button ui-button--danger"
                            disabled={user.id === currentAdmin.userId || Boolean(user.deletedAt)}
                            type="submit"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
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
