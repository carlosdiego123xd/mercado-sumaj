import { useEffect, useState } from "react";
import { supabase, supabaseAction } from "../lib/supabaseClient";
import { signedUrl } from "../lib/storage";
import { Card, Btn, Field, SectionTitle, Empty, Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

async function logAction(adminId, text) {
  await supabase.from("admin_log").insert({ admin_id: adminId, text });
}

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: sellers }, { count: products }, { data: orders }, { count: pendingVer }, { count: pendingPay }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("sellers").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total, payment_status"),
        supabase.from("verifications").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("payment_status", "pending"),
      ]);
      const revenue = (orders || []).filter((o) => o.payment_status === "approved").reduce((s, o) => s + Number(o.total), 0);
      setStats({ users, sellers, products, revenue, pendingVer, pendingPay });
    })();
  }, []);

  if (!stats) return <Empty>Cargando…</Empty>;

  const cards = [
    ["Usuarios registrados", stats.users], ["Tiendas activas", stats.sellers], ["Productos publicados", stats.products],
    ["Ingresos aprobados", `Bs ${stats.revenue.toFixed(2)}`], ["Verificaciones pendientes", stats.pendingVer], ["Pagos por revisar", stats.pendingPay],
  ];
  return (
    <div>
      <SectionTitle>Panel de administración</SectionTitle>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {cards.map(([label, value]) => (
          <Card key={label} style={{ flex: "1 1 200px" }}>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [blocking, setBlocking] = useState(null);
  const [reason, setReason] = useState("");
  const roleLabel = { comprador: "Comprador", vendedor: "Vendedor", admin: "Administrador" };

  async function load() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
  }
  useEffect(() => { load(); }, []);

  async function toggleBlock(u, willBlock) {
    const patch = willBlock
      ? { blocked: true, blocked_reason: reason || "No se especificó un motivo.", blocked_at: new Date().toISOString() }
      : { blocked: false, blocked_reason: null, blocked_at: null };
    await supabase.from("profiles").update(patch).eq("id", u.id);
    await logAction(profile.id, `Admin ${willBlock ? "bloqueó" : "desbloqueó"} la cuenta de ${u.full_name || u.email}`);
    setBlocking(null); setReason("");
    load();
  }

  return (
    <div>
      <SectionTitle sub="Cuentas reales registradas en Mercado Sumaj">Administración de usuarios</SectionTitle>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {users.map((u, i) => (
          <div key={u.id} style={{ padding: 14, borderBottom: i < users.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name || "(sin nombre)"}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{u.email} · {roleLabel[u.role] || u.role}</div>
                {u.blocked && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 3 }}>Bloqueada el {new Date(u.blocked_at).toLocaleDateString("es-BO", { day: "2-digit", month: "long", year: "numeric" })} · Motivo: {u.blocked_reason}</div>}
              </div>
              {u.blocked ? <Badge tone="danger">Bloqueado</Badge> : <Badge tone="success">Activo</Badge>}
              {u.role !== "admin" && (
                <Btn size="sm" variant={u.blocked ? "outline" : "danger"} onClick={() => u.blocked ? toggleBlock(u, false) : (setBlocking(blocking === u.id ? null : u.id), setReason(""))}>
                  {u.blocked ? "Desbloquear" : "Bloquear"}
                </Btn>
              )}
            </div>
            {blocking === u.id && (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <input className="input" placeholder="Motivo del bloqueo" value={reason} onChange={(e) => setReason(e.target.value)} />
                <Btn size="sm" variant="danger" onClick={() => toggleBlock(u, true)}>Confirmar bloqueo</Btn>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

export function AdminVerifications() {
  const { profile } = useAuth();
  const [list, setList] = useState([]);
  const [urls, setUrls] = useState({});
  const [reasonFor, setReasonFor] = useState(null);
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await supabase.from("verifications").select("*, profiles!verifications_user_id_fkey(email, full_name)").eq("status", "pending").order("created_at", { ascending: false });
    setList(data || []);
    for (const v of data || []) {
      const front = await signedUrl("verification-docs", v.id_front_path);
      const back = await signedUrl("verification-docs", v.id_back_path);
      const selfie = await signedUrl("verification-docs", v.selfie_path);
      setUrls((u) => ({ ...u, [v.id]: { front, back, selfie } }));
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function approve(v) {
    const { data: seller } = await supabase.from("sellers").insert({ owner_id: v.user_id, name: v.full_name }).select().single();
    await supabase.from("profiles").update({ role: "vendedor", seller_id: seller.id, identity_status: "verified" }).eq("id", v.user_id);
    await supabase.from("verifications").update({ status: "verified" }).eq("id", v.id);
    await supabase.from("notifications").insert({ user_id: v.user_id, text: "Tu identidad fue verificada. ¡Ya puedes vender!" });
    await logAction(profile.id, `Admin aprobó la verificación de ${v.full_name}`);
    load();
  }
  async function reject(v) {
    await supabase.from("verifications").update({ status: "rejected", rejection_reason: reason }).eq("id", v.id);
    await supabase.from("profiles").update({ identity_status: "rejected" }).eq("id", v.user_id);
    await supabase.from("notifications").insert({ user_id: v.user_id, text: `Tu verificación fue rechazada: ${reason || "documento no legible"}` });
    await logAction(profile.id, `Admin rechazó la verificación de ${v.full_name} (motivo: ${reason})`);
    setReasonFor(null); setReason("");
    load();
  }

  if (list.length === 0) return <Empty>No hay verificaciones pendientes.</Empty>;

  return (
    <div>
      <SectionTitle>Verificaciones pendientes</SectionTitle>
      {list.map((v) => (
        <Card key={v.id} style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700 }}>{v.full_name}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>{v.profiles?.email} · nacido {v.birth_date}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {["front", "back", "selfie"].map((k) => urls[v.id]?.[k] && (
              <a key={k} href={urls[v.id][k]} target="_blank" rel="noreferrer"><img src={urls[v.id][k]} alt={k} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} /></a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={() => approve(v)}>Aprobar</Btn>
            <Btn size="sm" variant="danger" onClick={() => setReasonFor(reasonFor === v.id ? null : v.id)}>Rechazar</Btn>
          </div>
          {reasonFor === v.id && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <input className="input" placeholder="Motivo del rechazo" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Btn size="sm" variant="danger" onClick={() => reject(v)}>Confirmar rechazo</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function AdminPayments() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [urls, setUrls] = useState({});
  const [reasonFor, setReasonFor] = useState(null);
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await supabase.from("orders").select("*, order_items(*), sellers(name), profiles!orders_buyer_id_fkey(email, full_name)").eq("payment_status", "pending").order("created_at", { ascending: false });
    setOrders(data || []);
    for (const o of data || []) {
      const u = await signedUrl("payment-proofs", o.proof_path);
      setUrls((s) => ({ ...s, [o.id]: u }));
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function approve(o) {
    await supabase.from("orders").update({ payment_status: "approved", order_status: "preparando" }).eq("id", o.id);
    await supabase.from("notifications").insert({ user_id: o.buyer_id, text: "Tu pago fue aprobado. Tu pedido está en preparación." });
    await logAction(profile.id, `Admin aprobó el pago del pedido ${o.id.slice(0, 8)}`);
    load();
  }
  async function reject(o) {
    await supabase.from("orders").update({ payment_status: "rejected", order_status: "cancelado", rejection_reason: reason }).eq("id", o.id);
    await supabase.from("notifications").insert({ user_id: o.buyer_id, text: `Tu pago fue rechazado: ${reason || "comprobante no válido"}` });
    await logAction(profile.id, `Admin rechazó el pago del pedido ${o.id.slice(0, 8)} (motivo: ${reason})`);
    setReasonFor(null); setReason("");
    load();
  }

  if (orders.length === 0) return <Empty>No hay pagos pendientes por revisar.</Empty>;

  return (
    <div>
      <SectionTitle>Pagos por revisar</SectionTitle>
      {orders.map((o) => (
        <Card key={o.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <div><strong>{o.profiles?.full_name}</strong> ({o.profiles?.email}) → {o.sellers?.name}</div>
            <div style={{ fontWeight: 700 }}>Bs {Number(o.total).toFixed(2)}</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10 }}>Método: {o.payment_method === "qr" ? "QR" : "Transferencia bancaria"}</div>
          {urls[o.id] && <a href={urls[o.id]} target="_blank" rel="noreferrer"><img src={urls[o.id]} alt="comprobante" style={{ width: 160, borderRadius: 8, border: "1px solid var(--line)", marginBottom: 10 }} /></a>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={() => approve(o)}>Aprobar pago</Btn>
            <Btn size="sm" variant="danger" onClick={() => setReasonFor(reasonFor === o.id ? null : o.id)}>Rechazar</Btn>
          </div>
          {reasonFor === o.id && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <input className="input" placeholder="Motivo del rechazo" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Btn size="sm" variant="danger" onClick={() => reject(o)}>Confirmar rechazo</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function AdminCreateUser() {
  const { profile } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "comprador" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function create() {
    setMessage(""); setSaving(true);
    try {
      const { data, error } = await supabaseAction.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName } } });
      if (error) throw error;
      if (form.role !== "comprador" && data.user) {
        if (form.role === "admin") {
          await supabase.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
        } else if (form.role === "vendedor") {
          const { data: seller } = await supabase.from("sellers").insert({ owner_id: data.user.id, name: form.fullName }).select().single();
          await supabase.from("profiles").update({ role: "vendedor", seller_id: seller.id, identity_status: "verified" }).eq("id", data.user.id);
        }
      }
      await logAction(profile.id, `Admin creó la cuenta ${form.email} (${form.role})`);
      await supabaseAction.auth.signOut(); // limpia esa sesión temporal, tu sesión de admin no se toca
      setMessage(`Cuenta creada: ${form.email}. Ya puede iniciar sesión con la contraseña que definiste.`);
      setForm({ fullName: "", email: "", password: "", role: "comprador" });
    } catch (e) {
      setMessage(e.message);
    }
    setSaving(false);
  }

  return (
    <div>
      <SectionTitle sub="Crea cuentas de empleados, vendedores u otros administradores sin salir de la app">Crear usuario</SectionTitle>
      <Card style={{ maxWidth: 420 }}>
        <Field label="Nombre completo"><input className="input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></Field>
        <Field label="Correo electrónico"><input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
        <Field label="Contraseña"><input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></Field>
        <Field label="Rol">
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="comprador">Comprador</option>
            <option value="vendedor">Vendedor (sin pasar por verificación)</option>
            <option value="admin">Administrador</option>
          </select>
        </Field>
        {message && <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>{message}</div>}
        <Btn full disabled={saving} onClick={create}>{saving ? "Creando…" : "Crear cuenta"}</Btn>
      </Card>
    </div>
  );
}

export function AdminLog() {
  const [log, setLog] = useState([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("admin_log").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(100);
    setLog(data || []);
  })(); }, []);

  return (
    <div>
      <SectionTitle>Registro de acciones del administrador</SectionTitle>
      {log.length === 0 ? <Empty>Sin actividad todavía.</Empty> : log.map((l) => (
        <Card key={l.id} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13.5 }}>{l.text}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{new Date(l.created_at).toLocaleString("es-BO")}</div>
        </Card>
      ))}
    </div>
  );
}
