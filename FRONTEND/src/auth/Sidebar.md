import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Paleta premium
const C = {
  bg:       "#071F1C",   // fondo oscuro profundo
  hoverBg:  "#0D5E4F",   // emerald hover
  activeBg: "#0D5E4F",   // emerald activo
  borde:    "rgba(13,94,79,0.3)",
  texto:    "#C8DDD9",   // texto claro
  textoSub: "rgba(200,221,217,0.45)",
  logo:     "#FAFAF8",
};

export default function Sidebar({ cerrar }) {
  const { usuario, esAdmin, logout, estado } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const Link = ({ to, icon, label }) => (
    <NavLink to={to} onClick={cerrar}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 14px", borderRadius: 10, marginBottom: 2,
        textDecoration: "none", fontSize: 13.5, fontWeight: 500,
        transition: "all 0.18s",
        background: isActive ? C.activeBg : "transparent",
        color:      isActive ? "#fff"     : C.texto,
        boxShadow:  isActive ? "0 4px 12px rgba(13,94,79,0.4)" : "none",
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.className.includes('active'))
          e.currentTarget.style.background = "rgba(13,94,79,0.3)";
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.className.includes('active'))
          e.currentTarget.style.background = "transparent";
      }}>
      <span style={{ fontSize: 16, minWidth: 20, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );

  const Seccion = ({ label }) => (
    <p style={{
      margin: "16px 14px 5px",
      fontSize: 9.5, fontWeight: 700,
      letterSpacing: "1.2px",
      color: C.textoSub,
      textTransform: "uppercase",
    }}>
      {label}
    </p>
  );

  return (
    <div style={{
      background: C.bg,
      width: 210,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      borderRight: `1px solid ${C.borde}`,
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>

      {/* Logo */}
      <div style={{ padding: "18px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg, #0D5E4F, #0A3D3A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, boxShadow: "0 4px 12px rgba(13,94,79,0.5)",
          }}>🏪</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.logo, letterSpacing: "-0.3px" }}>
              {estado?.nombreNegocio || "AdrithStore"}
            </div>
            <div style={{ fontSize: 10, color: C.textoSub }}>
              {usuario?.rol} · @{usuario?.username}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${C.borde}`, margin: "0 10px" }} />

      {/* Navegación */}
      <nav style={{ flex: 1, padding: "6px 8px 0", overflowY: "auto" }}>

        <Seccion label="Principal" />
        <Link to="/dashboard"        icon="📊" label="Dashboard" />
        <Link to="/ventas"           icon="🛒" label="Nueva venta" />
        <Link to="/registro-ventas"  icon="📋" label="Registro ventas" />

        <Seccion label="Inventario" />
        <Link to="/productos"        icon="📦" label="Productos" />
        <Link to="/categorias"       icon="🏷️" label="Categorías" />
        <Link to="/compras"          icon="🚚" label="Compras" />
        <Link to="/proveedores"      icon="🏭" label="Proveedores" />

        <Seccion label="Clientes" />
        <Link to="/clientes"         icon="👥" label="Clientes" />

        {esAdmin() && (
          <>
            <Seccion label="Administración" />
            <Link to="/usuarios"      icon="👤" label="Usuarios" />
            <Link to="/admin-sistema" icon="⚙️" label="Sistema" />
            <Link to="/eventos"       icon="📝" label="Log eventos" />
          </>
        )}

        <Seccion label="Mi cuenta" />
        <Link to="/perfil"           icon="👤" label="Mi perfil" />
      </nav>

      {/* Footer logout */}
      <div style={{ padding: "10px 8px 14px", borderTop: `1px solid ${C.borde}` }}>
        <button onClick={handleLogout}
          style={{
            width: "100%", padding: "9px 14px",
            background: "transparent",
            color: C.textoSub,
            border: `1px solid ${C.borde}`,
            borderRadius: 10, cursor: "pointer",
            fontSize: 13, fontWeight: 600,
            textAlign: "left",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(198,40,40,0.12)";
            e.currentTarget.style.color = "#ff6b6b";
            e.currentTarget.style.borderColor = "rgba(198,40,40,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = C.textoSub;
            e.currentTarget.style.borderColor = C.borde;
          }}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}