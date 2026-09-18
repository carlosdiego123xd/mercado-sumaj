export function Card({ children, style }) {
  return <div className="card" style={{ padding: 18, ...style }}>{children}</div>;
}

export function Btn({ children, onClick, variant = "primary", size = "md", full, disabled, icon: Icon, type = "button", style }) {
  const cls = `btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${full ? "btn-full" : ""}`;
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} style={style}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 21, margin: 0 }}>{children}</h2>
      {sub && <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: "4px 0 0" }}>{sub}</p>}
    </div>
  );
}

export function Empty({ children }) {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)" }}>{children}</div>;
}

export function StarRating({ value }) {
  return <span style={{ color: "var(--accent)", fontSize: 13 }}>{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span>;
}
