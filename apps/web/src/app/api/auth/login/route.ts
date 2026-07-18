import { loginWithPassword } from "../../../auth-flow";
import { redirectTo, redirectWithSession } from "../redirect";

export async function POST(request: Request) {
  const result = await loginWithPassword(await request.formData(), request.headers);

  if (!result.ok) {
    return redirectTo(request, `/login?error=${result.error}`);
  }

  return redirectWithSession(request, result.returnTo, result.token, result.expiresAt);
}
