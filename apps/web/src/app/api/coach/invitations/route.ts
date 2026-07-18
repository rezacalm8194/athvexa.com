import { createWorkspaceInvitation } from "../../../coach-invitations";
import { redirectTo } from "../../auth/redirect";

export async function POST(request: Request) {
  const result = await createWorkspaceInvitation(await request.formData(), request);

  if (!result.ok) {
    if (result.error === "unauthorized") {
      return redirectTo(request, "/login?returnTo=/coach/invitations");
    }

    return redirectTo(request, `/coach/invitations?error=${result.error}`);
  }

  return redirectTo(request, "/coach/invitations?created=1");
}
