import { getAdminStatus } from "@/lib/auth";

export const metadata = { title: "Access denied" };
export const dynamic = "force-dynamic";

export default async function DeniedPage() {
  const { user } = await getAdminStatus();

  return (
    <main className="auth">
      <div className="auth-card">
        <p className="auth-kicker auth-kicker--danger">● Access denied</p>
        <h1>Superadmins only</h1>
        <p className="auth-sub">
          {user?.email ?? "This account"} is signed in, but its profile
          doesn&apos;t have <code>is_superadmin</code> set. Admin access can only
          be granted directly in the database.
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="secondary-btn wide">
            Sign out and switch accounts
          </button>
        </form>
      </div>
    </main>
  );
}
