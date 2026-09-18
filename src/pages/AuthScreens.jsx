import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, Btn, Field } from "../components/ui";

export default function AuthScreens() {
  const { login, register, forgotPassword, completePasswordReset, authError, setAuthError, recoveryMode } = useAuth();
  const [screen, setScreen] = useState("login"); // login | register | forgot
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ fullName: "", email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function goTo(s) { setAuthError(""); setScreen(s); }

  if (recoveryMode) {
    return (
      <Shell>
        <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>
          Escribe tu nueva contraseña
        </p>
        <Field label="Nueva contraseña">
          <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
        {authError && <ErrorMsg>{authError}</ErrorMsg>}
        <Btn full disabled={loading} onClick={async () => { setLoading(true); const ok = await completePasswordReset(newPassword); setLoading(false); if (ok) goTo("login"); }}>
          {loading ? "Guardando…" : "Cambiar contraseña"}
        </Btn>
      </Shell>
    );
  }

  return (
    <Shell>
      {screen === "login" && (
        <>
          <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>Inicia sesión en tu cuenta</p>
          <Field label="Correo electrónico"><input className="input" type="email" placeholder="tucorreo@ejemplo.com" value={loginForm.email} onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Contraseña"><input className="input" type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          {authError && <ErrorMsg>{authError}</ErrorMsg>}
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button className="link" onClick={() => goTo("forgot")} style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12.5, cursor: "pointer" }}>¿Olvidaste tu contraseña?</button>
          </div>
          <Btn full disabled={loading} onClick={async () => { setLoading(true); await login(loginForm); setLoading(false); }}>
            {loading ? "Ingresando…" : "Iniciar sesión"}
          </Btn>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>
            ¿No tienes cuenta? <button onClick={() => goTo("register")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Regístrate</button>
          </p>
        </>
      )}

      {screen === "register" && (
        <>
          <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>Crea tu cuenta de comprador</p>
          <Field label="Nombre completo"><input className="input" placeholder="Tu nombre" value={registerForm.fullName} onChange={(e) => setRegisterForm((f) => ({ ...f, fullName: e.target.value }))} /></Field>
          <Field label="Correo electrónico"><input className="input" type="email" placeholder="tucorreo@ejemplo.com" value={registerForm.email} onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Contraseña"><input className="input" type="password" placeholder="Mínimo 6 caracteres" value={registerForm.password} onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))} /></Field>
          {authError && <ErrorMsg>{authError}</ErrorMsg>}
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 16 }}>Toda cuenta empieza como comprador. Podrás pedir convertirte en vendedor luego de verificar tu identidad.</p>
          <Btn full disabled={loading} onClick={async () => { setLoading(true); const ok = await register(registerForm); setLoading(false); if (ok) goTo("login"); }}>
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </Btn>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>
            ¿Ya tienes cuenta? <button onClick={() => goTo("login")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Inicia sesión</button>
          </p>
        </>
      )}

      {screen === "forgot" && !forgotSent && (
        <>
          <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>Te enviaremos un correo con un enlace para recuperar tu contraseña</p>
          <Field label="Correo electrónico"><input className="input" type="email" placeholder="tucorreo@ejemplo.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} /></Field>
          {authError && <ErrorMsg>{authError}</ErrorMsg>}
          <Btn full onClick={async () => { const ok = await forgotPassword(forgotEmail); if (ok) setForgotSent(true); }}>Enviar enlace de recuperación</Btn>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", marginTop: 18 }}>
            <button onClick={() => goTo("login")} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}>Volver a iniciar sesión</button>
          </p>
        </>
      )}

      {screen === "forgot" && forgotSent && (
        <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
          Te enviamos un correo a <strong>{forgotEmail}</strong> con un enlace para elegir una nueva contraseña.
          Ábrelo desde el mismo dispositivo o navegador donde tienes abierta esta app.
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Card style={{ padding: 32, width: 380, maxWidth: "100%" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 24, marginBottom: 6, textAlign: "center" }}>Mercado Sumaj</div>
        {children}
      </Card>
    </div>
  );
}

function ErrorMsg({ children }) {
  return <div style={{ color: "var(--danger)", fontSize: 12.5, marginBottom: 12 }}>{children}</div>;
}
