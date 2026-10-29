import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { displayName, fmtDay, loadAll, tallyByGeneration, wordCount } from "@/lib/data";
import { ColumnChart, DivergingBars, HBarChart } from "./components/Charts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

const MAX_DAYS = 60;

// Bucket ISO timestamps into daily counts (America/New_York calendar days),
// from the first-ever record through today, capped at MAX_DAYS.
function dailySinceLaunch(items, firstIso) {
  const key = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const n = Math.min(
    MAX_DAYS,
    Math.max(7, Math.ceil((Date.now() - new Date(firstIso ?? Date.now()).getTime()) / 86400000) + 1)
  );
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({ key: key(d), label: fmtDay(d.toISOString()), value: 0 });
  }
  const idx = new Map(days.map((d, i) => [d.key, i]));
  for (const it of items) {
    const i = idx.get(key(new Date(it.created_at)));
    if (i !== undefined) days[i].value++;
  }
  return days;
}

export default async function Overview() {
  const { db } = await requireAdmin("/");
  const { generations, votes, profiles, saves } = await loadAll(db);

  const tally = tallyByGeneration(votes, saves);
  const firstIso = generations.at(-1)?.created_at;
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const ups = votes.filter((v) => v.value === 1).length;
  const approval = votes.length ? Math.round((ups / votes.length) * 100) : 0;
  const avgWords = generations.length
    ? Math.round(generations.reduce((s, g) => s + wordCount(g.blurb), 0) / generations.length)
    : 0;

  const kpis = [
    { label: "AI spots generated", value: generations.length, href: "/media" },
    { label: "Members", value: profiles.length, href: "/users" },
    { label: "Votes cast", value: votes.length, href: "/votes" },
    { label: "Approval rate", value: `${approval}%`, sub: `${ups} up · ${votes.length - ups} down`, href: "/votes" },
    { label: "Saved to lists", value: saves.length },
    { label: "Avg words per AI blurb", value: avgWords },
  ];

  // --- Superlatives -------------------------------------------------------
  const withTally = generations.map((g) => ({ ...g, t: tally(g.id) }));
  const pick = (list, score) =>
    list.length ? list.reduce((best, x) => (score(x) > score(best) ? x : best)) : null;

  const loved = pick(withTally.filter((g) => g.t.total), (g) => g.t.score * 100 + g.t.up);
  const divisive = pick(
    withTally.filter((g) => g.t.up && g.t.down),
    (g) => Math.min(g.t.up, g.t.down) * 100 + g.t.total
  );
  const mostSaved = pick(withTally.filter((g) => g.t.saves), (g) => g.t.saves);

  const perUser = new Map();
  const u = (id) => {
    if (!perUser.has(id)) perUser.set(id, { spots: 0, ups: 0, downs: 0, earned: 0 });
    return perUser.get(id);
  };
  for (const g of withTally) {
    u(g.user_id).spots++;
    u(g.user_id).earned += g.t.score;
  }
  for (const v of votes) v.value === 1 ? u(v.user_id).ups++ : u(v.user_id).downs++;
  const users = [...perUser.entries()].map(([id, s]) => ({ id, ...s, name: displayName(byId.get(id)) }));
  const critic = pick(users.filter((x) => x.downs), (x) => x.downs * 100 - x.ups);
  const hype = pick(users.filter((x) => x.ups), (x) => x.ups * 100 - x.downs);
  const scout = pick(users.filter((x) => x.spots), (x) => x.spots * 100 + x.earned);

  const superlatives = [
    loved && {
      title: "Most loved spot",
      main: loved.place_name,
      detail: `score ${loved.t.score > 0 ? "+" : ""}${loved.t.score} · ▲${loved.t.up} ▼${loved.t.down}`,
      href: `/media/${loved.id}`,
    },
    divisive && {
      title: "Most divisive spot",
      main: divisive.place_name,
      detail: `split ▲${divisive.t.up} / ▼${divisive.t.down}`,
      href: `/media/${divisive.id}`,
    },
    mostSaved && {
      title: "Most saved",
      main: mostSaved.place_name,
      detail: `on ${mostSaved.t.saves} want-to-go list${mostSaved.t.saves === 1 ? "" : "s"}`,
      href: `/media/${mostSaved.id}`,
    },
    scout && {
      title: "Top scout",
      main: scout.name,
      detail: `${scout.spots} spot${scout.spots === 1 ? "" : "s"} added · ${scout.earned >= 0 ? "+" : ""}${scout.earned} earned`,
      href: `/users/${scout.id}`,
    },
    hype && {
      title: "Biggest hype person",
      main: hype.name,
      detail: `${hype.ups} upvote${hype.ups === 1 ? "" : "s"} given`,
      href: `/users/${hype.id}`,
    },
    critic && {
      title: "Harshest critic",
      main: critic.name,
      detail: `${critic.downs} downvote${critic.downs === 1 ? "" : "s"} given`,
      href: `/users/${critic.id}`,
    },
  ].filter(Boolean);

  // --- Charts --------------------------------------------------------------
  const byArea = new Map();
  for (const g of withTally) {
    const a = byArea.get(g.neighborhood) ?? { count: 0, score: 0 };
    a.count++;
    a.score += g.t.score;
    byArea.set(g.neighborhood, a);
  }
  const areaRows = [...byArea.entries()]
    .map(([label, a]) => ({
      label,
      value: a.count,
      sub: `avg ${(a.score / a.count >= 0 ? "+" : "") + (a.score / a.count).toFixed(1)}`,
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  const byCat = new Map();
  for (const g of withTally) {
    const c = byCat.get(g.category) ?? { up: 0, down: 0 };
    c.up += g.t.up;
    c.down += g.t.down;
    byCat.set(g.category, c);
  }
  const catRows = [...byCat.entries()]
    .map(([label, c]) => ({ label, ...c }))
    .sort((a, b) => b.up - b.down - (a.up - a.down) || a.label.localeCompare(b.label));

  return (
    <main className="page">
      <header className="page-header">
        <h1>Overview</h1>
        <p className="subtitle">
          What&apos;s happening in Little Spots NYC: what the AI is suggesting, and what
          the community thinks of it.
        </p>
      </header>

      <section className="kpi-grid" aria-label="Key numbers">
        {kpis.map((k) => {
          const body = (
            <>
              <span className="kpi-value">{k.value}</span>
              <span className="kpi-label">{k.label}</span>
              {k.sub && <span className="kpi-sub">{k.sub}</span>}
            </>
          );
          return k.href ? (
            <Link key={k.label} href={k.href} className="kpi">
              {body}
            </Link>
          ) : (
            <div key={k.label} className="kpi">
              {body}
            </div>
          );
        })}
      </section>

      <h2 className="section-title">Superlatives</h2>
      {superlatives.length === 0 ? (
        <p className="empty">Not enough votes yet for superlatives.</p>
      ) : (
        <section className="sup-grid">
          {superlatives.map((s) => (
            <Link key={s.title} href={s.href} className="sup">
              <span className="sup-title">{s.title}</span>
              <span className="sup-main">{s.main}</span>
              <span className="sup-detail">{s.detail}</span>
            </Link>
          ))}
        </section>
      )}

      <div className="chart-grid">
        <DivergingBars title="Love vs. hate by vibe" rows={catRows} />
        <HBarChart
          title="Where the AI sends people"
          rows={areaRows}
          columns={["Neighborhood", "Spots", "Avg score"]}
        />
        <ColumnChart
          title="Spots generated per day"
          rows={dailySinceLaunch(generations, firstIso)}
          unit="spots"
        />
        <ColumnChart
          title="Votes cast per day"
          rows={dailySinceLaunch(votes, firstIso)}
          unit="votes"
        />
      </div>
    </main>
  );
}
