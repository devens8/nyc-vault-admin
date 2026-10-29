"use server";

import { revalidatePath } from "next/cache";
import { adminOrError } from "@/lib/auth";

// Images live in the public "avatars" storage bucket that the main app uploads
// profile photos to (<user id>/avatar.<ext>). Admin uploads go under admin/.
const BUCKET = "avatars";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const SAFE_PATH = /^[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+$/;

function readImage(formData) {
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { error: "Choose an image file." };
  if (!TYPES[file.type]) return { error: "Only JPEG, PNG, WebP or GIF images." };
  if (file.size > MAX_BYTES) return { error: "Images must be under 4 MB." };
  return { file };
}

// CREATE: upload a new image.
export async function uploadImage(prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };
  const { file, error } = readImage(formData);
  if (error) return { ok: false, message: error };

  const base = (formData.get("name")?.toString().trim() || file.name.replace(/\.[^.]+$/, ""))
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
  const path = `admin/${Date.now()}-${base}.${TYPES[file.type]}`;

  const { error: upErr } = await auth.db.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/images");
  return { ok: true, message: `Uploaded ${path}.`, stamp: Date.now() };
}

// UPDATE: replace an image's contents in place (same path, so anything that
// links to it, like a profile's avatar_url, keeps working).
export async function replaceImage(path, prevState, formData) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };
  if (!SAFE_PATH.test(path)) return { ok: false, message: "Bad path." };
  const { file, error } = readImage(formData);
  if (error) return { ok: false, message: error };

  const { error: upErr } = await auth.db.storage
    .from(BUCKET)
    .update(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, message: upErr.message };

  revalidatePath("/images");
  return { ok: true, message: "Replaced.", stamp: Date.now() };
}

// DELETE: remove the file, and clear avatar_url on any profile that used it so
// the main app falls back to initials instead of a broken image.
export async function deleteImage(path) {
  const auth = await adminOrError();
  if (auth.error) return { ok: false, message: auth.error };
  if (!SAFE_PATH.test(path)) return { ok: false, message: "Bad path." };

  const { error } = await auth.db.storage.from(BUCKET).remove([path]);
  if (error) return { ok: false, message: error.message };

  const { data: pub } = auth.db.storage.from(BUCKET).getPublicUrl(path);
  await auth.db.from("profiles").update({ avatar_url: null }).like("avatar_url", `${pub.publicUrl}%`);

  revalidatePath("/images");
  revalidatePath("/users", "layout");
  return { ok: true };
}
