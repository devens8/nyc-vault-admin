import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client (for Client Components). Reads session from cookies
// written by the server client / middleware.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
