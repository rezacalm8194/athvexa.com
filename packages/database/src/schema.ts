import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", ["active", "locked", "disabled"]);
export const memberStatus = pgEnum("member_status", ["invited", "active", "suspended", "removed"]);
export const roleKey = pgEnum("role_key", ["owner", "coach", "assistant", "player"]);
export const scopeMode = pgEnum("scope_mode", ["all", "assigned", "none"]);
export const themePreference = pgEnum("theme_preference", ["dark", "light", "system"]);
export const localePreference = pgEnum("locale_preference", ["en", "fa", "ar"]);
export const calendarPreference = pgEnum("calendar_preference", ["gregorian", "persian", "hijri"]);
export const hourFormatPreference = pgEnum("hour_format_preference", ["12", "24"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  version: integer("version").notNull().default(1)
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    name: varchar("name", { length: 160 }),
    avatarFileId: uuid("avatar_file_id"),
    status: userStatus("status").notNull().default("active"),
    defaultLocale: localePreference("default_locale").notNull().default("en"),
    defaultTimezone: varchar("default_timezone", { length: 80 }).notNull().default("UTC"),
    defaultCalendar: calendarPreference("default_calendar").notNull().default("gregorian"),
    defaultHourFormat: hourFormatPreference("default_hour_format").notNull().default("24"),
    ...timestamps
  },
  (table) => [
    uniqueIndex("users_email_normalized_uidx").on(table.emailNormalized),
    index("users_status_idx").on(table.status)
  ]
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 160 }),
    fingerprintHash: text("fingerprint_hash"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => [index("devices_user_id_idx").on(table.userId)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => devices.id, { onDelete: "set null" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uidx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt)
  ]
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    country: varchar("country", { length: 2 }),
    timezone: varchar("timezone", { length: 80 }).notNull().default("UTC"),
    defaultLocale: localePreference("default_locale").notNull().default("en"),
    defaultCalendar: calendarPreference("default_calendar").notNull().default("gregorian"),
    defaultHourFormat: hourFormatPreference("default_hour_format").notNull().default("24"),
    theme: themePreference("theme").notNull().default("dark"),
    activityType: varchar("activity_type", { length: 80 }),
    approxPlayerCount: integer("approx_player_count"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("workspaces_slug_uidx").on(table.slug),
    index("workspaces_slug_idx").on(table.slug)
  ]
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    key: roleKey("key").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("roles_system_key_uidx").on(table.key).where(sql`${table.workspaceId} is null`),
    uniqueIndex("roles_workspace_key_uidx")
      .on(table.workspaceId, table.key)
      .where(sql`${table.workspaceId} is not null and ${table.deletedAt} is null`),
    index("roles_workspace_id_idx").on(table.workspaceId)
  ]
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    resource: varchar("resource", { length: 80 }).notNull(),
    action: varchar("action", { length: 80 }).notNull(),
    scope: varchar("scope", { length: 80 }).notNull().default("workspace"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    unique("permissions_role_resource_action_scope_uidx").on(
      table.roleId,
      table.resource,
      table.action,
      table.scope
    ),
    index("permissions_role_id_idx").on(table.roleId)
  ]
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    status: memberStatus("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    teamScopeMode: scopeMode("team_scope_mode").notNull().default("all"),
    playerScopeMode: scopeMode("player_scope_mode").notNull().default("all"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("workspace_members_active_workspace_user_uidx")
      .on(table.workspaceId, table.userId)
      .where(sql`${table.deletedAt} is null`),
    index("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
    index("workspace_members_workspace_role_idx").on(table.workspaceId, table.roleId),
    index("workspace_members_status_idx").on(table.status)
  ]
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorMemberId: uuid("actor_member_id").references(() => workspaceMembers.id, {
      onDelete: "set null"
    }),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entity_type", { length: 120 }).notNull(),
    entityId: uuid("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("activity_logs_workspace_created_at_idx").on(table.workspaceId, table.createdAt),
    index("activity_logs_entity_idx").on(table.entityType, table.entityId),
    index("activity_logs_actor_idx").on(table.actorUserId)
  ]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("password_reset_tokens_token_hash_uidx").on(table.tokenHash),
    index("password_reset_tokens_user_id_idx").on(table.userId),
    index("password_reset_tokens_expires_at_idx").on(table.expiresAt)
  ]
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailNormalized: varchar("email_normalized", { length: 320 }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    success: boolean("success").notNull().default(false),
    failureReason: varchar("failure_reason", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("login_attempts_email_created_at_idx").on(table.emailNormalized, table.createdAt),
    index("login_attempts_user_created_at_idx").on(table.userId, table.createdAt)
  ]
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    teamId: uuid("team_id"),
    playerScopeId: uuid("player_scope_id"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usageLimit: integer("usage_limit").notNull().default(1),
    usageCount: integer("usage_count").notNull().default(0),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps
  },
  (table) => [
    uniqueIndex("invitations_token_hash_uidx").on(table.tokenHash),
    index("invitations_workspace_email_idx").on(table.workspaceId, table.emailNormalized),
    index("invitations_token_hash_idx").on(table.tokenHash),
    index("invitations_expires_at_idx").on(table.expiresAt),
    index("invitations_workspace_status_idx").on(
      table.workspaceId,
      table.revokedAt,
      table.acceptedAt
    )
  ]
);

export const baseSchemaTables = {
  users,
  devices,
  sessions,
  workspaces,
  roles,
  permissions,
  workspaceMembers,
  activityLogs
};

export const authSchemaTables = {
  ...baseSchemaTables,
  passwordResetTokens,
  loginAttempts
};

export const memberSchemaTables = {
  ...authSchemaTables,
  invitations
};
