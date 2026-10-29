import { getAdminStatus } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import NavLinks from "./NavLinks";

// Sidebar is only shown to superadmins; it also shows how many bugs are open.
export default async function AdminSidebar() {
  const { isAdmin } = await getAdminStatus();
  if (!isAdmin) return null;

  const { count } = await createAdminClient()
    .from("bug_reports")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);

  return <NavLinks counts={{ openBugs: count ?? 0 }} />;
}
