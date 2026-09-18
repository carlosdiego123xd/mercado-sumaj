export default function BlockedScreen({ notice, onBack }) {
  const dark = { bg: "#171614", card: "#221F1B", line: "#3A362F", text: "#EDEAE3", textSoft: "#A8A296", link: "#6FA8DC" };
  return (
    <div style={{ background: dark.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: dark.card, border: `1px solid ${dark.line}`, borderRadius: 14, padding: 32, width: 460, maxWidth: "100%", color: dark.text }}>
        <h1 style={{ fontFamily: "var(--serif)", fontWeight: 700, fontSize: 28, margin: "0 0 18px" }}>Cuenta bloqueada</h1>
        <p style={{ fontSize: 14, color: dark.textSoft, lineHeight: 1.6, margin: "0 0 16px" }}>
          El equipo de Mercado Sumaj determinó que tu cuenta incumplió nuestros{" "}
          <span style={{ color: dark.link, textDecoration: "underline" }}>Términos de uso</span>.
        </p>
        <p style={{ fontSize: 14, color: dark.textSoft, margin: "0 0 16px" }}>
          Fecha del bloqueo: <strong style={{ color: dark.text }}>{notice.date}</strong>
        </p>
        <p style={{ fontSize: 14, color: dark.textSoft, lineHeight: 1.6, margin: "0 0 16px" }}>
          Nota del administrador: <strong style={{ color: dark.text }}>{notice.reason}</strong>
        </p>
        <p style={{ fontSize: 14, color: dark.textSoft, margin: "0 0 16px" }}>Tu cuenta ha sido deshabilitada.</p>
        <p style={{ fontSize: 14, color: dark.textSoft, lineHeight: 1.6, margin: "0 0 26px" }}>
          Si deseas apelar esta decisión, contáctanos en{" "}
          <a href="mailto:soporte@mercadosumaj.com" style={{ color: dark.link, textDecoration: "underline" }}>soporte@mercadosumaj.com</a>.
        </p>
        <div style={{ textAlign: "center" }}>
          <button onClick={onBack} style={{ fontWeight: 600, fontSize: 14, padding: "9px 26px", borderRadius: 9, border: `1px solid ${dark.line}`, background: "transparent", color: dark.text, cursor: "pointer" }}>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
