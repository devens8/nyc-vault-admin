"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteImage, replaceImage, uploadImage } from "./actions";

const initial = { ok: false, message: "" };
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function Status({ state }) {
  if (!state.message) return null;
  return (
    <p className={state.ok ? "form-success" : "form-error"} role="status">
      {state.message}
    </p>
  );
}

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadImage, initial);
  const ref = useRef(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="form crud-form">
      <div className="crud-fields">
        <label className="field">
          <span>Image (JPEG, PNG, WebP or GIF, under 4 MB)</span>
          <input type="file" name="file" accept={ACCEPT} required />
        </label>
        <label className="field">
          <span>File name (optional)</span>
          <input name="name" maxLength={60} placeholder="e.g. tram-at-sunset" />
        </label>
      </div>
      <Status state={state} />
      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}

export function ReplaceForm({ path }) {
  const [state, formAction, pending] = useActionState(replaceImage.bind(null, path), initial);
  return (
    <form action={formAction} className="img-replace">
      <input type="file" name="file" accept={ACCEPT} required aria-label={`Replacement for ${path}`} />
      <button type="submit" className="secondary-btn btn-sm" disabled={pending}>
        {pending ? "…" : "Replace"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function DeleteImageButton({ path, usedBy }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    const warn = usedBy ? ` It's ${usedBy}'s profile photo; their avatar will be cleared.` : "";
    if (!window.confirm(`Delete ${path}?${warn} This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteImage(path);
      if (!res.ok) window.alert(res.message);
      else router.refresh();
    });
  }

  return (
    <button type="button" className="danger-btn btn-sm" onClick={onDelete} disabled={pending}>
      {pending ? "…" : "Delete"}
    </button>
  );
}
