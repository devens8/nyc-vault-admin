"use server";

import { revalidatePath } from "next/cache";
import { adminOrError } from "@/lib/auth";

// Grant or revoke superadmin. Guards: you can't change your own role (so you
// can't lock yourself out by accident), and the last admin can't be removed.
export async function setSuperadmin(id, makeAdmin) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };
  if (id === auth.user.id) return { ok: false, message: "You can't change your own role." };

  if (!makeAdmin) {
    const { count } = await auth.db
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_superadmin", true);
    if ((count ?? 0) <= 1) return { ok: false, message: "There must always be at least one admin." };
  }

  const { error, count } = await auth.db
    .from("profiles")
    .update({ is_superadmin: Boolean(makeAdmin) }, { count: "exact" })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };
  if (!count) return { ok: false, message: "That user no longer exists." };

  revalidatePath("/permissions");
  revalidatePath("/users", "layout");
  return { ok: true };
}
