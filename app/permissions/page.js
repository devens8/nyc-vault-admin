import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate } from "@/lib/data";
import RoleButton from "./RoleButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "User permissions" };

// READ/UPDATE: who has superadmin access to this console.
export default async function PermissionsPage({ searchParams }) {
  const params = await searchParams;
  const { db, user } = await requireAdmin("/permissions");
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, email, first_name, last_name, avatar_url, is_superadmin, created_at");
  if (error) throw new Error(error.message);

  const q = (params?.q ?? "").trim().toLowerCase();
  const rows = profiles
    .map((p) => ({ ...p, name: displayName(p) }))
    .filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q))
    .sort((a, b) => Number(b.is_superadmin) - Number(a.is_superadmin) || a.name.localeCompare(b.name));
  const admins = profiles.filter((p) => p.is_superadmin).length;

  return (
    <main className="page">
      <header className="page-header">
        <h1>User permissions</h1>
        <p className="subtitle">
          Who can use this admin console. Admins can see every table and change
          prompts, models, access lists and bug reports. You can&apos;t change
          your own role, and there must always be at least one admin.
        </p>
      </header>

      <section className="kpi-grid kpi-grid--small" aria-label="Roles">
        <div className="kpi">
          <span className="kpi-value">{admins}</span>
          <span className="kpi-label">Admins</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{profiles.length - admins}</span>
          <span className="kpi-label">Members</span>
        </div>
      </section>

      <form className="toolbar" action="/permissions">
        <input className="search" type="search" name="q" defaultValue={params?.q ?? ""} placeholder="Search name or email…" aria-label="Search users" />
        <button type="submit" className="secondary-btn">
          Search
        </button>
        {q && (
          <Link href="/permissions" className="clear-link">
            Clear
          </Link>
        )}
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role</th>
              <th scope="col">Joined</th>
              <th scope="col">
                <span className="sr-only">Change role</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/users/${p.id}`} className="row-link">
                    {p.name}
                  </Link>
                  <span className="row-sub">{p.email}</span>
                </td>
                <td>{p.is_superadmin ? <span className="tag tag--admin">Admin</span> : <span className="tag">Member</span>}</td>
                <td className="nowrap">{fmtDate(p.created_at)}</td>
                <td className="row-actions">
                  <RoleButton id={p.id} name={p.name} isAdmin={p.is_superadmin} isSelf={p.id === user.id} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-cell">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
