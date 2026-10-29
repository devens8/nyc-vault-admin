"use client";

import { useActionState, useState } from "react";
import { updateMix } from "./actions";

export default function MixForm({ chains }) {
  const [state, formAction, pending] = useActionState(updateMix, { ok: false, message: "" });
  const [weights, setWeights] = useState(() =>
    Object.fromEntries(chains.map((c) => [c.id, c.weight]))
  );
  const total = Object.values(weights).reduce((s, w) => s + (Number(w) || 0), 0);

  return (
    <form action={formAction} className="panel form">
      <table className="data-table mix-table">
        <thead>
          <tr>
            <th scope="col">Chain</th>
            <th scope="col">Weight (0–100)</th>
            <th scope="col">Share of new generations</th>
          </tr>
        </thead>
        <tbody>
          {chains.map((c) => {
            const share = total ? ((Number(weights[c.id]) || 0) / total) * 100 : 0;
            return (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <span className="row-sub">{c.slug}</span>
                </td>
                <td>
                  <input
                    type="number"
                    name={`w_${c.id}`}
                    min={0}
                    max={100}
                    step={1}
                    value={weights[c.id]}
                    onChange={(e) => setWeights({ ...weights, [c.id]: e.target.value })}
                    className="mix-input"
                    aria-label={`Weight for ${c.name}`}
                    required
                  />
                </td>
                <td>
                  <div className="mix-bar" aria-hidden="true">
                    <span style={{ width: `${share}%` }} />
                  </div>
                  <span className="num">{share.toFixed(0)}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {state.message && (
        <p className={state.ok ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      )}
      <div className="form-actions">
        <button type="submit" className="primary-btn" disabled={pending}>
          {pending ? "Saving…" : "Save mix"}
        </button>
      </div>
    </form>
  );
}
