import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { RESOURCES } from "@/lib/resources";
import { fmtDate } from "@/lib/data";
import { DeleteRowButton, ResourceForm } from "./ResourceForms";

// Generic list + create + edit + delete screen for a table in lib/resources.js.
// Editing uses ?edit=<id> so the form gets the full page width.
export default async function ResourcePage({ resourceKey, searchParams }) {
  const res = RESOURCES[resourceKey];
  const params = await searchParams;
  const { db } = await requireAdmin(res.path);

  const refFields = res.fields.filter((f) => f.ref);
  const [{ data: rows, error }, ...refs] = await Promise.all([
    db.from(res.table).select("*").order(res.order[0], { ascending: res.order[1] }),
    ...refFields.map((f) => db.from(f.ref.table).select(`id, ${f.ref.label}`).order(f.ref.label)),
  ]);
  if (error) throw new Error(error.message);

  // { fieldName: [{ value, label }] } for selects, plus a lookup for display.
  const options = {};
  refFields.forEach((f, i) => {
    options[f.name] = (refs[i].data ?? []).map((r) => ({ value: r.id, label: r[f.ref.label] }));
  });
  const display = (f, v) => {
    if (v == null || v === "") return <span className="muted">—</span>;
    if (f.type === "bool") return v ? <span className="tag tag--ok">Yes</span> : <span className="tag">No</span>;
    if (f.ref) return options[f.name].find((o) => o.value === v)?.label ?? `#${v}`;
    const s = String(v);
    return s.length > 140 ? `${s.slice(0, 140)}…` : s;
  };

  const q = (params?.q ?? "").trim().toLowerCase();
  const shown = rows.filter(
    (r) => !q || res.search.map((k) => r[k] ?? "").join(" ").toLowerCase().includes(q)
  );
  const editing = params?.edit ? rows.find((r) => String(r.id) === params.edit) : null;

  return (
    <main className="page">
      <header className="page-header">
        <h1>{res.title}</h1>
        <p className="subtitle">{res.blurb}</p>
      </header>

      {editing ? (
        <section className="crud-panel" aria-label="Edit">
          <div className="crud-panel-head">
            <h2 className="section-title">Edit #{editing.id}</h2>
            <Link href={res.path} className="clear-link">
              Close
            </Link>
          </div>
          <ResourceForm key={editing.id} resourceKey={resourceKey} fields={res.fields} options={options} row={editing} />
        </section>
      ) : (
        <details className="crud-panel" open={rows.length === 0}>
          <summary className="section-title">+ Add new</summary>
          <ResourceForm resourceKey={resourceKey} fields={res.fields} options={options} />
        </details>
      )}

      <form className="toolbar" action={res.path}>
        <input
          className="search"
          type="search"
          name="q"
          defaultValue={params?.q ?? ""}
          placeholder="Search…"
          aria-label={`Search ${res.title}`}
        />
        <button type="submit" className="secondary-btn">
          Search
        </button>
        {q && (
          <Link href={res.path} className="clear-link">
            Clear
          </Link>
        )}
      </form>

      <p className="result-count">
        {shown.length} of {rows.length}
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {res.fields.map((f) => (
                <th key={f.name} scope="col">
                  {f.label.replace(/ \(.*\)$/, "")}
                </th>
              ))}
              <th scope="col">Updated</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={editing?.id === r.id ? "row-editing" : ""}>
                {res.fields.map((f, i) => (
                  <td key={f.name} className={i === 0 ? "strong" : f.type === "textarea" ? "cell-wide" : ""}>
                    {display(f, r[f.name])}
                  </td>
                ))}
                <td className="nowrap">{fmtDate(r.updated_at ?? r.created_at)}</td>
                <td className="row-actions">
                  <Link href={`${res.path}?edit=${r.id}`} className="secondary-btn btn-sm">
                    Edit
                  </Link>
                  <DeleteRowButton resourceKey={resourceKey} id={r.id} label={String(r[res.fields[0].name])} />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={res.fields.length + 2} className="empty-cell">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
