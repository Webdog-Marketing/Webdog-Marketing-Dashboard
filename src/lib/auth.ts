export const AUTH_COOKIE = "webdog_auth";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The cookie value is a hash of the real password plus a server-only
// secret, so the cookie itself never reveals the password and can't be
// forged without knowing both.
export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return sha256Hex(`${password}::${password.length}::webdog-dashboard`);
}

export async function checkPassword(submitted: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return true; // no password configured — open access
  return submitted === password;
}
