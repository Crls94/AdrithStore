import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://192.168.18.28:8080/api";

const C = {
  emerald: "#0D5E4F", teal: "#0A3D3A", tealDark: "#061A18",
  softGray: "#F1F3F2", charcoal: "#1F1F1F", border: "rgba(13,94,79,0.15)",
};

export default function RecuperarPassword() {
  const navigate = useNavigate();
  // paso: "verificar" | "nueva-clave"
  const [paso,       setPaso]       = useState("verificar");
  const [username,   setUsername]   = useState("");
  const [dni,        setDni]        = useState("");
  const [telefono,   setTelefono]   = useState("");
  const [idUsuario,  setIdUsuario]  = useState(null);
  const [nombres,    setNombres]    = useState("");
  const [nueva,      setNueva]      = useState("");
  const [confirmar,  setConfirmar]  = useState("");
  const [error,      setError]      = useState("");
  const [cargando,   setCargando]   = useState(false);
  const [exito,      setExito]      = useState(false);

  const inp = {
    width: "100%", padding: "13px 16px", borderRadius: 12,
    border: `1.5px solid ${C.border}`, background: C.softGray,
    fontSize: 15, color: C.charcoal, boxSizing: "border-box",
    outline: "none", fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
  };
  const inpFocus = e => { e.target.style.borderColor = C.emerald; e.target.style.boxShadow = "0 0 0 3px rgba(13,94,79,0.1)"; };
  const inpBlur  = e => { e.target.style.borderColor = C.border;  e.target.style.boxShadow = "none"; };

  const handleVerificar = async () => {
    setError("");
    if (!username.trim() || !dni.trim() || !telefono.trim())
      return setError("Todos los campos son obligatorios.");
    setCargando(true);
    try {
      const { data } = await axios.post(`${API}/auth/recuperar/verificar`, {
        username: username.trim().toLowerCase(),
        dni: dni.trim(),
        telefono: telefono.trim(),
      });
      setIdUsuario(data.idUsuario);
      setNombres(data.nombres);
      setPaso("nueva-clave");
    } catch (e) {
      const msg = e.response?.data;
      setError(typeof msg === "string" ? msg : "Los datos no coinciden con ningún usuario.");
    } finally { setCargando(false); }
  };

  const handleCambiar = async () => {
    setError("");
    if (!nueva || nueva.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (nueva !== confirmar)         return setError("Las contraseñas no coinciden.");
    setCargando(true);
    try {
      await axios.post(`${API}/auth/recuperar/cambiar`, { idUsuario, nuevaPassword: nueva });
      setExito(true);
    } catch (e) {
      setError("Error al cambiar la contraseña. Intenta de nuevo.");
    } finally { setCargando(false); }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${C.tealDark} 0%, ${C.teal} 40%, ${C.emerald} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "'Inter','DM Sans','Segoe UI',system-ui,sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.97)",
        borderRadius: 24, padding: "44px 40px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{
            width:56, height:56, borderRadius:16, margin:"0 auto 16px",
            background:`linear-gradient(135deg,${C.emerald},${C.teal})`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:26,
          }}>🔐</div>
          <h1 style={{ margin:"0 0 4px", fontSize:20, fontWeight:900, color:C.charcoal }}>
            {exito ? "Contraseña actualizada" : "Recuperar contraseña"}
          </h1>
          <p style={{ margin:0, fontSize:13, color:"#aaa" }}>
            {paso === "verificar" ? "Verifica tu identidad" : `Hola, ${nombres}`}
          </p>
        </div>

        {/* PASO 1 — VERIFICAR */}
        {!exito && paso === "verificar" && <>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
              Nombre de usuario
            </label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerificar()}
              placeholder="Tu usuario de acceso" autoFocus style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
              DNI
            </label>
            <input value={dni} onChange={e => setDni(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerificar()}
              placeholder="Tu número de DNI" style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <div style={{ marginBottom: error ? 14 : 24 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
              Teléfono registrado
            </label>
            <input value={telefono} onChange={e => setTelefono(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerificar()}
              placeholder="Número de celular" style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          {error && (
            <div style={{ background:"#FFF0F0", border:"1.5px solid rgba(198,40,40,0.2)",
              borderRadius:10, padding:"11px 14px", color:"#C62828", fontSize:13, marginBottom:20 }}>
              ⚠️ {error}
            </div>
          )}
          <button onClick={handleVerificar} disabled={cargando} style={{
            width:"100%", padding:"14px",
            background: cargando ? "#ccc" : `linear-gradient(135deg,${C.emerald},${C.teal})`,
            color:"#fff", border:"none", borderRadius:12, cursor: cargando?"not-allowed":"pointer",
            fontSize:15, fontWeight:800, fontFamily:"inherit",
          }}>
            {cargando ? "Verificando..." : "Verificar identidad →"}
          </button>
        </>}

        {/* PASO 2 — NUEVA CLAVE */}
        {!exito && paso === "nueva-clave" && <>
          <div style={{ background:"rgba(13,94,79,0.06)", borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
            <p style={{ margin:0, fontSize:13, color:C.emerald, fontWeight:600 }}>
              ✅ Identidad verificada. Elige tu nueva contraseña.
            </p>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
              Nueva contraseña
            </label>
            <input type="password" value={nueva} onChange={e => setNueva(e.target.value)}
              placeholder="Mínimo 6 caracteres" autoFocus style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          <div style={{ marginBottom: error ? 14 : 24 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
              Confirmar contraseña
            </label>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCambiar()}
              placeholder="Repite la contraseña" style={inp}
              onFocus={inpFocus} onBlur={inpBlur} />
          </div>
          {error && (
            <div style={{ background:"#FFF0F0", border:"1.5px solid rgba(198,40,40,0.2)",
              borderRadius:10, padding:"11px 14px", color:"#C62828", fontSize:13, marginBottom:20 }}>
              ⚠️ {error}
            </div>
          )}
          <button onClick={handleCambiar} disabled={cargando} style={{
            width:"100%", padding:"14px",
            background: cargando ? "#ccc" : `linear-gradient(135deg,${C.emerald},${C.teal})`,
            color:"#fff", border:"none", borderRadius:12, cursor: cargando?"not-allowed":"pointer",
            fontSize:15, fontWeight:800, fontFamily:"inherit",
          }}>
            {cargando ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </>}

        {/* PASO 3 — ÉXITO */}
        {exito && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <p style={{ fontSize:15, color:"#555", marginBottom:28, lineHeight:1.6 }}>
              Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.
            </p>
            <button onClick={() => navigate("/login")} style={{
              width:"100%", padding:"14px",
              background:`linear-gradient(135deg,${C.emerald},${C.teal})`,
              color:"#fff", border:"none", borderRadius:12, cursor:"pointer",
              fontSize:15, fontWeight:800, fontFamily:"inherit",
            }}>
              Ir al inicio de sesión
            </button>
          </div>
        )}

        {/* Volver */}
        {!exito && (
          <div style={{ textAlign:"center", marginTop:20 }}>
            <button onClick={() => navigate("/login")} style={{
              background:"none", border:"none", cursor:"pointer",
              fontSize:12, color:"#aaa", fontFamily:"inherit", textDecoration:"underline",
            }}>
              ← Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}