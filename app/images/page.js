import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDate } from "@/lib/data";
import { DeleteImageButton, ReplaceForm, UploadForm } from "./ImageForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Images" };

const BUCKET = "avatars";

const fmtSize = (b) => (b == null ? "—" : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

// CRUD for every image in storage: member profile photos plus admin uploads.
export default async function ImagesPage() {
  const { db } = await requireAdmin("/images");
  const store = db.storage.from(BUCKET);

  // Storage lists one folder level at a time: folders first, then their files.
  const { data: top, error } = await store.list("", { limit: 1000 });
  if (error) throw new Error(error.message);
  const folders = top.filter((o) => !o.id).map((o) => o.name);
  const lists = await Promise.all(folders.map((f) => store.list(f, { limit: 1000 })));
  const files = lists.flatMap((l, i) =>
    (l.data ?? []).filter((o) => o.id).map((o) => ({ ...o, path: `${folders[i]}/${o.name}` }))
  );
  files.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));

  const { data: profiles } = await db.from("profiles").select("id, email, first_name, last_name, avatar_url");
  const userFor = (path) => {
    const url = store.getPublicUrl(path).data.publicUrl;
    return profiles?.find((p) => p.avatar_url?.startsWith(url));
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Images</h1>
        <p className="subtitle">
          Everything in the <code>{BUCKET}</code> storage bucket: profile photos
          members upload in Little Spots NYC, plus images uploaded here. Replacing an
          image keeps its URL, so profiles that use it update automatically.
        </p>
      </header>

      <details className="crud-panel" open={files.length === 0}>
        <summary className="section-title">+ Upload image</summary>
        <UploadForm />
      </details>

      <p className="result-count">{files.length} images</p>

      <div className="img-grid">
        {files.map((f) => {
          const url = store.getPublicUrl(f.path).data.publicUrl;
          const owner = userFor(f.path);
          return (
            <article key={f.id} className="img-card panel">
              <a href={url} target="_blank" rel="noreferrer" className="img-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${url}?v=${encodeURIComponent(f.updated_at ?? "")}`} alt={f.path} loading="lazy" />
              </a>
              <div className="img-meta">
                <strong className="mono small">{f.path}</strong>
                <span className="row-sub">
                  {fmtSize(f.metadata?.size)} · {f.metadata?.mimetype ?? "?"} · {fmtDate(f.updated_at ?? f.created_at)}
                </span>
                <span className="row-sub">
                  {owner ? `Profile photo of ${displayName(owner)}` : f.path.startsWith("admin/") ? "Admin upload" : "Not in use"}
                </span>
              </div>
              <ReplaceForm path={f.path} />
              <DeleteImageButton path={f.path} usedBy={owner ? displayName(owner) : null} />
            </article>
          );
        })}
      </div>
    </main>
  );
}
