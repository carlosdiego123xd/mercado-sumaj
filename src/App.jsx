import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import AuthScreens from "./pages/AuthScreens";
import BlockedScreen from "./pages/BlockedScreen";
import { BuyerHome, ProductDetail, CartView, MyOrders, VerificationRequest, Notifications } from "./pages/Buyer";
import { SellerPanel, SellerProducts, NewProduct, SellerOrders } from "./pages/Seller";
import { AdminDashboard, AdminUsers, AdminVerifications, AdminPayments, AdminCreateUser, AdminLog } from "./pages/Admin";

const NAV = {
  comprador: [
    ["home", "Inicio"], ["orders", "Mis pedidos"], ["verify", "Ser vendedor"], ["notifications", "Notificaciones"],
  ],
  vendedor: [
    ["panel", "Panel"], ["products", "Mis productos"], ["seller-orders", "Pedidos"],
  ],
  admin: [
    ["dashboard", "Panel"], ["users", "Usuarios"], ["verifications", "Verificaciones"], ["payments", "Pagos"], ["create-user", "Crear usuario"], ["log", "Registro"],
  ],
};

export default function App() {
  const { ready, session, profile, blockedNotice, setBlockedNotice, logout } = useAuth();
  const [view, setView] = useState({ comprador: "home", vendedor: "panel", admin: "dashboard" });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);

  if (!ready) return <FullScreenMsg>Cargando…</FullScreenMsg>;
  if (blockedNotice) return <BlockedScreen notice={blockedNotice} onBack={() => setBlockedNotice(null)} />;
  if (!session || !profile) return <AuthScreens />;

  const role = profile.role;
  const currentView = view[role];
  const setV = (v) => { setSelectedProduct(null); setView((s) => ({ ...s, [role]: v })); };

  function renderBuyer() {
    if (selectedProduct) {
      return <ProductDetail productId={selectedProduct} onBack={() => setSelectedProduct(null)} onAddToCart={(item) => { setCart((c) => [...c, item]); setSelectedProduct(null); setV("cart"); }} />;
    }
    switch (currentView) {
      case "home": return <BuyerHome onOpenProduct={setSelectedProduct} />;
      case "cart": return <CartView cart={cart} setCart={setCart} onOrderPlaced={() => setV("orders")} />;
      case "orders": return <MyOrders />;
      case "verify": return <VerificationRequest />;
      case "notifications": return <Notifications />;
      default: return null;
    }
  }
  function renderSeller() {
    switch (currentView) {
      case "panel": return <SellerPanel />;
      case "products": return <SellerProducts onNew={() => setV("new-product")} />;
      case "new-product": return <NewProduct onDone={() => setV("products")} onCancel={() => setV("products")} />;
      case "seller-orders": return <SellerOrders />;
      default: return null;
    }
  }
  function renderAdmin() {
    switch (currentView) {
      case "dashboard": return <AdminDashboard />;
      case "users": return <AdminUsers />;
      case "verifications": return <AdminVerifications />;
      case "payments": return <AdminPayments />;
      case "create-user": return <AdminCreateUser />;
      case "log": return <AdminLog />;
      default: return null;
    }
  }

  const nav = NAV[role];
  const roleLabel = { comprador: "Comprador", vendedor: "Vendedor", admin: "Administrador" };

  return (
    <div>
      <div className="topbar">
        <span style={{ opacity: 0.85 }}>Sesión: <strong>{profile.full_name || profile.email}</strong> · {roleLabel[role]}</span>
        {role === "comprador" && cart.length > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>|</span>
            <button className="link" onClick={() => setV("cart")}>Carrito ({cart.length})</button>
          </>
        )}
        <span style={{ opacity: 0.4 }}>|</span>
        <button className="link" onClick={logout}>Cerrar sesión</button>
      </div>

      <div className="app-shell">
        <nav className="sidebar-nav">
          <div style={{ fontFamily: "var(--serif)", fontSize: 19, color: "#fff", padding: "6px 12px 18px" }}>Mercado Sumaj</div>
          {nav.map(([key, label]) => (
            <button key={key} className={currentView === key ? "active" : ""} onClick={() => setV(key)}>{label}</button>
          ))}
        </nav>

        <div className="main-content">
          <div className="container" style={{ padding: "22px 16px" }}>
            {role === "comprador" && renderBuyer()}
            {role === "vendedor" && renderSeller()}
            {role === "admin" && renderAdmin()}
          </div>
        </div>
      </div>

      <nav className="bottom-nav">
        {nav.map(([key, label]) => (
          <button key={key} className={currentView === key ? "active" : ""} onClick={() => setV(key)}>{label}</button>
        ))}
      </nav>
    </div>
  );
}

function FullScreenMsg({ children }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" }}>{children}</div>;
}
