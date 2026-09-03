import en from "@/messages/en.json";
import fa from "@/messages/fa.json";

export type Locale = "en" | "fa";
type Messages = typeof en;
const messages: Record<Locale, Messages> = { en, fa };

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const value = key.split(".").reduce<unknown>((current, segment) => {
    return current && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined;
  }, messages[locale]);
  if (typeof value !== "string") return key;
  if (!params) return value;
  return Object.entries(params).reduce((text, [name, param]) => text.replace(`{${name}}`, String(param)), value);
}

export function roleLabel(role: string, locale: Locale): string {
  if (role === "PLAYER") return t(locale, "roles.player");
  if (role === "ASSISTANT") return t(locale, "roles.assistantCoach");
  return t(locale, "roles.coach");
}

/** Team membership roles (OWNER, HEAD_COACH, …) shown in coach UI. */
export function teamRoleLabel(role: string, locale: Locale): string {
  const keyByRole: Record<string, string> = {
    OWNER: "coach.teams.roleOwner",
    HEAD_COACH: "coach.teams.roleHeadCoach",
    ASSISTANT_COACH: "coach.teams.roleAssistantCoach",
    ANALYST: "coach.teams.roleAnalyst",
    PHYSIO: "coach.teams.rolePhysio",
    PLAYER: "coach.teams.rolePlayer",
  };
  const key = keyByRole[role];
  return key ? t(locale, key) : role;
}
