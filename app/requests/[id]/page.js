import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate } from "@/lib/data";
import { StatusTag, fmtMs } from "@/app/components/LogBits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Request" };

// READ: one generation request and the full trace of LLM calls it made,
// including retries, in order.
export default async function RequestDetail({ params }) {
  const { id } = await params;
  const { db } = await requireAdmin(`/requests/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [{ data: r }, { data: calls }] = await Promise.all([
    db
      .from("generation_requests")
      .select("*, prompt_chains(id, name), generations(place_name, blurb)")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("llm_responses")
      .select("*, prompt_chain_steps(name)")
      .eq("request_id", id)
      .order("created_at"),
  ]);
  if (!r) notFound();
  const { data: author } = r.user_id
    ? await db.from("profiles").select("email, first_name, last_name").eq("id", r.user_id).maybeSingle()
    : { data: null };

  return (
    <main className="page">
      <Link href="/requests" className="back-link">
        ← All requests
      </Link>
      <header className="page-header">
        <h1>
          {r.neighborhood} · {r.category}
        </h1>
        <p className="subtitle">
          <StatusTag status={r.status} /> {fmtDate(r.created_at)} ·{" "}
          {r.user_id ? (
            <Link href={`/users/${r.user_id}`} className="plain-link">
              {displayName(author)}
            </Link>
          ) : (
            "system"
          )}{" "}
          via {r.source} · {fmtMs(r.duration_ms)} total
        </p>
      </header>

      <section className="panel">
        <dl className="facts">
          <dt>Chain</dt>
          <dd>
            {r.prompt_chains ? (
              <Link href={`/chains#chain-${r.prompt_chains.id}`} className="plain-link">
                {r.prompt_chains.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
          <dt>Notes</dt>
          <dd>{r.notes ?? "—"}</dd>
          <dt>Result</dt>
          <dd>
            {r.generation_id ? (
              <Link href={`/media/${r.generation_id}`} className="plain-link">
                {r.generations?.place_name ?? "view item"}
              </Link>
            ) : (
              <span className={r.error ? "down" : ""}>{r.error ?? "—"}</span>
            )}
          </dd>
          <dt>Request ID</dt>
          <dd className="mono">{r.id}</dd>
        </dl>
      </section>

      <h2 className="section-title">LLM calls ({calls?.length ?? 0})</h2>
      <ol className="steps">
        {(calls ?? []).map((c) => (
          <li key={c.id} className="step panel">
            <div className="step-head">
              <span className="step-num">{c.step_order}</span>
              <strong>{c.prompt_chain_steps?.name ?? `Step ${c.step_order}`}</strong>
              <span className="tag">{c.api_model_id}</span>
              {c.attempt > 1 && <span className="tag tag--cat">retry #{c.attempt}</span>}
              <StatusTag status={c.status} />
              <span className="muted mono">
                {fmtMs(c.duration_ms)}
                {c.input_tokens != null && ` · ${c.input_tokens} in / ${c.output_tokens} out tokens`}
                {c.http_status && ` · HTTP ${c.http_status}`}
              </span>
            </div>
            <details className="prompt-box">
              <summary>Prompt sent</summary>
              <pre>{c.prompt}</pre>
            </details>
            <details className="prompt-box" open>
              <summary>{c.status === "succeeded" ? "Model response" : "Error"}</summary>
              <pre>{c.response_text ?? c.error}</pre>
            </details>
          </li>
        ))}
      </ol>
    </main>
  );
}
