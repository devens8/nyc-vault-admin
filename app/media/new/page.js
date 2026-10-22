import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AiCreateForm, MediaForm } from "../MediaForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "New item" };

export default async function NewMediaPage() {
  const { db } = await requireAdmin("/media/new");
  const { data } = await db.from("generations").select("neighborhood");
  const neighborhoods = [...new Set((data ?? []).map((r) => r.neighborhood))].sort();

  return (
    <main className="page">
      <header className="page-header">
        <Link href="/media" className="back-link">
          ← AI media
        </Link>
        <h1>New item</h1>
        <p className="subtitle">
          Generate a spot with the same Gemini prompt the app uses, or write one
          by hand. New items appear in the vault right away, credited to you.
        </p>
      </header>

      <div className="two-col">
        <section>
          <h2 className="section-title">Generate with AI</h2>
          <AiCreateForm neighborhoods={neighborhoods} />
        </section>
        <section>
          <h2 className="section-title">Write by hand</h2>
          <MediaForm neighborhoods={neighborhoods} />
        </section>
      </div>
    </main>
  );
}
