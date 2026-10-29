"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminOrError } from "@/lib/auth";
import { runGeneration } from "@/lib/pipeline";

const LIMITS = { place_name: 120, neighborhood: 60, category: 40, blurb: 1200, prompt: 4000 };

function readFields(formData, keys) {
  const out = {};
  for (const k of keys) {
    const v = formData.get(k)?.toString().trim() ?? "";
    if (!v) return { error: `${k.replace("_", " ")} is required.` };
    if (v.length > LIMITS[k]) return { error: `${k.replace("_", " ")} is too long (max ${LIMITS[k]}).` };
    out[k] = v;
  }
  return { fields: out };
}

function revalidateAll(id) {
  revalidatePath("/");
  revalidatePath("/media");
  revalidatePath("/users", "layout");
  if (id) revalidatePath(`/media/${id}`);
}

// CREATE (manual): an admin writes the spot by hand. Stored with model
// "manual" so it's distinguishable from AI output in stats.
export async function createManual(prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const { fields, error } = readFields(formData, ["place_name", "neighborhood", "category", "blurb"]);
  if (error) return { ok: false, message: error };

  const { data, error: dbError } = await auth.db
    .from("generations")
    .insert({
      ...fields,
      user_id: auth.user.id,
      prompt: "(created manually in the admin console)",
      model: "manual",
    })
    .select("id")
    .single();
  if (dbError) return { ok: false, message: dbError.message };

  revalidateAll();
  redirect(`/media/${data.id}?created=1`);
}

// CREATE (AI): same DB-driven pipeline the main app uses (prompt chain mix,
// terms, examples), attributed to the admin and logged as source "admin".
export async function createWithAI(prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const { fields, error } = readFields(formData, ["neighborhood", "category"]);
  if (error) return { ok: false, message: error };
  const notes = formData.get("notes")?.toString().trim().slice(0, 200) || null;

  let dossier;
  try {
    dossier = await runGeneration(auth.db, { userId: auth.user.id, source: "admin", ...fields, notes });
  } catch (err) {
    console.error("runGeneration failed:", err);
    return { ok: false, message: `AI generation failed: ${err.message}` };
  }

  const { data, error: dbError } = await auth.db
    .from("generations")
    .insert({
      user_id: auth.user.id,
      neighborhood: fields.neighborhood,
      category: fields.category,
      place_name: dossier.place_name,
      blurb: dossier.blurb,
      prompt: dossier.prompt,
      model: dossier.model,
    })
    .select("id")
    .single();
  if (dbError) {
    await dossier.finish({ status: "failed", error: `Save failed: ${dbError.message}` });
    return { ok: false, message: dbError.message };
  }
  await dossier.finish({ status: "succeeded", generation_id: data.id });

  revalidateAll();
  redirect(`/media/${data.id}?created=1`);
}

// UPDATE: edit the displayed content. Prompt and model are kept as a record of
// how it was generated.
export async function updateMedia(id, prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const { fields, error } = readFields(formData, ["place_name", "neighborhood", "category", "blurb"]);
  if (error) return { ok: false, message: error };

  const { error: dbError, count } = await auth.db
    .from("generations")
    .update(fields, { count: "exact" })
    .eq("id", id);
  if (dbError) return { ok: false, message: dbError.message };
  if (!count) return { ok: false, message: "That item no longer exists." };

  revalidateAll(id);
  return { ok: true, message: "Saved." };
}

// DELETE: removes the item; its votes and saves cascade.
export async function deleteMedia(id) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const { data, error } = await auth.db
    .from("generations")
    .delete()
    .eq("id", id)
    .select("place_name")
    .maybeSingle();
  if (error) return { ok: false, message: error.message };

  revalidateAll(id);
  redirect(`/media?deleted=${encodeURIComponent(data?.place_name ?? "item")}`);
}
