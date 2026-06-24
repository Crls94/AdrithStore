import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";

// Auth y Setup
import PrimerAdmin  from "./auth/PrimerAdmin";
import Login        from "./auth/Login";
import SetupWizard  from "./pages/SetupWizard";
import Layout       from "./components/layout/Layout";

// Dashboard — sin Layout (centro de operaciones propio)
import Dashboard from "./pages/Dashboard";

// Páginas internas — dentro del Layout mínimo
import Ventas         from "./pages/ventas";
import RegistroVentas from "./pages/RegistroVentas";
import Productos      from "./pages/Productos";
import Categorias     from "./pages/Categorias";
import Compras        from "./pages/compras_final";
import Proveedores    from "./pages/Proveedores";
import Clientes       from "./pages/Clientes";
import MiPerfil       from "./pages/MiPerfil";
import EventoLog      from "./pages/EventoLog";
import Usuarios       from "./pages/Usuarios";
import AdminSistema   from "./pages/AdminSistema";
import Tesoreria      from "./pages/Tesoreria";
import RecuperarPassword from "./auth/RecuperarPassword";

// ── Guards ────────────────────────────────────────────────────────────────
function PrivateRoute({ children, soloAdmin = false }) {
  const { usuario, cargando, estado } = useAuth();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (soloAdmin && usuario.rol !== "ADMIN") return <Navigate to="/dashboard" replace />;
  if (!estado?.configurado) return <Navigate to="/setup" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { usuario, cargando, estado } = useAuth();
  if (cargando) return <Cargando />;
  if (usuario) return estado?.configurado
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/setup" replace />;
  return children;
}

function Cargando() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#F1F3F2",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "#0D5E4F" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏪</div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>Cargando AdrithStore...</p>
      </div>
    </div>
  );
}

// ── Rutas ─────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { usuario, cargando, estado } = useAuth();
  if (cargando) return <Cargando />;

  return (
    <Routes>
      {/* Raíz: detectar flujo */}
      <Route path="/" element={
        !estado?.hayUsuarios   ? <Navigate to="/primer-admin" replace />
        : !usuario             ? <Navigate to="/login"        replace />
        : !estado?.configurado ? <Navigate to="/setup"        replace />
        :                        <Navigate to="/dashboard"    replace />
      } />

      {/* Públicas */}
      <Route path="/primer-admin" element={
        estado?.hayUsuarios ? <Navigate to="/login" replace /> : <PrimerAdmin />
      } />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/recuperar" element={<PublicRoute><RecuperarPassword /></PublicRoute>} />

      {/* Setup */}
      <Route path="/setup" element={
        !usuario ? <Navigate to="/login" replace />
        : estado?.configurado ? <Navigate to="/dashboard" replace />
        : <SetupWizard />
      } />

      {/* ── Dashboard SIN Layout — página completa propia ── */}
      <Route path="/dashboard" element={
        <PrivateRoute><Dashboard /></PrivateRoute>
      } />

      {/* ── Páginas internas CON Layout mínimo (solo header + back) ── */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/ventas"          element={<Ventas />} />
        <Route path="/registro-ventas" element={<RegistroVentas />} />
        <Route path="/productos"       element={<Productos />} />
        <Route path="/categorias"      element={<Categorias />} />
        <Route path="/compras"         element={<Compras />} />
        <Route path="/proveedores"     element={<Proveedores />} />
        <Route path="/clientes"        element={<Clientes />} />
        <Route path="/perfil"          element={<MiPerfil />} />
        <Route path="/usuarios"        element={<PrivateRoute soloAdmin><Usuarios /></PrivateRoute>} />
        <Route path="/admin-sistema"   element={<PrivateRoute soloAdmin><AdminSistema /></PrivateRoute>} />
        <Route path="/eventos"         element={<PrivateRoute soloAdmin><EventoLog /></PrivateRoute>} />
        <Route path="/tesoreria"        element={<PrivateRoute soloAdmin><Tesoreria /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}