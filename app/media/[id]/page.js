import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate } from "@/lib/data";
import { DeleteMediaButton, MediaForm } from "../MediaForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit item" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function MediaDetailPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db } = await requireAdmin(`/media/${id}`);
  if (!UUID.test(id)) notFound();

  const [{ data: item }, { data: votes }, { count: saves }, { data: areas }, { data: profiles }] =
    await Promise.all([
      db.from("generations").select("*").eq("id", id).maybeSingle(),
      db
        .from("votes")
        .select("id, user_id, value, created_at")
        .eq("generation_id", id)
        .order("created_at", { ascending: false }),
      db.from("saves").select("*", { count: "exact", head: true }).eq("generation_id", id),
      db.from("generations").select("neighborhood"),
      db.from("profiles").select("id, email, first_name, last_name"),
    ]);
  if (!item) notFound();

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const up = votes.filter((v) => v.value === 1).length;
  const down = votes.length - up;
  const neighborhoods = [...new Set(areas.map((r) => r.neighborhood))].sort();

  return (
    <main className="page">
      <header className="page-header page-header--row">
        <div>
          <Link href="/media" className="back-link">
            ← AI media
          </Link>
          <h1>{item.place_name}</h1>
          <p className="subtitle">
            Added by{" "}
            <Link href={`/users/${item.user_id}`} className="plain-link">
              {displayName(byId.get(item.user_id))}
            </Link>{" "}
            · {fmtDate(item.created_at)} · model <code>{item.model}</code>
          </p>
        </div>
        <DeleteMediaButton id={item.id} name={item.place_name} votes={votes.length} />
      </header>

      {sp?.created && (
        <p className="form-success" role="status">
          Created. It&apos;s live in the vault now.
        </p>
      )}

      <section className="kpi-grid kpi-grid--small" aria-label="Ratings">
        <div className="kpi">
          <span className="kpi-value">{up - down > 0 ? `+${up - down}` : up - down}</span>
          <span className="kpi-label">Score</span>
        </div>
        <div className="kpi">
          <span className="kpi-value up">{up}</span>
          <span className="kpi-label">▲ Upvotes</span>
        </div>
        <div className="kpi">
          <span className="kpi-value down">{down}</span>
          <span className="kpi-label">▼ Downvotes</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{saves ?? 0}</span>
          <span className="kpi-label">Saves</span>
        </div>
      </section>

      <div className="two-col">
        <section>
          <h2 className="section-title">Edit</h2>
          <MediaForm item={item} neighborhoods={neighborhoods} />
          <details className="panel prompt-box">
            <summary>Prompt sent to the AI</summary>
            <pre>{item.prompt}</pre>
          </details>
        </section>

        <section>
          <h2 className="section-title">Votes on this item ({votes.length})</h2>
          {votes.length === 0 ? (
            <p className="empty">No votes yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Voter</th>
                    <th scope="col">Vote</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {votes.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link href={`/users/${v.user_id}`} className="plain-link">
                          {displayName(byId.get(v.user_id))}
                        </Link>
                      </td>
                      <td className={v.value === 1 ? "up" : "down"}>
                        {v.value === 1 ? "▲ Up" : "▼ Down"}
                      </td>
                      <td className="nowrap">{fmtDate(v.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
