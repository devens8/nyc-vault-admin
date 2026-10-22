"use client";

import { useActionState, useTransition } from "react";
import { createManual, createWithAI, deleteMedia, updateMedia } from "./actions";

const initial = { ok: false, message: "" };

export const CATEGORIES = [
  "Hidden Gem", "Eats", "Coffee", "Views", "Nightlife",
  "Culture", "Outdoors", "Date Night", "Cheap Thrills",
];

function Status({ state }) {
  if (!state.message) return null;
  return (
    <p className={state.ok ? "form-success" : "form-error"} role="status">
      {state.message}
    </p>
  );
}

function Field({ label, name, defaultValue, textarea, list, maxLength, rows = 4 }) {
  return (
    <label className="field">
      <span>{label}</span>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} rows={rows} maxLength={maxLength} required />
      ) : (
        <input name={name} defaultValue={defaultValue} list={list} maxLength={maxLength} required />
      )}
    </label>
  );
}

function CategoryOptions() {
  return (
    <datalist id="categories">
      {CATEGORIES.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  );
}

// Create-by-hand and edit share the same fields.
export function MediaForm({ item, neighborhoods }) {
  const action = item ? updateMedia.bind(null, item.id) : createManual;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="panel form">
      <Field label="Place name" name="place_name" defaultValue={item?.place_name} maxLength={120} />
      <div className="form-grid">
        <Field label="Neighborhood" name="neighborhood" defaultValue={item?.neighborhood} list="neighborhoods" maxLength={60} />
        <Field label="Vibe / category" name="category" defaultValue={item?.category} list="categories" maxLength={40} />
      </div>
      <Field label="Blurb" name="blurb" defaultValue={item?.blurb} textarea maxLength={1200} rows={6} />
      <datalist id="neighborhoods">
        {neighborhoods.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <CategoryOptions />
      <Status state={state} />
      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Saving…" : item ? "Save changes" : "Create item"}
        </button>
      </div>
    </form>
  );
}

export function AiCreateForm({ neighborhoods }) {
  const [state, formAction, pending] = useActionState(createWithAI, initial);

  return (
    <form action={formAction} className="panel form">
      <div className="form-grid">
        <Field label="Neighborhood" name="neighborhood" list="neighborhoods-ai" maxLength={60} />
        <Field label="Vibe / category" name="category" list="categories" maxLength={40} />
      </div>
      <label className="field">
        <span>Notes for the AI (optional)</span>
        <input name="notes" maxLength={200} placeholder="e.g. open late, under $20" />
      </label>
      <datalist id="neighborhoods-ai">
        {neighborhoods.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <CategoryOptions />
      <Status state={state} />
      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Generating… (can take ~30s)" : "Generate with Gemini"}
        </button>
      </div>
    </form>
  );
}

export function DeleteMediaButton({ id, name, votes }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const extra = votes ? ` Its ${votes} vote${votes === 1 ? "" : "s"} will be deleted too.` : "";
    if (!window.confirm(`Delete "${name}"?${extra} This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteMedia(id);
      if (res && !res.ok) window.alert(res.message);
    });
  }

  return (
    <button type="button" className="danger-btn" onClick={onDelete} disabled={pending}>
      {pending ? "Deleting…" : "Delete item"}
    </button>
  );
}
