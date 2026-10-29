import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/data";
import { StatusTag, fmtMs } from "@/app/components/LogBits";

export const dynamic = "force-dynamic";
export const metadata = { title: "LLM responses" };

const FILTERS = { all: "All", succeeded: "Succeeded", failed: "Failed" };

// READ: every individual LLM call (one per step per attempt), newest first.
export default async function ResponsesPage({ searchParams }) {
  const params = await searchParams;
  const { db } = await requireAdmin("/responses");
  const filter = FILTERS[params?.s] ? params.s : "all";
  const model = params?.model ?? "";

  let q = db
    .from("llm_responses")
    .select("*, prompt_chain_steps(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (filter !== "all") q = q.eq("status", filter);
  if (model) q = q.eq("api_model_id", model);

  const [{ data: rows, error }, { data: stats, error: statsErr }] = await Promise.all([
    q,
    db.from("llm_responses").select("api_model_id, status, duration_ms, input_tokens, output_tokens"),
  ]);
  if (error || statsErr) throw new Error((error || statsErr).message);

  // Per-model rollup for the summary table.
  const byModel = new Map();
  for (const s of stats) {
    const m = byModel.get(s.api_model_id) ?? { calls: 0, ok: 0, ms: 0, tin: 0, tout: 0 };
    m.calls++;
    if (s.status === "succeeded") {
      m.ok++;
      m.ms += s.duration_ms ?? 0;
    }
    m.tin += s.input_tokens ?? 0;
    m.tout += s.output_tokens ?? 0;
    byModel.set(s.api_model_id, m);
  }

  const qs = (over) => {
    const p = new URLSearchParams({ ...(filter !== "all" && { s: filter }), ...(model && { model }), ...over });
    for (const [k, v] of [...p]) if (!v || v === "all") p.delete(k);
    const str = p.toString();
    return str ? `/responses?${str}` : "/responses";
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>LLM responses</h1>
        <p className="subtitle">
          Every call to a model: the exact prompt, the raw output, tokens,
          latency and retries. Click a row&apos;s time to see the whole request
          it belonged to.
        </p>
      </header>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col" className="num">Calls</th>
              <th scope="col" className="num">Success</th>
              <th scope="col" className="num">Avg. latency</th>
              <th scope="col" className="num">Tokens in / out</th>
            </tr>
          </thead>
          <tbody>
            {[...byModel].map(([id, m]) => (
              <tr key={id}>
                <td>
                  <Link href={qs({ model: id })} className="row-link">
                    {id}
                  </Link>
                </td>
                <td className="num">{m.calls}</td>
                <td className="num">{Math.round((m.ok / m.calls) * 100)}%</td>
                <td className="num">{fmtMs(m.ok ? Math.round(m.ms / m.ok) : null)}</td>
                <td className="num">
                  {m.tin.toLocaleString()} / {m.tout.toLocaleString()}
                </td>
              </tr>
            ))}
            {byModel.size === 0 && (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No LLM calls logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="toolbar">
        <nav className="seg" aria-label="Filter by status">
          {Object.entries(FILTERS).map(([k, label]) => (
            <Link key={k} href={qs({ s: k })} className={filter === k ? "active" : ""} aria-current={filter === k ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        {model && (
          <Link href={qs({ model: "" })} className="clear-link">
            Model: {model} ✕
          </Link>
        )}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Step</th>
              <th scope="col">Model</th>
              <th scope="col">Status</th>
              <th scope="col">Output</th>
              <th scope="col" className="num">Tokens</th>
              <th scope="col" className="num">Latency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="nowrap">
                  <Link href={`/requests/${r.request_id}`} className="row-link">
                    {fmtDate(r.created_at)}
                  </Link>
                </td>
                <td>
                  {r.step_order}. {r.prompt_chain_steps?.name ?? "—"}
                  {r.attempt > 1 && <span className="row-sub">retry #{r.attempt}</span>}
                </td>
                <td className="mono small">{r.api_model_id}</td>
                <td>
                  <StatusTag status={r.status} />
                </td>
                <td className="cell-wide">
                  <details className="cell-details">
                    <summary>{(r.response_text ?? r.error ?? "").slice(0, 90)}…</summary>
                    <pre>{r.response_text ?? r.error}</pre>
                  </details>
                </td>
                <td className="num">{r.input_tokens != null ? `${r.input_tokens}/${r.output_tokens}` : "—"}</td>
                <td className="num">{fmtMs(r.duration_ms)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  No matching responses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
