// Small shared bits for the request / LLM response log pages.

export const fmtMs = (ms) =>
  ms == null ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

export function StatusTag({ status }) {
  const cls = status === "succeeded" ? "tag tag--ok" : status === "failed" ? "tag tag--bad" : "tag";
  return <span className={cls}>{status}</span>;
}
