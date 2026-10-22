import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate, loadAll, tallyByGeneration } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI media" };

const SORTS = {
  new: { label: "Newest", fn: (a, b) => b.created_at.localeCompare(a.created_at) },
  score: { label: "Top score", fn: (a, b) => b.t.score - a.t.score || b.t.up - a.t.up },
  votes: { label: "Most votes", fn: (a, b) => b.t.total - a.t.total },
  name: { label: "A–Z", fn: (a, b) => a.place_name.localeCompare(b.place_name) },
};

export default async function MediaPage({ searchParams }) {
  const params = await searchParams;
  const { db } = await requireAdmin("/media");
  const { generations, votes, profiles, saves } = await loadAll(db);

  const q = (params?.q ?? "").trim().toLowerCase();
  const sort = SORTS[params?.sort] ? params.sort : "new";
  const tally = tallyByGeneration(votes, saves);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const rows = generations
    .map((g) => ({ ...g, t: tally(g.id), author: displayName(byId.get(g.user_id)) }))
    .filter(
      (g) =>
        !q ||
        [g.place_name, g.neighborhood, g.category, g.blurb, g.author]
          .join(" ")
          .toLowerCase()
          .includes(q)
    )
    .sort(SORTS[sort].fn);

  return (
    <main className="page">
      <header className="page-header page-header--row">
        <div>
          <h1>AI media</h1>
          <p className="subtitle">
            Every AI-generated spot in the vault. Create, edit or delete items;
            votes and saves are deleted along with an item.
          </p>
        </div>
        <Link href="/media/new" className="primary-btn">
          + New item
        </Link>
      </header>

      {params?.deleted && (
        <p className="form-success" role="status">
          Deleted &ldquo;{params.deleted}&rdquo;.
        </p>
      )}

      <form className="toolbar" action="/media">
        <input
          className="search"
          type="search"
          name="q"
          defaultValue={params?.q ?? ""}
          placeholder="Search name, area, vibe, text, author…"
          aria-label="Search media"
        />
        <select name="sort" defaultValue={sort} aria-label="Sort">
          {Object.entries(SORTS).map(([k, s]) => (
            <option key={k} value={k}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="secondary-btn">
          Apply
        </button>
        {(q || sort !== "new") && (
          <Link href="/media" className="clear-link">
            Clear
          </Link>
        )}
      </form>

      <p className="result-count">
        {rows.length} of {generations.length} items
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Spot</th>
              <th scope="col">Area · vibe</th>
              <th scope="col">Author</th>
              <th scope="col" className="num">Score</th>
              <th scope="col" className="num">▲ / ▼</th>
              <th scope="col" className="num">Saves</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td>
                  <Link href={`/media/${g.id}`} className="row-link">
                    {g.place_name}
                  </Link>
                  <span className="row-sub">{g.model}</span>
                </td>
                <td>
                  <span className="tag tag--area">{g.neighborhood}</span>{" "}
                  <span className="tag tag--cat">{g.category}</span>
                </td>
                <td>
                  <Link href={`/users/${g.user_id}`} className="plain-link">
                    {g.author}
                  </Link>
                </td>
                <td className="num strong">{g.t.score > 0 ? `+${g.t.score}` : g.t.score}</td>
                <td className="num">
                  <span className="up">▲{g.t.up}</span> <span className="down">▼{g.t.down}</span>
                </td>
                <td className="num">{g.t.saves}</td>
                <td className="nowrap">{fmtDate(g.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  No items match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
