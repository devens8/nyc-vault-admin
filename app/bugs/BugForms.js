"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBug, updateBug } from "./actions";
import { STATUS_LABELS } from "./status";

export function TriageForm({ bug }) {
  const [state, formAction, pending] = useActionState(updateBug.bind(null, bug.id), { ok: false, message: "" });
  return (
    <form action={formAction} className="form triage">
      <div className="crud-fields">
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={bug.status}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Internal notes</span>
          <textarea name="admin_notes" rows={2} maxLength={2000} defaultValue={bug.admin_notes ?? ""} placeholder="Cause, fix, commit…" />
        </label>
      </div>
      {state.message && (
        <p className={state.ok ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="primary-btn btn-sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <DeleteBugButton id={bug.id} title={bug.title} />
      </div>
    </form>
  );
}

function DeleteBugButton({ id, title }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className="danger-btn btn-sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete the report "${title}"? This can't be undone.`)) return;
        startTransition(async () => {
          const res = await deleteBug(id);
          if (!res.ok) window.alert(res.message);
          else router.refresh();
        });
      }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
