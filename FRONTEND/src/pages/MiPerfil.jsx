import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

const API = "http://192.168.18.28:8080/api";

const C = {
  emerald:   "#0D5E4F",
  teal:      "#0A3D3A",
  tangerine: "#E07A2F",
  warmWhite: "#FAFAF8",
  softGray:  "#F1F3F2",
  charcoal:  "#1F1F1F",
  border:    "rgba(13,94,79,0.12)",
};

export default function MiPerfil() {
  const { usuario, logout, recargarPerfil } = useAuth();
  const [tab,      setTab]      = useState("datos");
  const [form,     setForm]     = useState({ nombres:"", apellidos:"", dni:"", telefono:"" });
  const [pass,     setPass]     = useState({ actual:"", nueva:"", confirmar:"" });
  const [exito,    setExito]    = useState("");
  const [error,    setError]    = useState("");
  const [carg,     setCarg]     = useState(false);
  const [cargDatos,setCargDatos]= useState(true);

  useEffect(() => {
    if (!usuario?.idUsuario) { setCargDatos(false); return; }
    axios.get(`${API}/usuarios/${usuario.idUsuario}`)
      .then(r => setForm({
        nombres:   r.data.nombres   || "",
        apellidos: r.data.apellidos || "",
        dni:       r.data.dni       || "",
        telefono:  r.data.telefono  || "",
      }))
      .catch(() => setForm({
        nombres:   usuario.nombres   || "",
        apellidos: usuario.apellidos || "",
        dni:       usuario.dni       || "",
        telefono:  usuario.telefono  || "",
      }))
      .finally(() => setCargDatos(false));
  }, [usuario?.idUsuario]);

  const guardarDatos = async () => {
    setError(""); setExito("");
    if (!form.nombres.trim()) return setError("El nombre es obligatorio.");
    setCarg(true);
    try {
      await axios.put(`${API}/usuarios/${usuario?.idUsuario}`, form);
      await recargarPerfil();
      setExito("Datos actualizados correctamente.");
    } catch (e) {
      setError(e.response?.data || "Error al actualizar.");
    } finally { setCarg(false); }
  };

  const cambiarPassword = async () => {
    setError(""); setExito("");
    if (!pass.actual)                   return setError("Ingresa tu contraseña actual.");
    if (pass.nueva !== pass.confirmar)  return setError("Las contraseñas no coinciden.");
    if (pass.nueva.length < 6)          return setError("Mínimo 6 caracteres.");
    setCarg(true);
    try {
      await axios.patch(`${API}/usuarios/${usuario?.idUsuario}/password`, {
        passwordActual: pass.actual,
        passwordNueva:  pass.nueva,
      });
      setExito("Contraseña actualizada correctamente.");
      setPass({ actual:"", nueva:"", confirmar:"" });
    } catch (e) {
      setError(e.response?.data || "Error al cambiar contraseña.");
    } finally { setCarg(false); }
  };

  const inp = (key, label, type="text", ph="", obj, setObj) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700,
        color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>
        {label}
      </label>
      <input type={type} placeholder={ph} value={obj[key] || ""}
        onChange={e => setObj(p => ({ ...p, [key]: e.target.value }))}
        style={{ width:"100%", padding:"11px 14px", borderRadius:9,
          border:`1.5px solid ${C.border}`, background: C.softGray,
          fontSize:14, color: C.charcoal, boxSizing:"border-box",
          outline:"none", fontFamily:"inherit", transition:"border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = C.emerald}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );

  if (cargDatos) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:300, color: C.emerald, fontSize:15, fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      Cargando perfil...
    </div>
  );

  return (
    <div style={{ background: C.softGray, minHeight:"100vh", padding:24,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:520, margin:"0 auto" }}>

        {/* Hero card */}
        <div style={{
          background:`linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
          borderRadius:18, padding:"28px 24px", marginBottom:24,
          color:"#fff", textAlign:"center",
          boxShadow:`0 8px 28px rgba(13,94,79,0.35)`,
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120,
            borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
          <div style={{ width:68, height:68, borderRadius:"50%",
            background:"rgba(255,255,255,0.18)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28, margin:"0 auto 12px", fontWeight:900, color:"#fff",
            backdropFilter:"blur(4px)", border:"2px solid rgba(255,255,255,0.2)" }}>
            {(form.nombres?.[0] || usuario?.nombres?.[0] || "?").toUpperCase()}
          </div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800 }}>
            {form.nombres} {form.apellidos}
          </h2>
          <p style={{ margin:"0 0 2px", opacity:0.75, fontSize:13 }}>
            @{usuario?.username} · {usuario?.rol}
          </p>
          {form.dni && (
            <p style={{ margin:0, opacity:0.6, fontSize:12 }}>DNI: {form.dni}</p>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[["datos","👤 Mis datos"],["password","🔑 Contraseña"]].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setError(""); setExito(""); }}
              style={{ padding:"9px 18px", borderRadius:20, border:"none",
                cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
                background: tab===k ? C.emerald : "#fff",
                color:       tab===k ? "#fff"    : "#666",
                boxShadow:   tab===k ? `0 4px 12px rgba(13,94,79,0.35)` : "0 1px 4px #0001",
                transition:"all 0.2s" }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ background:"#fff", borderRadius:16, padding:28,
          boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${C.border}` }}>

          {tab === "datos" && (
            <>
              {inp("nombres",  "Nombres *",  "text","Juan Carlos", form, setForm)}
              {inp("apellidos","Apellidos",  "text","García López", form, setForm)}
              {inp("dni",      "DNI",        "text","12345678",     form, setForm)}
              {inp("telefono", "Teléfono",   "text","987654321",    form, setForm)}
            </>
          )}
          {tab === "password" && (
            <>
              {inp("actual",   "Contraseña actual *",    "password","", pass, setPass)}
              {inp("nueva",    "Nueva contraseña *",     "password","Mínimo 6 caracteres", pass, setPass)}
              {inp("confirmar","Confirmar contraseña *", "password","", pass, setPass)}
            </>
          )}

          {exito && (
            <div style={{ background:"#E8F5E9", border:"1px solid #A5D6A7",
              borderRadius:8, padding:"10px 14px", color:"#2E7D32",
              fontSize:13, marginBottom:14 }}>✅ {exito}</div>
          )}
          {error && (
            <div style={{ background:"#FFF0F0", border:"1px solid #FCC",
              borderRadius:8, padding:"10px 14px", color:"#C62828",
              fontSize:13, marginBottom:14 }}>⚠️ {error}</div>
          )}

          <button onClick={tab==="datos" ? guardarDatos : cambiarPassword}
            disabled={carg}
            style={{ width:"100%", padding:13,
              background:`linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
              color:"#fff", border:"none", borderRadius:10,
              cursor: carg ? "not-allowed" : "pointer",
              fontSize:15, fontWeight:700, fontFamily:"inherit",
              opacity: carg ? 0.75 : 1,
              boxShadow:`0 4px 16px rgba(13,94,79,0.35)` }}>
            {carg ? "Guardando..." : tab==="datos" ? "Guardar cambios" : "Cambiar contraseña"}
          </button>
        </div>

        <button onClick={() => { logout(); }}
          style={{ width:"100%", marginTop:14, padding:12,
            background:"#FFF0F0", color:"#C62828",
            border:"1px solid rgba(198,40,40,0.2)", borderRadius:10,
            cursor:"pointer", fontSize:14, fontWeight:600, fontFamily:"inherit" }}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}