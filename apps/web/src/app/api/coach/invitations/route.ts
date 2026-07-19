import { createWorkspaceInvitation } from "../../../coach-invitations";
import { redirectTo } from "../../auth/redirect";
import { buildAbsoluteUrl, getRequestBaseUrl } from "@fpp/config";

export async function POST(request: Request) {
  const result = await createWorkspaceInvitation(await request.formData(), request);

  if (!result.ok) {
    if (result.error === "unauthorized") {
      return redirectTo(request, "/login?returnTo=/coach/invitations");
    }

    return redirectTo(request, `/coach/invitations?error=${result.error}`);
  }

  const baseUrl = getRequestBaseUrl(request.url, process.env, request.headers);
  const inviteLink = buildAbsoluteUrl(baseUrl, result.invitePath);
  const searchParams = new URLSearchParams({
    created: "1",
    inviteLink,
    inviteEmail: result.email,
    inviteRole: result.role
  });

  return redirectTo(request, `/coach/invitations?${searchParams.toString()}`);
}
