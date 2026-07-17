import { z } from "zod";

export const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10)
  .max(128)
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const safePathSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value || !value.startsWith("/") || value.startsWith("//")) {
      return "/onboarding";
    }

    return value;
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().default(false),
  returnTo: safePathSchema
});

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: emailSchema,
  password: passwordSchema,
  workspaceName: z.string().trim().min(2).max(160),
  returnTo: safePathSchema
});

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema
});

export const supportedOnboardingLocales = ["en", "fa", "ar"] as const;
export const supportedOnboardingCalendars = ["gregorian", "persian", "hijri"] as const;
export const supportedOnboardingHourFormats = ["12", "24"] as const;
export const supportedActivityTypes = [
  "individual_coach",
  "academy",
  "club",
  "private_group",
  "school",
  "other"
] as const;
export const onboardingStepIds = [
  "country",
  "timezone",
  "locale",
  "calendar",
  "hourFormat",
  "activityType",
  "approxPlayerCount",
  "firstTeam"
] as const;
export const invitationRoles = ["coach", "assistant", "player"] as const;
export const invitationScopeModes = ["all", "assigned", "none"] as const;

export const timezoneSchema = z.string().trim().min(1).max(80).refine(
  (value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Timezone must be a valid IANA timezone." }
);

export const workspaceOnboardingSchema = z.object({
  workspaceName: z.string().trim().min(2).max(160),
  country: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{2}$/))
      .optional()
  ),
  timezone: timezoneSchema,
  locale: z.enum(supportedOnboardingLocales),
  calendar: z.enum(supportedOnboardingCalendars),
  hourFormat: z.enum(supportedOnboardingHourFormats),
  activityType: z.enum(supportedActivityTypes),
  approxPlayerCount: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(0).max(100000).optional()
  ),
  firstTeamName: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
  skippedSteps: z.array(z.enum(onboardingStepIds)).default([])
});

export const createInvitationSchema = z
  .object({
    email: emailSchema,
    role: z.enum(invitationRoles),
    expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
    usageLimit: z.coerce.number().int().min(1).max(100).default(1),
    requiresApproval: z.boolean().default(false),
    teamScopeMode: z.enum(invitationScopeModes).default("assigned"),
    playerScopeMode: z.enum(invitationScopeModes).default("assigned"),
    teamId: z.string().uuid().optional(),
    playerScopeId: z.string().uuid().optional()
  })
  .superRefine((value, context) => {
    if (value.role === "player" && value.usageLimit !== 1) {
      context.addIssue({
        code: "custom",
        message: "Player invitations must be single-use.",
        path: ["usageLimit"]
      });
    }

    if (value.role === "assistant" && value.teamScopeMode === "all") {
      context.addIssue({
        code: "custom",
        message: "Assistant invitations cannot default to all-team access.",
        path: ["teamScopeMode"]
      });
    }
  });

export const acceptInvitationSchema = z.object({
  token: z.string().min(32).max(256),
  name: z.string().trim().min(2).max(160).optional(),
  password: passwordSchema.optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type WorkspaceOnboardingInput = z.infer<typeof workspaceOnboardingSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
