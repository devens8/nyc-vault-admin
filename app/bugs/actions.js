"use server";

import { revalidatePath } from "next/cache";
import { adminOrError } from "@/lib/auth";

const STATUSES = ["open", "in_progress", "fixed", "wont_fix"];

// UPDATE: triage a report (status + internal notes).
export async function updateBug(id, prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const status = formData.get("status")?.toString();
  const notes = formData.get("admin_notes")?.toString().trim() || null;
  if (!STATUSES.includes(status)) return { ok: false, message: "Pick a status." };
  if (notes && notes.length > 2000) return { ok: false, message: "Notes are too long (max 2000)." };

  const { error, count } = await auth.db
    .from("bug_reports")
    .update({ status, admin_notes: notes, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  if (!count) return { ok: false, message: "That report no longer exists." };

  revalidatePath("/bugs");
  return { ok: true, message: "Saved." };
}

// DELETE: remove spam or duplicate reports.
export async function deleteBug(id) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };
  const { error } = await auth.db.from("bug_reports").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/bugs");
  return { ok: true };
}
