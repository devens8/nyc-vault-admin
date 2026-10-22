// Google sign-in for the admin app.
//
// Supabase only honors OAuth redirects on allow-listed URLs, which covers the
// main NYC Vault production domain but not this app's domains. So the OAuth
// round-trip goes through the main app's /auth/relay, which immediately
// bounces the `code` back here; this app then exchanges it with the PKCE
// verifier cookie it set — the code is useless anywhere else.

export const AUTH_HOME = "https://designforgenai.vercel.app";

// Where Supabase should send the browser after Google, for a login started on
// `origin` that wants to end up at `next`.
export function oauthRedirectFor(origin, next) {
  const callback = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  if (origin === AUTH_HOME || origin.startsWith("http://localhost")) return callback;
  return `${AUTH_HOME}/auth/relay?to=${encodeURIComponent(origin)}&next=${encodeURIComponent(next)}`;
}
