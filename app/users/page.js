import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate, loadAll, tallyByGeneration } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }) {
  const params = await searchParams;
  const { db } = await requireAdmin("/users");
  const { generations, votes, profiles, saves, authUsers } = await loadAll(db);

  const tally = tallyByGeneration(votes);
  const authById = new Map(authUsers.map((u) => [u.id, u]));
  const q = (params?.q ?? "").trim().toLowerCase();

  const rows = profiles
    .map((p) => {
      const mine = generations.filter((g) => g.user_id === p.id);
      const myVotes = votes.filter((v) => v.user_id === p.id);
      return {
        ...p,
        name: displayName(p),
        spots: mine.length,
        earned: mine.reduce((s, g) => s + tally(g.id).score, 0),
        ups: myVotes.filter((v) => v.value === 1).length,
        downs: myVotes.filter((v) => v.value === -1).length,
        saves: saves.filter((s) => s.user_id === p.id).length,
        lastSignIn: authById.get(p.id)?.last_sign_in_at,
      };
    })
    .filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q))
    .sort((a, b) => (b.lastSignIn ?? "").localeCompare(a.lastSignIn ?? ""));

  return (
    <main className="page">
      <header className="page-header">
        <h1>Users</h1>
        <p className="subtitle">
          Every member profile, with what they&apos;ve contributed. Read-only.
          Admin access can only be granted directly in the database.
        </p>
      </header>

      <form className="toolbar" action="/users">
        <input
          className="search"
          type="search"
          name="q"
          defaultValue={params?.q ?? ""}
          placeholder="Search name or email…"
          aria-label="Search users"
        />
        <button type="submit" className="secondary-btn">
          Search
        </button>
        {q && (
          <Link href="/users" className="clear-link">
            Clear
          </Link>
        )}
      </form>

      <p className="result-count">
        {rows.length} of {profiles.length} users
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role</th>
              <th scope="col" className="num">Spots</th>
              <th scope="col" className="num">Score earned</th>
              <th scope="col" className="num">Votes given ▲ / ▼</th>
              <th scope="col" className="num">Saves</th>
              <th scope="col">Joined</th>
              <th scope="col">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="user-cell">
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="avatar-sm" />
                    ) : (
                      <span className="avatar-sm avatar-sm--empty">
                        {(p.name[0] ?? "?").toUpperCase()}
                      </span>
                    )}
                    <div>
                      <Link href={`/users/${p.id}`} className="row-link">
                        {p.name}
                      </Link>
                      <span className="row-sub">{p.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  {p.is_superadmin ? (
                    <span className="tag tag--admin">Superadmin</span>
                  ) : (
                    <span className="tag">Member</span>
                  )}
                </td>
                <td className="num">{p.spots}</td>
                <td className="num strong">{p.earned > 0 ? `+${p.earned}` : p.earned}</td>
                <td className="num">
                  <span className="up">▲{p.ups}</span> <span className="down">▼{p.downs}</span>
                </td>
                <td className="num">{p.saves}</td>
                <td className="nowrap">{fmtDate(p.created_at)}</td>
                <td className="nowrap">{p.lastSignIn ? fmtDate(p.lastSignIn) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
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
