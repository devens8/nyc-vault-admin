// Small, dependency-free charts rendered on the server as HTML/CSS.
// Every bar carries a hover/focus tooltip (data-tip) and each chart ships a
// collapsible data table, so values never depend on color alone.

function DataTable({ caption, columns, rows }) {
  return (
    <details className="chart-table">
      <summary>View as table</summary>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// Horizontal bars for a single measure (magnitude) — one hue, no legend.
export function HBarChart({ title, rows, unit = "", columns }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <ul className="hbars">
        {rows.map((r) => (
          <li key={r.label} className="hbar-row">
            <span className="hbar-label">{r.label}</span>
            <span className="hbar-track">
              <span
                className="hbar-fill"
                style={{ width: `${(r.value / max) * 100}%` }}
                data-tip={`${r.label}: ${r.value}${unit}${r.sub ? ` · ${r.sub}` : ""}`}
                tabIndex={0}
              />
            </span>
            <span className="hbar-value">
              {r.value}
              {r.sub && <span className="hbar-sub">{r.sub}</span>}
            </span>
          </li>
        ))}
      </ul>
      <DataTable
        caption={title}
        columns={columns ?? ["Label", "Value"]}
        rows={rows.map((r) => [r.label, r.value, ...(r.sub ? [r.sub] : [])])}
      />
    </figure>
  );
}

// Diverging bars (polarity): downvotes grow left, upvotes grow right from a
// shared zero line. Two series → legend + ▲/▼ glyphs on every value.
export function DivergingBars({ title, rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.up, r.down]));
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="legend" aria-hidden="true">
        <span>
          <i className="swatch swatch--down" /> ▼ Downvotes
        </span>
        <span>
          <i className="swatch swatch--up" /> ▲ Upvotes
        </span>
      </div>
      <ul className="dbars">
        {rows.map((r) => (
          <li key={r.label} className="dbar-row">
            <span className="hbar-label">{r.label}</span>
            <span className="dbar-side dbar-side--down">
              <span className="dbar-num">{r.down ? `▼${r.down}` : ""}</span>
              <span
                className="dbar-fill dbar-fill--down"
                style={{ width: `${(r.down / max) * 100}%` }}
                data-tip={`${r.label}: ${r.down} downvote${r.down === 1 ? "" : "s"}`}
                tabIndex={r.down ? 0 : -1}
              />
            </span>
            <span className="dbar-side dbar-side--up">
              <span
                className="dbar-fill dbar-fill--up"
                style={{ width: `${(r.up / max) * 100}%` }}
                data-tip={`${r.label}: ${r.up} upvote${r.up === 1 ? "" : "s"}`}
                tabIndex={r.up ? 0 : -1}
              />
              <span className="dbar-num">{r.up ? `▲${r.up}` : ""}</span>
            </span>
          </li>
        ))}
      </ul>
      <DataTable
        caption={title}
        columns={["Vibe", "Upvotes", "Downvotes", "Net"]}
        rows={rows.map((r) => [r.label, r.up, r.down, r.up - r.down])}
      />
    </figure>
  );
}

// Column chart for a count over time (single series).
export function ColumnChart({ title, rows, unit }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <figure className="chart">
      <figcaption className="chart-title">
        {title} <span className="chart-total">{total} total</span>
      </figcaption>
      <div className="cols">
        {rows.map((r) => (
          <span key={r.label} className="col">
            <span
              className={`col-fill ${r.value ? "" : "col-fill--zero"}`}
              style={{ height: `${(r.value / max) * 100}%` }}
              data-tip={`${r.label}: ${r.value} ${unit}`}
              tabIndex={0}
            />
          </span>
        ))}
      </div>
      <div className="cols-axis">
        <span>{rows[0]?.label}</span>
        <span>{rows[rows.length - 1]?.label}</span>
      </div>
      <DataTable caption={title} columns={["Day", unit]} rows={rows.map((r) => [r.label, r.value])} />
    </figure>
  );
}
