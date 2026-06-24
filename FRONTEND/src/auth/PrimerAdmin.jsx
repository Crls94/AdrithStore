import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

const C = {
  emerald:   "#0D5E4F",
  teal:      "#0A3D3A",
  tangerine: "#E07A2F",
  warmWhite: "#FAFAF8",
  softGray:  "#F1F3F2",
  charcoal:  "#1F1F1F",
  border:    "rgba(13,94,79,0.15)",
};

export default function PrimerAdmin() {
  const { registrarPrimerAdmin } = useAuth();
  const [form, setForm] = useState({
    nombres:"", apellidos:"", dni:"", username:"", password:"", confirmar:"",
  });
  const [error,   setError]   = useState("");
  const [exito,   setExito]   = useState(false);
  const [cargando,setCargando]= useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!form.nombres.trim())         return setError("El nombre es obligatorio.");
    if (!form.username.trim())        return setError("El nombre de usuario es obligatorio.");
    if (form.password.length < 6)     return setError("La contraseña debe tener al menos 6 caracteres.");
    if (form.password !== form.confirmar) return setError("Las contraseñas no coinciden.");
    setCargando(true);
    try {
      await registrarPrimerAdmin({
        nombres:   form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        dni:       form.dni.trim() || null,
        username:  form.username.trim(),
        password:  form.password,
      });
      setExito(true);
    } catch (e) {
      setError(e.response?.data || "Error al registrar el administrador.");
    } finally {
      setCargando(false);
    }
  };

  if (exito) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background: C.softGray,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ background: C.warmWhite, borderRadius:20, padding:"48px 40px",
        textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", maxWidth:400 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
        <h2 style={{ color: C.emerald, margin:"0 0 8px", fontSize:22, fontWeight:800 }}>
          ¡Administrador creado!
        </h2>
        <p style={{ color:"#888", margin:"0 0 28px", fontSize:14 }}>
          Ya puedes iniciar sesión con tu usuario y contraseña.
        </p>
        <button onClick={() => window.location.reload()}
          style={{ padding:"12px 32px", background:`linear-gradient(135deg,${C.emerald},${C.teal})`,
            color:"#fff", border:"none", borderRadius:10, cursor:"pointer",
            fontSize:15, fontWeight:700, boxShadow:`0 4px 16px rgba(13,94,79,0.4)` }}>
          Ir al Login →
        </button>
      </div>
    </div>
  );

  const inp = (key, label, type="text", ph="") => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:700,
        color: C.charcoal, marginBottom:5 }}>{label}</label>
      <input type={type} placeholder={ph} value={form[key]}
        onChange={e => set(key, e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        style={{ width:"100%", padding:"11px 14px", borderRadius:9,
          border:`1.5px solid ${C.border}`, background: C.softGray,
          fontSize:14, color: C.charcoal, boxSizing:"border-box",
          outline:"none", fontFamily:"inherit", transition:"border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = C.emerald}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background: C.softGray,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ background: C.warmWhite, borderRadius:20,
        padding:"40px 40px", width:440,
        boxShadow:"0 8px 32px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:30 }}>
          <div style={{ width:52, height:52, borderRadius:14,
            background:`linear-gradient(135deg,${C.emerald},${C.teal})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:24, margin:"0 auto 12px",
            boxShadow:`0 4px 16px rgba(13,94,79,0.4)` }}>
            🏪
          </div>
          <h1 style={{ margin:"0 0 6px", fontSize:22, fontWeight:800, color: C.charcoal }}>
            Primera configuración
          </h1>
          <p style={{ margin:0, fontSize:13, color:"#888" }}>
            Registra el Administrador Principal del sistema
          </p>
        </div>

        {inp("nombres",   "Nombres *",             "text",     "Juan Carlos")}
        {inp("apellidos", "Apellidos",              "text",     "García López")}
        {inp("dni",       "DNI",                   "text",     "12345678")}
        {inp("username",  "Usuario *",             "text",     "admin")}
        {inp("password",  "Contraseña *",          "password", "Mínimo 6 caracteres")}
        {inp("confirmar", "Confirmar contraseña *","password", "Repite la contraseña")}

        {error && (
          <div style={{ background:"#FFF0F0", border:"1.5px solid #FCC",
            borderRadius:9, padding:"10px 14px", color:"#C62828",
            fontSize:13, marginBottom:16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={cargando}
          style={{ width:"100%", padding:"13px",
            background:`linear-gradient(135deg,${C.emerald},${C.teal})`,
            color:"#fff", border:"none", borderRadius:10,
            cursor: cargando ? "not-allowed" : "pointer",
            fontSize:15, fontWeight:700,
            opacity: cargando ? 0.75 : 1,
            boxShadow:`0 4px 16px rgba(13,94,79,0.4)`,
            fontFamily:"inherit" }}>
          {cargando ? "Registrando..." : "Crear Administrador →"}
        </button>
      </div>
    </div>
  );
}