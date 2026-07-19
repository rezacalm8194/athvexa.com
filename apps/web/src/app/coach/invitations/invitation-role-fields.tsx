"use client";

import { useState } from "react";
import { invitationRoles } from "@fpp/validation";

export function InvitationRoleFields() {
  const [role, setRole] = useState("coach");
  const [usageLimit, setUsageLimit] = useState(1);
  const isPlayer = role === "player";

  return (
    <>
      <label className="ui-field">
        <span className="ui-field__label">Role</span>
        <select
          className="ui-input ui-select"
          name="role"
          onChange={(event) => {
            const nextRole = event.target.value;
            setRole(nextRole);

            if (nextRole === "player") {
              setUsageLimit(1);
            }
          }}
          required
          value={role}
        >
          {invitationRoles.map((invitationRole) => (
            <option key={invitationRole} value={invitationRole}>
              {invitationRole}
            </option>
          ))}
        </select>
      </label>

      <label className="ui-field">
        <span className="ui-field__label">Usage limit</span>
        <input
          className="ui-input"
          max={isPlayer ? 1 : 100}
          min={1}
          name="usageLimit"
          onChange={(event) => setUsageLimit(Number(event.target.value))}
          readOnly={isPlayer}
          type="number"
          value={usageLimit}
        />
        {isPlayer ? <span className="ui-field__hint">Player invitations are always single-use.</span> : null}
      </label>
    </>
  );
}
