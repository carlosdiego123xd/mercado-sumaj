import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadFile, publicUrl } from "../lib/storage";
import { CATEGORIES, DELIVERY_STEPS } from "../lib/constants";
import { Card, Btn, Field, SectionTitle, Empty, Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export function SellerPanel() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ products: 0, orders: 0, sales: 0 });

  useEffect(() => {
    (async () => {
      const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("seller_id", profile.seller_id);
      const { data: orders } = await supabase.from("orders").select("total, payment_status").eq("seller_id", profile.seller_id);
      const sales = (orders || []).filter((o) => o.payment_status === "approved").reduce((s, o) => s + Number(o.total), 0);
      setStats({ products: productCount || 0, orders: (orders || []).length, sales });
    })();
  }, [profile.seller_id]);

  return (
    <div>
      <SectionTitle>Panel de vendedor</SectionTitle>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Card style={{ flex: "1 1 160px" }}><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Productos</div><div style={{ fontSize: 26, fontWeight: 700 }}>{stats.products}</div></Card>
        <Card style={{ flex: "1 1 160px" }}><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Pedidos</div><div style={{ fontSize: 26, fontWeight: 700 }}>{stats.orders}</div></Card>
        <Card style={{ flex: "1 1 160px" }}><div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Ventas aprobadas</div><div style={{ fontSize: 26, fontWeight: 700 }}>Bs {stats.sales.toFixed(2)}</div></Card>
      </div>
    </div>
  );
}

export function SellerProducts({ onNew }) {
  const { profile } = useAuth();
  const [products, setProducts] = useState([]);

  async function load() {
    const { data } = await supabase.from("products").select("*").eq("seller_id", profile.seller_id).order("created_at", { ascending: false });
    setProducts(data || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function remove(id) {
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Mis productos</SectionTitle>
        <Btn onClick={onNew}>+ Nuevo producto</Btn>
      </div>
      {products.length === 0 ? <Empty>Todavía no publicaste ningún producto.</Empty> : (
        <div className="grid-products">
          {products.map((p) => (
            <Card key={p.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ aspectRatio: "1/1", background: p.image_path ? `url(${publicUrl("product-images", p.image_path)}) center/cover` : "var(--accent-soft)" }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontWeight: 700, fontSize: 15, margin: "4px 0" }}>Bs {Number(p.price).toFixed(2)}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 8 }}>Stock: {p.stock}</div>
                <Btn size="sm" variant="danger" onClick={() => remove(p.id)}>Eliminar</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function NewProduct({ onDone, onCancel }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({ name: "", description: "", category: CATEGORIES[0], price: "", stock: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!form.name || !form.price) { setError("Completa al menos el nombre y el precio."); return; }
    setSaving(true);
    try {
      let imagePath = null;
      if (file) imagePath = await uploadFile("product-images", file, profile.seller_id);
      const { error: e } = await supabase.from("products").insert({
        seller_id: profile.seller_id, name: form.name, description: form.description, category: form.category,
        price: Number(form.price), stock: Number(form.stock) || 0, image_path: imagePath,
      });
      if (e) throw e;
      onDone();
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div>
      <SectionTitle>Nuevo producto</SectionTitle>
      <Card>
        <Field label="Nombre"><input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Descripción"><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
        <Field label="Categoría">
          <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Precio (Bs)"><input className="input" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} /></Field>
          <Field label="Stock"><input className="input" type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} /></Field>
        </div>
        <Field label="Foto del producto"><input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
        {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn disabled={saving} onClick={save}>{saving ? "Guardando…" : "Publicar producto"}</Btn>
          <Btn variant="outline" onClick={onCancel}>Cancelar</Btn>
        </div>
      </Card>
    </div>
  );
}

export function SellerOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState([]);

  async function load() {
    const { data } = await supabase.from("orders").select("*, order_items(*)").eq("seller_id", profile.seller_id).order("created_at", { ascending: false });
    setOrders(data || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function advance(order) {
    const idx = DELIVERY_STEPS.indexOf(order.order_status);
    const next = DELIVERY_STEPS[Math.min(idx + 1, DELIVERY_STEPS.length - 1)];
    await supabase.from("orders").update({ order_status: next }).eq("id", order.id);
    await supabase.from("notifications").insert({ user_id: order.buyer_id, text: `Tu pedido ahora está: ${next}.` });
    load();
  }

  if (orders.length === 0) return <Empty>Todavía no tienes pedidos.</Empty>;

  return (
    <div>
      <SectionTitle>Pedidos recibidos</SectionTitle>
      {orders.map((o) => (
        <Card key={o.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <Badge tone={o.payment_status === "approved" ? "success" : o.payment_status === "rejected" ? "danger" : "neutral"}>Pago {o.payment_status}</Badge>
            <Badge tone="accent">{o.order_status}</Badge>
          </div>
          {o.order_items.map((it) => (
            <div key={it.id} style={{ fontSize: 14, display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>{it.name} × {it.qty}</span><span>Bs {(it.price * it.qty).toFixed(2)}</span>
            </div>
          ))}
          {o.payment_status === "approved" && o.order_status !== "entregado" && (
            <Btn size="sm" onClick={() => advance(o)} style={{ marginTop: 8 }}>Avanzar estado de entrega</Btn>
          )}
        </Card>
      ))}
    </div>
  );
}
