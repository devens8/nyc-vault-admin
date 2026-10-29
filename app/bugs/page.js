import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate } from "@/lib/data";
import { TriageForm } from "./BugForms";
import { STATUS_LABELS } from "./status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bug reports" };

const MAIN_APP = "https://designforgenai.vercel.app";
const SEV_CLASS = { high: "tag tag--bad", medium: "tag tag--cat", low: "tag" };

// READ/UPDATE/DELETE: bug reports members file from the main site's footer.
export default async function BugsPage({ searchParams }) {
  const params = await searchParams;
  const { db } = await requireAdmin("/bugs");
  const filter = STATUS_LABELS[params?.s] ? params.s : params?.s === "all" ? "all" : "active";

  const [{ data: bugs, error }, { data: profiles }] = await Promise.all([
    db.from("bug_reports").select("*").order("created_at", { ascending: false }),
    db.from("profiles").select("id, email, first_name, last_name"),
  ]);
  if (error) throw new Error(error.message);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const countOf = (s) => bugs.filter((b) => b.status === s).length;
  const rows = bugs.filter((b) =>
    filter === "all" ? true : filter === "active" ? ["open", "in_progress"].includes(b.status) : b.status === filter
  );
  const tabs = { active: "Needs attention", ...STATUS_LABELS, all: "All" };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Bug reports</h1>
        <p className="subtitle">
          Problems members report with the &ldquo;Report a bug&rdquo; button at
          the bottom of every page on the main site. Each report includes the
          page they were on. Set a status as you work through them.
        </p>
      </header>

      <section className="kpi-grid kpi-grid--small" aria-label="Bug totals">
        <div className="kpi">
          <span className="kpi-value down">{countOf("open")}</span>
          <span className="kpi-label">Open</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{countOf("in_progress")}</span>
          <span className="kpi-label">In progress</span>
        </div>
        <div className="kpi">
          <span className="kpi-value up">{countOf("fixed")}</span>
          <span className="kpi-label">Fixed</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{bugs.filter((b) => b.severity === "high" && b.status === "open").length}</span>
          <span className="kpi-label">Open &amp; high severity</span>
        </div>
      </section>

      <nav className="seg" aria-label="Filter by status">
        {Object.entries(tabs).map(([k, label]) => (
          <Link
            key={k}
            href={k === "active" ? "/bugs" : `/bugs?s=${k}`}
            className={filter === k ? "active" : ""}
            aria-current={filter === k ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <ol className="bug-list">
        {rows.map((b) => (
          <li key={b.id} className="panel bug">
            <details>
              <summary>
                <div className="bug-sum">
                  <strong>{b.title}</strong>
                  <span className="row-sub">
                    #{b.id} · {b.user_id ? displayName(byId.get(b.user_id)) : "deleted user"} · {fmtDate(b.created_at)}
                  </span>
                </div>
                <span className={SEV_CLASS[b.severity]}>{b.severity}</span>
                <span className={b.status === "fixed" ? "tag tag--ok" : b.status === "open" ? "tag tag--bad" : "tag"}>
                  {STATUS_LABELS[b.status]}
                </span>
              </summary>
              <div className="bug-detail">
                <p className="bug-desc">{b.description}</p>
                <dl className="facts">
                  <dt>Page</dt>
                  <dd>
                    {b.page_url ? (
                      <a href={`${MAIN_APP}${b.page_url}`} target="_blank" rel="noreferrer" className="plain-link mono small">
                        {b.page_url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                  <dt>Browser</dt>
                  <dd className="small muted">{b.user_agent ?? "—"}</dd>
                </dl>
                <TriageForm bug={b} />
              </div>
            </details>
          </li>
        ))}
        {rows.length === 0 && <li className="empty">No reports here. 🎉</li>}
      </ol>
    </main>
  );
}
