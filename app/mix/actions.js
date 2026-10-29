"use server";

import { revalidatePath } from "next/cache";
import { adminOrError } from "@/lib/auth";

// UPDATE: set every chain's weight in one go. Weights are relative (they don't
// have to add up to 100); a weight of 0 takes the chain out of rotation.
export async function updateMix(prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };

  const rows = [];
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("w_")) continue;
    const weight = Number(v);
    if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
      return { ok: false, message: "Weights must be whole numbers from 0 to 100." };
    }
    rows.push({ chain_id: Number(k.slice(2)), weight, updated_at: new Date().toISOString() });
  }
  if (!rows.some((r) => r.weight > 0)) {
    return { ok: false, message: "At least one chain needs a weight above 0, or generation stops working." };
  }

  const { error } = await auth.db.from("prompt_chain_mix").upsert(rows, { onConflict: "chain_id" });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/mix");
  revalidatePath("/chains");
  return { ok: true, message: "Mix updated. New generations use it immediately." };
}
