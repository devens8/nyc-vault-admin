import "server-only";

// Loads every table the admin console reports on in one round of parallel
// queries. The dataset is small (a class project), so computing stats in JS is
// simpler and clearer than a pile of SQL views.
export async function loadAll(db) {
  const [gens, votes, profiles, saves, users] = await Promise.all([
    db
      .from("generations")
      .select("id, user_id, prompt, neighborhood, category, place_name, blurb, model, created_at")
      .order("created_at", { ascending: false }),
    db.from("votes").select("id, generation_id, user_id, value, created_at"),
    db
      .from("profiles")
      .select("id, email, first_name, last_name, bio, avatar_url, is_superadmin, created_at"),
    db.from("saves").select("user_id, generation_id, created_at"),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const error = gens.error || votes.error || profiles.error || saves.error || users.error;
  if (error) throw new Error(error.message);

  return {
    generations: gens.data,
    votes: votes.data,
    profiles: profiles.data,
    saves: saves.data,
    authUsers: users.data.users,
  };
}

export function displayName(p) {
  if (!p) return "unknown";
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return name || p.email || "unnamed";
}

// Per-generation tallies: { up, down, score, total, saves }.
export function tallyByGeneration(votes, saves = []) {
  const map = new Map();
  const get = (id) => {
    if (!map.has(id)) map.set(id, { up: 0, down: 0, score: 0, total: 0, saves: 0 });
    return map.get(id);
  };
  for (const v of votes) {
    const t = get(v.generation_id);
    if (v.value === 1) t.up++;
    else t.down++;
    t.score += v.value;
    t.total++;
  }
  for (const s of saves) get(s.generation_id).saves++;
  return (id) => map.get(id) ?? { up: 0, down: 0, score: 0, total: 0, saves: 0 };
}

export function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}
