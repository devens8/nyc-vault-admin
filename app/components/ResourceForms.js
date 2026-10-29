"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteResource, saveResource } from "@/lib/resourceActions";

const initial = { ok: false, message: "" };

function Input({ f, value, options }) {
  if (f.type === "bool") {
    return (
      <label className="check">
        <input type="checkbox" name={f.name} defaultChecked={value ?? true} />
        <span>{f.label}</span>
      </label>
    );
  }
  let control;
  if (f.type === "textarea") {
    control = <textarea name={f.name} defaultValue={value ?? ""} rows={3} maxLength={f.max} required={f.required} />;
  } else if (f.type === "select") {
    control = (
      <select name={f.name} defaultValue={value ?? ""} required={f.required}>
        <option value="" disabled>
          Choose…
        </option>
        {options[f.name].map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  } else if (f.type === "number") {
    control = <input type="number" name={f.name} defaultValue={value ?? ""} min={f.min} max={f.max} step={f.step} />;
  } else {
    control = <input name={f.name} defaultValue={value ?? ""} maxLength={f.max} required={f.required} />;
  }
  return (
    <label className="field">
      <span>{f.label}</span>
      {control}
    </label>
  );
}

// Create (no row) or edit (row). On a successful create the form clears so the
// next item can be typed straight away.
export function ResourceForm({ resourceKey, fields, options, row }) {
  const action = saveResource.bind(null, resourceKey, row?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef(null);

  useEffect(() => {
    if (state.ok && !row) formRef.current?.reset();
  }, [state, row]);

  return (
    <form ref={formRef} action={formAction} className="form crud-form">
      <div className="crud-fields">
        {fields.map((f) => (
          <Input key={f.name} f={f} value={row?.[f.name]} options={options} />
        ))}
      </div>
      {state.message && (
        <p className={state.ok ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Saving…" : row ? "Save changes" : "Create"}
        </button>
      </div>
    </form>
  );
}

export function DeleteRowButton({ resourceKey, id, label }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete() {
    if (!window.confirm(`Delete "${label}"? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteResource(resourceKey, id);
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
