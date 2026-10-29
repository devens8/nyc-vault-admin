"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSuperadmin } from "./actions";

export default function RoleButton({ id, name, isAdmin, isSelf }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  if (isSelf) return <span className="muted small">That&apos;s you</span>;

  function onClick() {
    const msg = isAdmin
      ? `Remove admin access from ${name}? They'll lose access to this console immediately.`
      : `Make ${name} an admin? They'll be able to see and change everything here.`;
    if (!window.confirm(msg)) return;
    setError("");
    startTransition(async () => {
      const res = await setSuperadmin(id, !isAdmin);
      if (!res.ok) setError(res.message);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className={`${isAdmin ? "danger-btn" : "secondary-btn"} btn-sm`}
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "…" : isAdmin ? "Revoke admin" : "Make admin"}
      </button>
      {error && <span className="row-sub down">{error}</span>}
    </>
  );
}
