export type DonutSlice = { name: string; allocated: number; logged: number };

const DARK = ["#0b3d2e", "#7ea312", "#2d5a80", "#5b3a75", "#b8860b", "#a4372c", "#4a7c6b", "#8a6f9e"];
const LIGHT = ["#d9ecdf", "#eef5c9", "#d3e2ee", "#e6dcee", "#f0e4c4", "#f1d6d2", "#dcebe5", "#ece3f1"];
const FREE_DARK = "#b9b6a8";
const FREE_LIGHT = "#ebe9df";

const CX = 200;
const CY = 200;
const R_OUT = 160;
const R_IN = 92;

function pt(r: number, a: number): [number, number] {
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

function arc(rO: number, rI: number, a0: number, a1: number): string {
  const end = Math.min(a1, a0 + Math.PI * 2 - 0.0001); // a full circle can't be one arc
  const large = end - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(rO, a0);
  const [x1, y1] = pt(rO, end);
  const [x2, y2] = pt(rI, end);
  const [x3, y3] = pt(rI, a0);
  return `M ${x0} ${y0} A ${rO} ${rO} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rI} ${rI} 0 ${large} 0 ${x3} ${y3} Z`;
}

export default function CapacityDonut({ slices, capacity }: { slices: DonutSlice[]; capacity: number }) {
  const allocated = slices.reduce((s, x) => s + x.allocated, 0);
  const free = Math.max(0, capacity - allocated);
  const whole = Math.max(capacity, allocated); // if over-allocated, the wheel is the allocation
  const over = allocated > capacity;

  if (whole <= 0) {
    return <div className="empty-state">Add team availability and client hours to see the split.</div>;
  }

  let angle = 0;
  const wedges = slices
    .filter((s) => s.allocated > 0)
    .map((s, i) => {
      const span = (s.allocated / whole) * Math.PI * 2;
      const a0 = angle;
      angle += span;
      const pct = Math.min(1, s.logged / s.allocated);
      return { ...s, i, a0, a1: angle, pct };
    });
  const freeWedge = free > 0 ? { a0: angle, a1: Math.PI * 2 } : null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "center" }}>
      <svg
        viewBox="0 0 400 400"
        role="img"
        aria-label="Donut chart of agency capacity by client; the darker fill in each slice shows hours logged against that client's allocation this month"
        style={{ width: 300, maxWidth: "100%", height: "auto" }}
      >
        {wedges.map((w) => (
          <g key={w.name}>
            <title>{`${w.name}: ${w.logged.toFixed(1)}h of ${w.allocated}h logged`}</title>
            <path
              d={arc(R_OUT, R_IN, w.a0, w.a1)}
              fill={LIGHT[w.i % LIGHT.length]}
              style={{ stroke: "var(--paper-raised)", strokeWidth: 2 }}
            />
            {w.pct > 0 && (
              <path
                d={arc(R_IN + (R_OUT - R_IN) * w.pct, R_IN, w.a0, w.a1)}
                fill={DARK[w.i % DARK.length]}
                style={{ stroke: "var(--paper-raised)", strokeWidth: 2 }}
              />
            )}
          </g>
        ))}
        {freeWedge && (
          <g>
            <title>{`Unallocated: ${free.toFixed(1)}h`}</title>
            <path
              d={arc(R_OUT, R_IN, freeWedge.a0, freeWedge.a1)}
              fill={FREE_LIGHT}
              style={{ stroke: "var(--paper-raised)", strokeWidth: 2 }}
            />
          </g>
        )}
        <text x={CX} y={CY - 6} textAnchor="middle" style={{ fontSize: 13, fill: "var(--text-muted)" }}>
          {over ? "Allocated" : "Capacity"}
        </text>
        <text
          x={CX}
          y={CY + 22}
          textAnchor="middle"
          style={{ fontSize: 30, fill: over ? "var(--red)" : "var(--text)", fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          {Math.round(whole)}h
        </text>
      </svg>

      <div style={{ flex: 1, minWidth: 220 }}>
        {wedges.map((w) => (
          <div key={w.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: DARK[w.i % DARK.length], flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{w.name}</span>
            <span className="numeral" style={{ color: "var(--text-muted)" }}>
              {w.logged.toFixed(1)} / {w.allocated}h
            </span>
          </div>
        ))}
        {free > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: FREE_DARK, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Unallocated</span>
            <span className="numeral" style={{ color: "var(--text-muted)" }}>{free.toFixed(1)}h free</span>
          </div>
        )}
        {over && (
          <div className="summary-note" style={{ marginTop: 8, color: "var(--red)" }}>
            Clients are allocated {(allocated - capacity).toFixed(1)}h more than your available capacity.
          </div>
        )}
      </div>
    </div>
  );
}
