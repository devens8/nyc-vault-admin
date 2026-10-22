import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate, loadAll, tallyByGeneration } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "User" };

export default async function UserDetailPage({ params }) {
  const { id } = await params;
  const { db } = await requireAdmin(`/users/${id}`);
  const { generations, votes, profiles, saves, authUsers } = await loadAll(db);

  const profile = profiles.find((p) => p.id === id);
  if (!profile) notFound();

  const authUser = authUsers.find((u) => u.id === id);
  const tally = tallyByGeneration(votes, saves);
  const genById = new Map(generations.map((g) => [g.id, g]));
  const mine = generations.filter((g) => g.user_id === id);
  const myVotes = votes
    .filter((v) => v.user_id === id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const mySaves = saves.filter((s) => s.user_id === id);

  return (
    <main className="page">
      <header className="page-header">
        <Link href="/users" className="back-link">
          ← Users
        </Link>
        <div className="user-cell user-cell--lg">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="avatar-lg" />
          ) : (
            <span className="avatar-lg avatar-sm--empty">
              {(displayName(profile)[0] ?? "?").toUpperCase()}
            </span>
          )}
          <div>
            <h1>{displayName(profile)}</h1>
            <p className="subtitle">
              {profile.email} ·{" "}
              {profile.is_superadmin ? (
                <span className="tag tag--admin">Superadmin</span>
              ) : (
                <span className="tag">Member</span>
              )}
            </p>
          </div>
        </div>
      </header>

      <dl className="facts panel">
        <div>
          <dt>Joined</dt>
          <dd>{fmtDate(profile.created_at)}</dd>
        </div>
        <div>
          <dt>Last sign-in</dt>
          <dd>{authUser?.last_sign_in_at ? fmtDate(authUser.last_sign_in_at) : "—"}</dd>
        </div>
        <div>
          <dt>Sign-in provider</dt>
          <dd>{authUser?.app_metadata?.provider ?? "—"}</dd>
        </div>
        <div>
          <dt>Bio</dt>
          <dd>{profile.bio || "—"}</dd>
        </div>
        <div>
          <dt>User ID</dt>
          <dd>
            <code>{profile.id}</code>
          </dd>
        </div>
      </dl>

      <div className="two-col">
        <section>
          <h2 className="section-title">Spots added ({mine.length})</h2>
          {mine.length === 0 ? (
            <p className="empty">None yet.</p>
          ) : (
            <ul className="mini-list">
              {mine.map((g) => {
                const t = tally(g.id);
                return (
                  <li key={g.id}>
                    <Link href={`/media/${g.id}`} className="row-link">
                      {g.place_name}
                    </Link>
                    <span className="row-sub">
                      {g.neighborhood} · <span className="up">▲{t.up}</span>{" "}
                      <span className="down">▼{t.down}</span> · {t.saves} saves
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="section-title">Votes given ({myVotes.length})</h2>
          {myVotes.length === 0 ? (
            <p className="empty">None yet.</p>
          ) : (
            <ul className="mini-list">
              {myVotes.map((v) => (
                <li key={v.id}>
                  <span className={v.value === 1 ? "up" : "down"}>
                    {v.value === 1 ? "▲ Up" : "▼ Down"}
                  </span>{" "}
                  <Link href={`/media/${v.generation_id}`} className="row-link">
                    {genById.get(v.generation_id)?.place_name ?? "deleted item"}
                  </Link>
                  <span className="row-sub">{fmtDate(v.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="result-count">{mySaves.length} spot(s) on their saved list.</p>
        </section>
      </div>
    </main>
  );
}
