import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const C = {
  emerald:   "#0D5E4F",
  teal:      "#0A3D3A",
  tealDark:  "#061A18",
  tangerine: "#E07A2F",
  warmWhite: "#FAFAF8",
  softGray:  "#F1F3F2",
  charcoal:  "#1F1F1F",
  border:    "rgba(13,94,79,0.15)",
};

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [cargando, setCargando] = useState(false);
  // vista: "login" | "sin-cuenta" 
  const [vista,    setVista]    = useState("login");

  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password)
      return setError("Completa tu usuario y contraseña.");
    setCargando(true);
    try {
      const data = await login(username.trim(), password);
      navigate(data.configurado ? "/dashboard" : "/setup");
    } catch (e) {
      const msg = e.response?.data;
      setError(typeof msg === "string" ? msg : "Usuario o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  };

  const inp = {
    width: "100%", padding: "13px 16px", borderRadius: 12,
    border: `1.5px solid ${C.border}`, background: C.softGray,
    fontSize: 15, color: C.charcoal, boxSizing: "border-box",
    outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "'Inter','DM Sans','Segoe UI',system-ui,sans-serif",
  };

  const inpFocus = e => {
    e.target.style.borderColor = C.emerald;
    e.target.style.boxShadow = "0 0 0 3px rgba(13,94,79,0.1)";
  };
  const inpBlur = e => {
    e.target.style.borderColor = C.border;
    e.target.style.boxShadow = "none";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${C.tealDark} 0%, ${C.teal} 40%, ${C.emerald} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
      fontFamily: "'Inter','DM Sans','Segoe UI',system-ui,sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Detalles de fondo */}
      <div style={{ position:"absolute", top:-100, right:-100, width:400, height:400,
        borderRadius:"50%", background:"radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)",
        pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:-80, left:-80, width:300, height:300,
        borderRadius:"50%", background:`radial-gradient(circle, rgba(224,122,47,0.08) 0%, transparent 70%)`,
        pointerEvents:"none" }} />

      {/* Tarjeta */}
      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 24, padding: "44px 40px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.6)",
        position: "relative",
      }}>
        {/* Logo + nombre — siempre visible */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, boxShadow: `0 8px 24px rgba(13,94,79,0.35)`,
          }}>🏪</div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900,
            color: C.charcoal, letterSpacing: "-0.5px" }}>
            AdrithStore
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#aaa" }}>
            Sistema de punto de venta
          </p>
        </div>

        {/* ── VISTA: LOGIN ─────────────────────────────────────────── */}
        {vista === "login" && <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700,
              color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
              Usuario
            </label>
            <input type="text" placeholder="Nombre de usuario" value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoComplete="username" autoFocus style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>

          <div style={{ marginBottom: error ? 16 : 8 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:700,
              color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
              Contraseña
            </label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoComplete="current-password" style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>

          {/* Link recuperar contraseña */}
          <div style={{ textAlign: "right", marginBottom: 16 }}>
            <button onClick={() => navigate("/recuperar")} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: C.emerald, fontWeight: 600, padding: 0,
              fontFamily: "inherit",
            }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div style={{
              background: "#FFF0F0", border: "1.5px solid rgba(198,40,40,0.2)",
              borderRadius: 10, padding: "11px 14px", color: "#C62828",
              fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={cargando} style={{
            width: "100%", padding: "14px",
            background: cargando ? "#ccc" : `linear-gradient(135deg, ${C.emerald} 0%, ${C.teal} 100%)`,
            color: "#fff", border: "none", borderRadius: 12,
            cursor: cargando ? "not-allowed" : "pointer",
            fontSize: 15, fontWeight: 800, letterSpacing: "-0.2px",
            boxShadow: cargando ? "none" : `0 6px 20px rgba(13,94,79,0.4)`,
            transition: "all 0.2s", fontFamily: "inherit",
          }}>
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {/* Link sin cuenta */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={() => setVista("sin-cuenta")} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#aaa", fontFamily: "inherit",
              textDecoration: "underline",
            }}>
              ¿No tienes cuenta?
            </button>
          </div>
        </>}

        {/* ── VISTA: SIN CUENTA ────────────────────────────────────── */}
        {vista === "sin-cuenta" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
              background: "rgba(13,94,79,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26,
            }}>👤</div>
            <p style={{
              fontSize: 15, fontWeight: 700, color: C.charcoal,
              margin: "0 0 12px", lineHeight: 1.5,
            }}>
              ¿No tienes cuenta?
            </p>
            <p style={{
              fontSize: 14, color: "#777", lineHeight: 1.6,
              margin: "0 0 32px",
            }}>
              El administrador debe proporcionarte una cuenta como vendedor.
            </p>
            <button onClick={() => setVista("login")} style={{
              width: "100%", padding: "13px",
              background: `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
              color: "#fff", border: "none", borderRadius: 12,
              cursor: "pointer", fontSize: 14, fontWeight: 700,
              fontFamily: "inherit",
            }}>
              ← Volver al inicio de sesión
            </button>
          </div>
        )}

        <p style={{ margin: "24px 0 0", fontSize: 11, color: "#ccc", textAlign: "center" }}>
          © 2026 AdrithStore · Ica, Perú
        </p>
      </div>
    </div>
  );
}