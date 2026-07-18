import { acceptWorkspaceInvitation } from "../../../coach-invitations";
import { redirectTo, redirectWithSession } from "../../auth/redirect";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get("token");
  const invitePath =
    typeof token === "string" && token.length >= 32 && token.length <= 256
      ? `/invite/${encodeURIComponent(token)}`
      : "/invite/invalid";
  const result = await acceptWorkspaceInvitation(formData, request);

  if (!result.ok) {
    return redirectTo(request, `${invitePath}?error=${result.error}`);
  }

  if ("token" in result && result.token && result.expiresAt) {
    return redirectWithSession(request, result.returnTo, result.token, result.expiresAt);
  }

  return redirectTo(request, result.returnTo);
}
