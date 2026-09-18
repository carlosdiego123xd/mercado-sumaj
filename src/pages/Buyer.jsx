import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { uploadFile, publicUrl } from "../lib/storage";
import { CATEGORIES } from "../lib/constants";
import { Card, Btn, Field, SectionTitle, Empty, Badge, StarRating } from "../components/ui";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// INICIO: buscar y explorar productos
// ---------------------------------------------------------------------------
export function BuyerHome({ onOpenProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  async function load() {
    setLoading(true);
    let query = supabase.from("products").select("*, sellers(name)").order("created_at", { ascending: false });
    if (search) query = query.ilike("name", `%${search}%`);
    if (category) query = query.eq("category", category);
    if (minPrice) query = query.gte("price", Number(minPrice));
    if (maxPrice) query = query.lte("price", Number(maxPrice));
    const { data, error } = await query;
    if (!error) setProducts(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <SectionTitle sub="Encuentra productos de vendedores de todo el país">Mercado Sumaj</SectionTitle>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input className="input" style={{ flex: "2 1 200px" }} placeholder="Buscar productos…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" style={{ flex: "1 1 140px" }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas las categorías</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input" style={{ flex: "1 1 100px" }} type="number" placeholder="Precio mín." value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <input className="input" style={{ flex: "1 1 100px" }} type="number" placeholder="Precio máx." value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <Btn onClick={load}>Buscar</Btn>
        </div>
      </Card>

      {loading ? <Empty>Cargando productos…</Empty> : products.length === 0 ? <Empty>No se encontraron productos.</Empty> : (
        <div className="grid-products">
          {products.map((p) => (
            <Card key={p.id} style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
              <button onClick={() => onOpenProduct(p.id)} style={{ all: "unset", display: "block", width: "100%", cursor: "pointer" }}>
                <div style={{ aspectRatio: "1/1", background: p.image_path ? `url(${publicUrl("product-images", p.image_path)}) center/cover` : "var(--accent-soft)" }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{p.sellers?.name}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, margin: "2px 0 4px" }}>{p.name}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Bs {Number(p.price).toFixed(2)}</div>
                  <StarRating value={p.rating} />
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DETALLE DE PRODUCTO
// ---------------------------------------------------------------------------
export function ProductDetail({ productId, onBack, onAddToCart }) {
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("products").select("*, sellers(id, name, description, rating)").eq("id", productId).single();
      setProduct(p);
      const { data: r } = await supabase.from("reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
      setReviews(r || []);
    })();
  }, [productId]);

  if (!product) return <Empty>Cargando…</Empty>;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", marginBottom: 14, fontSize: 13.5 }}>← Volver</button>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", aspectRatio: "1/1", borderRadius: 14, background: product.image_path ? `url(${publicUrl("product-images", product.image_path)}) center/cover` : "var(--accent-soft)" }} />
        <div style={{ flex: "1 1 280px" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{product.sellers?.name}</div>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 24, margin: "4px 0" }}>{product.name}</h1>
          <StarRating value={product.rating} /> <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>({product.reviews_count || 0} reseñas)</span>
          <div style={{ fontWeight: 700, fontSize: 22, margin: "10px 0" }}>Bs {Number(product.price).toFixed(2)}</div>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>{product.description || "Sin descripción."}</p>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>Stock disponible: {product.stock}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input className="input" style={{ width: 70 }} type="number" min="1" max={product.stock} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            <Btn disabled={product.stock <= 0} onClick={() => onAddToCart({ productId: product.id, name: product.name, price: Number(product.price), qty, sellerId: product.seller_id, sellerName: product.sellers?.name })}>
              {product.stock <= 0 ? "Sin stock" : "Agregar al carrito"}
            </Btn>
          </div>
        </div>
      </div>

      <SectionTitle>Reseñas</SectionTitle>
      {reviews.length === 0 ? <Empty>Todavía no hay reseñas.</Empty> : reviews.map((r) => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <StarRating value={r.rating} />
          <p style={{ margin: "6px 0 0", fontSize: 13.5 }}>{r.comment}</p>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CARRITO Y PAGO
// ---------------------------------------------------------------------------
export function CartView({ cart, setCart, onOrderPlaced }) {
  const { profile } = useAuth();
  const [deliveryMethod, setDeliveryMethod] = useState("domicilio");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [proofFile, setProofFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const bySeller = cart.reduce((acc, i) => { (acc[i.sellerId] = acc[i.sellerId] || []).push(i); return acc; }, {});

  function removeItem(idx) { setCart((c) => c.filter((_, i) => i !== idx)); }

  async function confirmOrder() {
    setError("");
    if (cart.length === 0) return;
    if (!proofFile) { setError("Sube tu comprobante de pago para continuar."); return; }
    if (deliveryMethod === "domicilio" && !address) { setError("Escribe tu dirección de entrega."); return; }
    setSaving(true);
    try {
      const proofPath = await uploadFile("payment-proofs", proofFile, profile.id);
      const batchId = crypto.randomUUID();
      for (const sellerId of Object.keys(bySeller)) {
        const items = bySeller[sellerId];
        const sellerTotal = items.reduce((s, i) => s + i.price * i.qty, 0);
        const { data: order, error: oErr } = await supabase.from("orders").insert({
          batch_id: batchId, buyer_id: profile.id, seller_id: sellerId, total: sellerTotal,
          payment_method: paymentMethod, proof_path: proofPath, delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === "domicilio" ? address : null,
        }).select().single();
        if (oErr) throw oErr;
        const itemRows = items.map((i) => ({ order_id: order.id, product_id: i.productId, name: i.name, qty: i.qty, price: i.price }));
        const { error: iErr } = await supabase.from("order_items").insert(itemRows);
        if (iErr) throw iErr;
      }
      setCart([]);
      onOrderPlaced();
    } catch (e) {
      setError(e.message || "No se pudo confirmar el pedido.");
    }
    setSaving(false);
  }

  if (cart.length === 0) return <Empty>Tu carrito está vacío.</Empty>;

  return (
    <div>
      <SectionTitle>Tu carrito</SectionTitle>
      <Card style={{ marginBottom: 16 }}>
        {cart.map((i, idx) => (
          <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: idx < cart.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{i.name}</div><div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{i.sellerName} · cant. {i.qty}</div></div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Bs {(i.price * i.qty).toFixed(2)}</div>
              <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 12 }}>Quitar</button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700 }}><span>Total</span><span>Bs {total.toFixed(2)}</span></div>
      </Card>

      <SectionTitle sub="Se creará un pedido separado para cada vendedor">Entrega y pago</SectionTitle>
      <Card>
        <Field label="Método de entrega">
          <select className="input" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
            <option value="domicilio">Envío a domicilio</option>
            <option value="recoger">Recoger en punto acordado</option>
          </select>
        </Field>
        {deliveryMethod === "domicilio" && (
          <Field label="Dirección de entrega"><input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, ciudad" /></Field>
        )}
        <Field label="Método de pago">
          <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="qr">Pago con QR</option>
            <option value="bank_transfer">Transferencia bancaria</option>
          </select>
        </Field>
        <Field label="Comprobante de pago (foto o captura)">
          <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
        </Field>
        {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Btn full disabled={saving} onClick={confirmOrder}>{saving ? "Confirmando…" : "Confirmar pedido"}</Btn>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MIS PEDIDOS
// ---------------------------------------------------------------------------
export function MyOrders() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({});

  async function load() {
    const { data } = await supabase.from("orders").select("*, order_items(*), sellers(name)").eq("buyer_id", profile.id).order("created_at", { ascending: false });
    setOrders(data || []);
    const { data: revs } = await supabase.from("reviews").select("product_id").eq("buyer_id", profile.id);
    setMyReviews((revs || []).map((r) => r.product_id));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submitReview(order, item) {
    const form = reviewForm[item.product_id] || { rating: 5, comment: "" };
    await supabase.from("reviews").insert({ product_id: item.product_id, order_id: order.id, buyer_id: profile.id, rating: form.rating, comment: form.comment });
    load();
  }

  if (orders.length === 0) return <Empty>Todavía no has hecho ningún pedido.</Empty>;

  return (
    <div>
      <SectionTitle>Mis pedidos</SectionTitle>
      {orders.map((o) => (
        <Card key={o.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{o.sellers?.name}</div>
            <Badge tone={o.payment_status === "approved" ? "success" : o.payment_status === "rejected" ? "danger" : "neutral"}>
              Pago: {o.payment_status === "approved" ? "aprobado" : o.payment_status === "rejected" ? "rechazado" : "pendiente"}
            </Badge>
            <Badge tone="accent">{o.order_status}</Badge>
          </div>
          {o.rejection_reason && <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 8 }}>Motivo de rechazo: {o.rejection_reason}</div>}
          {o.order_items.map((it) => (
            <div key={it.id} style={{ padding: "6px 0", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>{it.name} × {it.qty}</span><span>Bs {(it.price * it.qty).toFixed(2)}</span>
              </div>
              {o.order_status === "entregado" && !myReviews.includes(it.product_id) && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="input" style={{ width: 90 }} value={reviewForm[it.product_id]?.rating || 5} onChange={(e) => setReviewForm((f) => ({ ...f, [it.product_id]: { ...(f[it.product_id] || {}), rating: Number(e.target.value) } }))}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                  <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Escribe tu reseña…" value={reviewForm[it.product_id]?.comment || ""} onChange={(e) => setReviewForm((f) => ({ ...f, [it.product_id]: { ...(f[it.product_id] || {}), comment: e.target.value } }))} />
                  <Btn size="sm" onClick={() => submitReview(o, it)}>Enviar reseña</Btn>
                </div>
              )}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VERIFICACIÓN DE IDENTIDAD
// ---------------------------------------------------------------------------
export function VerificationRequest() {
  const { profile } = useAuth();
  const [myRequest, setMyRequest] = useState(undefined);
  const [form, setForm] = useState({ fullName: "", birthDate: "" });
  const [files, setFiles] = useState({ front: null, back: null, selfie: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("verifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(1);
    setMyRequest(data && data[0] ? data[0] : null);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submit() {
    setError("");
    if (!form.fullName || !form.birthDate || !files.front || !files.back || !files.selfie) { setError("Completa tus datos y sube las 3 fotos."); return; }
    setSaving(true);
    try {
      const front = await uploadFile("verification-docs", files.front, profile.id);
      const back = await uploadFile("verification-docs", files.back, profile.id);
      const selfie = await uploadFile("verification-docs", files.selfie, profile.id);
      await supabase.from("verifications").insert({ user_id: profile.id, full_name: form.fullName, birth_date: form.birthDate, id_front_path: front, id_back_path: back, selfie_path: selfie });
      await load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  if (myRequest === undefined) return <Empty>Cargando…</Empty>;

  if (myRequest && myRequest.status === "pending") {
    return <Card><SectionTitle>Verificación en revisión</SectionTitle><p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Tu solicitud está siendo revisada por el equipo de Mercado Sumaj. Te avisaremos apenas tengamos una respuesta.</p></Card>;
  }
  if (myRequest && myRequest.status === "verified") {
    return <Card><SectionTitle>¡Ya eres vendedor verificado!</SectionTitle><p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Cierra sesión y vuelve a entrar para ver tu panel de vendedor.</p></Card>;
  }

  return (
    <div>
      <SectionTitle sub="Solo podrás publicar productos después de ser verificado">Verifica tu identidad</SectionTitle>
      {myRequest && myRequest.status === "rejected" && (
        <Card style={{ marginBottom: 14, borderColor: "var(--danger-soft)" }}>
          <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>Tu solicitud anterior fue rechazada</div>
          <div style={{ fontSize: 13.5 }}>Motivo: {myRequest.rejection_reason || "No especificado"}</div>
        </Card>
      )}
      <Card>
        <Field label="Nombre completo"><input className="input" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></Field>
        <Field label="Fecha de nacimiento"><input className="input" type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} /></Field>
        <Field label="Foto frontal de tu carnet"><input className="input" type="file" accept="image/*" onChange={(e) => setFiles((f) => ({ ...f, front: e.target.files?.[0] || null }))} /></Field>
        <Field label="Foto posterior de tu carnet"><input className="input" type="file" accept="image/*" onChange={(e) => setFiles((f) => ({ ...f, back: e.target.files?.[0] || null }))} /></Field>
        <Field label="Selfie sosteniendo tu carnet"><input className="input" type="file" accept="image/*" onChange={(e) => setFiles((f) => ({ ...f, selfie: e.target.files?.[0] || null }))} /></Field>
        {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Btn full disabled={saving} onClick={submit}>{saving ? "Enviando…" : "Enviar solicitud"}</Btn>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NOTIFICACIONES
// ---------------------------------------------------------------------------
export function Notifications() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);

  async function load() {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false });
    setItems(data || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    load();
  }

  if (items.length === 0) return <Empty>No tienes notificaciones.</Empty>;

  return (
    <div>
      <SectionTitle>Notificaciones</SectionTitle>
      {items.map((n) => (
        <Card key={n.id} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", background: n.read ? "var(--surface)" : "var(--accent-soft)" }}>
          <span style={{ fontSize: 14 }}>{n.text}</span>
          {!n.read && <button onClick={() => markRead(n.id)} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: 12.5 }}>Marcar leída</button>}
        </Card>
      ))}
    </div>
  );
}
