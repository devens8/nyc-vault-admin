import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prompt chains" };

// READ: prompt chains and their steps. The main app runs a chain's steps in
// order; each step's output is available to the next as {{previous_output}}.
export default async function ChainsPage() {
  const { db } = await requireAdmin("/chains");
  const [chains, steps, mix, reqs] = await Promise.all([
    db.from("prompt_chains").select("*").order("id"),
    db
      .from("prompt_chain_steps")
      .select("*, llm_models(name, api_model_id)")
      .order("step_order"),
    db.from("prompt_chain_mix").select("chain_id, weight"),
    db.from("generation_requests").select("chain_id, status"),
  ]);
  const error = chains.error || steps.error || mix.error || reqs.error;
  if (error) throw new Error(error.message);

  const totalWeight = mix.data.reduce((s, m) => s + m.weight, 0);

  return (
    <main className="page">
      <header className="page-header page-header--row">
        <div>
          <h1>Prompt chains</h1>
          <p className="subtitle">
            The multi-step prompts the generator can run, and every step inside
            them. Placeholders like <code>{"{{neighborhood}}"}</code> are filled
            in at run time; <code>{"{{terms}}"}</code> and{" "}
            <code>{"{{examples}}"}</code> come from the Terms and Examples tables.
          </p>
        </div>
        <Link href="/mix" className="secondary-btn">
          Edit mix
        </Link>
      </header>

      {chains.data.map((c) => {
        const mine = steps.data.filter((s) => s.chain_id === c.id);
        const weight = mix.data.find((m) => m.chain_id === c.id)?.weight ?? 0;
        const runs = reqs.data.filter((r) => r.chain_id === c.id);
        const ok = runs.filter((r) => r.status === "succeeded").length;
        return (
          <section key={c.id} className="panel chain" id={`chain-${c.id}`}>
            <div className="chain-head">
              <div>
                <h2 className="chain-name">{c.name}</h2>
                <span className="row-sub">
                  #{c.id} · {c.slug} · created {fmtDate(c.created_at)}
                </span>
              </div>
              <dl className="chain-stats">
                <div>
                  <dt>Mix share</dt>
                  <dd>{totalWeight ? Math.round((weight / totalWeight) * 100) : 0}%</dd>
                </div>
                <div>
                  <dt>Runs</dt>
                  <dd>{runs.length}</dd>
                </div>
                <div>
                  <dt>Success</dt>
                  <dd>{runs.length ? `${Math.round((ok / runs.length) * 100)}%` : "—"}</dd>
                </div>
              </dl>
            </div>
            {c.description && <p className="chain-desc">{c.description}</p>}

            <h3 className="section-title">Steps ({mine.length})</h3>
            <ol className="steps">
              {mine.map((s) => (
                <li key={s.id} className="step">
                  <div className="step-head">
                    <span className="step-num">{s.step_order}</span>
                    <strong>{s.name}</strong>
                    <span className="tag">{s.llm_models?.name ?? "unknown model"}</span>
                    <span className="tag tag--cat">{s.expects_json ? "returns JSON" : "returns text"}</span>
                  </div>
                  <details className="prompt-box">
                    <summary>Prompt template (step #{s.id})</summary>
                    <pre>{s.prompt_template}</pre>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
