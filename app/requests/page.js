import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate } from "@/lib/data";
import { StatusTag, fmtMs } from "@/app/components/LogBits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Generation requests" };

const FILTERS = { all: "All", succeeded: "Succeeded", failed: "Failed", pending: "Pending" };

// READ: every "generate" click, from the main app or this console.
export default async function RequestsPage({ searchParams }) {
  const params = await searchParams;
  const { db } = await requireAdmin("/requests");
  const filter = FILTERS[params?.s] ? params.s : "all";

  const [reqs, profiles, chains, calls] = await Promise.all([
    db
      .from("generation_requests")
      .select("*, generations(place_name)")
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("profiles").select("id, email, first_name, last_name"),
    db.from("prompt_chains").select("id, name"),
    db.from("llm_responses").select("request_id"),
  ]);
  const error = reqs.error || profiles.error || chains.error || calls.error;
  if (error) throw new Error(error.message);

  const byId = new Map(profiles.data.map((p) => [p.id, p]));
  const chainName = new Map(chains.data.map((c) => [c.id, c.name]));
  const callCount = new Map();
  for (const c of calls.data) callCount.set(c.request_id, (callCount.get(c.request_id) ?? 0) + 1);

  const all = reqs.data;
  const done = all.filter((r) => r.status !== "pending");
  const ok = all.filter((r) => r.status === "succeeded");
  const avg = ok.length ? Math.round(ok.reduce((s, r) => s + (r.duration_ms ?? 0), 0) / ok.length) : null;
  const rows = all.filter((r) => filter === "all" || r.status === filter);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Generation requests</h1>
        <p className="subtitle">
          Every time someone hits generate: who asked, what for, which chain
          ran, how long it took, and whether it worked. Open one to see each
          LLM call it made.
        </p>
      </header>

      <section className="kpi-grid kpi-grid--small" aria-label="Request totals">
        <div className="kpi">
          <span className="kpi-value">{all.length}</span>
          <span className="kpi-label">Requests</span>
        </div>
        <div className="kpi">
          <span className="kpi-value up">{done.length ? `${Math.round((ok.length / done.length) * 100)}%` : "—"}</span>
          <span className="kpi-label">Success rate</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{fmtMs(avg)}</span>
          <span className="kpi-label">Avg. time (successes)</span>
        </div>
        <div className="kpi">
          <span className="kpi-value down">{all.filter((r) => r.status === "failed").length}</span>
          <span className="kpi-label">Failed</span>
        </div>
      </section>

      <nav className="seg" aria-label="Filter requests">
        {Object.entries(FILTERS).map(([k, label]) => (
          <Link
            key={k}
            href={k === "all" ? "/requests" : `/requests?s=${k}`}
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
              <th scope="col">When</th>
              <th scope="col">Asked for</th>
              <th scope="col">By</th>
              <th scope="col">Chain</th>
              <th scope="col">Status</th>
              <th scope="col">Result</th>
              <th scope="col" className="num">LLM calls</th>
              <th scope="col" className="num">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">
                  <Link href={`/requests/${r.id}`} className="row-link">
                    {fmtDate(r.created_at)}
                  </Link>
                </td>
                <td>
                  <span className="tag tag--area">{r.neighborhood}</span>{" "}
                  <span className="tag tag--cat">{r.category}</span>
                  {r.notes && <span className="row-sub">“{r.notes}”</span>}
                </td>
                <td>
                  {r.user_id ? (
                    <Link href={`/users/${r.user_id}`} className="plain-link">
                      {displayName(byId.get(r.user_id))}
                    </Link>
                  ) : (
                    <span className="muted">system</span>
                  )}
                  <span className="row-sub">{r.source}</span>
                </td>
                <td>{chainName.get(r.chain_id) ?? "—"}</td>
                <td>
                  <StatusTag status={r.status} />
                </td>
                <td className="cell-wide">
                  {r.generation_id ? (
                    <Link href={`/media/${r.generation_id}`} className="plain-link">
                      {r.generations?.place_name ?? "view"}
                    </Link>
                  ) : r.error ? (
                    <span className="down">{r.error}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="num">{callCount.get(r.id) ?? 0}</td>
                <td className="num">{fmtMs(r.duration_ms)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  No requests yet. Generate a spot in the main app or under AI media → New.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
