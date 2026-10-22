import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate, loadAll } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Votes" };

const FILTERS = { all: "All votes", up: "▲ Upvotes", down: "▼ Downvotes" };

export default async function VotesPage({ searchParams }) {
  const params = await searchParams;
  const { db } = await requireAdmin("/votes");
  const { generations, votes, profiles } = await loadAll(db);

  const filter = FILTERS[params?.v] ? params.v : "all";
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const genById = new Map(generations.map((g) => [g.id, g]));

  const up = votes.filter((v) => v.value === 1).length;
  const rows = votes
    .filter((v) => filter === "all" || (filter === "up" ? v.value === 1 : v.value === -1))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <main className="page">
      <header className="page-header">
        <h1>Votes</h1>
        <p className="subtitle">
          Every upvote and downvote, newest first. Read-only: votes belong to
          the people who cast them.
        </p>
      </header>

      <section className="kpi-grid kpi-grid--small" aria-label="Vote totals">
        <div className="kpi">
          <span className="kpi-value">{votes.length}</span>
          <span className="kpi-label">Total votes</span>
        </div>
        <div className="kpi">
          <span className="kpi-value up">{up}</span>
          <span className="kpi-label">▲ Upvotes</span>
        </div>
        <div className="kpi">
          <span className="kpi-value down">{votes.length - up}</span>
          <span className="kpi-label">▼ Downvotes</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">
            {new Set(votes.map((v) => v.user_id)).size}
          </span>
          <span className="kpi-label">Unique voters</span>
        </div>
      </section>

      <nav className="seg" aria-label="Filter votes">
        {Object.entries(FILTERS).map(([k, label]) => (
          <Link
            key={k}
            href={k === "all" ? "/votes" : `/votes?v=${k}`}
            className={filter === k ? "active" : ""}
            aria-current={filter === k ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Vote</th>
              <th scope="col">Spot</th>
              <th scope="col">Voter</th>
              <th scope="col">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => {
              const g = genById.get(v.generation_id);
              return (
                <tr key={v.id}>
                  <td className={v.value === 1 ? "up strong" : "down strong"}>
                    {v.value === 1 ? "▲ Up" : "▼ Down"}
                  </td>
                  <td>
                    <Link href={`/media/${v.generation_id}`} className="row-link">
                      {g?.place_name ?? "deleted item"}
                    </Link>
                    {g && <span className="row-sub">{g.neighborhood}</span>}
                  </td>
                  <td>
                    <Link href={`/users/${v.user_id}`} className="plain-link">
                      {displayName(profileById.get(v.user_id))}
                    </Link>
                  </td>
                  <td className="nowrap">{fmtDate(v.created_at)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-cell">
                  No votes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
