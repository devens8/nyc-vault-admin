import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Look up the signed-in user and whether their profile has is_superadmin.
// Reads with the user's own session, so it works without the service key.
export async function getAdminStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url, is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  return { user, isAdmin: profile?.is_superadmin === true, profile };
}

// Gate for every admin page and server action. Middleware already blocks
// non-admins, but each data access re-checks here so a missed matcher or a
// direct server-action POST can never reach the service-role client.
export async function requireAdmin(nextPath = "/") {
  const status = await getAdminStatus();
  if (!status.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!status.isAdmin) redirect("/denied");
  return { ...status, db: createAdminClient() };
}

// Same check for server actions, which should return an error instead of
// redirecting mid-mutation.
export async function adminOrError() {
  const status = await getAdminStatus();
  if (!status.user || !status.isAdmin) {
    return { error: "Not authorized: superadmin access required." };
  }
  return { ...status, db: createAdminClient() };
}
