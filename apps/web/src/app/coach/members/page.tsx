import Link from "next/link";

const members = [
  {
    name: "Workspace Owner",
    email: "owner@example.com",
    role: "Owner",
    status: "Active",
    scope: "Full workspace"
  },
  {
    name: "Invited Coach",
    email: "coach@example.com",
    role: "Coach",
    status: "Pending",
    scope: "Assigned teams"
  },
  {
    name: "Operations Assistant",
    email: "assistant@example.com",
    role: "Assistant",
    status: "Pending",
    scope: "Assigned tasks"
  }
];

export default function MembersPage() {
  return (
    <main className="coach-shell" data-theme="dark">
      <header className="coach-header">
        <div>
          <p className="ui-eyebrow">Members</p>
          <h1>Control workspace access.</h1>
        </div>
        <p>
          Members are always resolved through workspace membership, role, and scope. Owner controls are
          visible here, while deeper team and player scoping waits for those modules.
        </p>
        <div className="coach-header__actions">
          <Link className="ui-button ui-button--primary" href="/coach/invitations">
            Invite member
          </Link>
          <Link className="ui-button ui-button--secondary" href="/coach">
            Dashboard
          </Link>
        </div>
      </header>

      <section className="members-table-wrap" aria-label="Workspace members">
        <table className="members-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.email}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.role}</td>
                <td>
                  <span className="ui-badge" data-tone={member.status === "Active" ? "success" : "warning"}>
                    {member.status}
                  </span>
                </td>
                <td>{member.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
