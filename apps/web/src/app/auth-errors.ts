export const authErrorMessages = {
  invalid: "Please check the fields and try again.",
  login_failed: "Email or password is not correct.",
  signup_failed: "We could not create the account. Please try again.",
  server: "Authentication is temporarily unavailable."
} as const;

export type AuthErrorCode = keyof typeof authErrorMessages;

export function getAuthErrorMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;

  if (code && code in authErrorMessages) {
    return authErrorMessages[code as AuthErrorCode];
  }

  return undefined;
}
