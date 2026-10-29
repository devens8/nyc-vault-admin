import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { fmtDate } from "@/lib/data";
import MixForm from "./MixForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prompt chain mix" };

// READ/UPDATE: how often each chain is picked for a new generation.
export default async function MixPage() {
  const { db } = await requireAdmin("/mix");
  const [chains, mix] = await Promise.all([
    db.from("prompt_chains").select("id, slug, name").order("id"),
    db.from("prompt_chain_mix").select("chain_id, weight, updated_at"),
  ]);
  if (chains.error || mix.error) throw new Error((chains.error || mix.error).message);

  const rows = chains.data.map((c) => ({
    ...c,
    weight: mix.data.find((m) => m.chain_id === c.id)?.weight ?? 0,
  }));
  const lastUpdate = mix.data.map((m) => m.updated_at).sort().pop();

  return (
    <main className="page">
      <header className="page-header">
        <h1>Prompt chain mix</h1>
        <p className="subtitle">
          Each new generation picks a <Link href="/chains" className="plain-link">prompt chain</Link>{" "}
          at random, weighted by these numbers. Use it to A/B test chains, then
          compare them on the <Link href="/requests" className="plain-link">requests</Link> page.
          {lastUpdate && <> Last changed {fmtDate(lastUpdate)}.</>}
        </p>
      </header>
      <MixForm chains={rows} />
    </main>
  );
}
