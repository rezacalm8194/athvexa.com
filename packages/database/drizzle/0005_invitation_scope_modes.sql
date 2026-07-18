ALTER TABLE "invitations"
  ADD COLUMN "team_scope_mode" "scope_mode" DEFAULT 'assigned' NOT NULL,
  ADD COLUMN "player_scope_mode" "scope_mode" DEFAULT 'assigned' NOT NULL;
