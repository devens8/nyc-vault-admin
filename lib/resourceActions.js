"use server";

import { revalidatePath } from "next/cache";
import { adminOrError } from "@/lib/auth";
import { RESOURCES } from "@/lib/resources";

// Turn submitted form data into a row, validating against the registry.
function readRow(res, formData) {
  const row = {};
  for (const f of res.fields) {
    if (f.type === "bool") {
      row[f.name] = formData.get(f.name) === "on";
      continue;
    }
    let v = formData.get(f.name)?.toString().trim() ?? "";
    if (f.lower) v = v.toLowerCase();
    if (!v) {
      if (f.required) return { error: `${f.label} is required.` };
      row[f.name] = null;
      continue;
    }
    if (f.type === "number" || f.type === "select") {
      const n = Number(v);
      if (!Number.isFinite(n)) return { error: `${f.label} must be a number.` };
      if (f.type === "number" && (n < f.min || n > f.max)) {
        return { error: `${f.label} must be between ${f.min} and ${f.max}.` };
      }
      row[f.name] = n;
      continue;
    }
    if (v.length > f.max) return { error: `${f.label} is too long (max ${f.max}).` };
    if (f.pattern && !new RegExp(f.pattern).test(v)) return { error: `${f.label} doesn't look right.` };
    row[f.name] = v;
  }
  return { row };
}

function friendly(error, res) {
  if (error.code === "23505") return "That already exists.";
  if (error.code === "23503") return res.inUse ?? "Other records still reference this.";
  return error.message;
}

// CREATE (id = null) or UPDATE.
export async function saveResource(key, id, prevState, formData) {
  const res = RESOURCES[key];
  if (!res) return { ok: false, message: "Unknown table." };
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const { row, error } = readRow(res, formData);
  if (error) return { ok: false, message: error };
  if (res.touch && id) row[res.touch] = new Date().toISOString();

  const q = id
    ? auth.db.from(res.table).update(row, { count: "exact" }).eq("id", id)
    : auth.db.from(res.table).insert(row, { count: "exact" });
  const { error: dbError, count } = await q;
  if (dbError) return { ok: false, message: friendly(dbError, res) };
  if (!count) return { ok: false, message: "That row no longer exists." };

  revalidatePath(res.path);
  return { ok: true, message: id ? "Saved." : "Created.", stamp: Date.now() };
}

export async function deleteResource(key, id) {
  const res = RESOURCES[key];
  if (!res) return { ok: false, message: "Unknown table." };
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const { error } = await auth.db.from(res.table).delete().eq("id", id);
  if (error) return { ok: false, message: friendly(error, res) };

  revalidatePath(res.path);
  return { ok: true };
}
