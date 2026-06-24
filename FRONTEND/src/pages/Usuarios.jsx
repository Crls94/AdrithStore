import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

const API = "http://192.168.18.28:8080/api";

const C = {
  emerald:   "#0D5E4F",
  teal:      "#0A3D3A",
  softGray:  "#F1F3F2",
  charcoal:  "#1F1F1F",
  border:    "rgba(13,94,79,0.12)",
};

export default function Usuarios() {
  const { usuario: yo, esAdmin } = useAuth();
  const [usuarios,     setUsuarios]  = useState([]);
  const [modal,        setModal]     = useState(null);
  const [seleccionado, setSelec]     = useState(null);
  const [form,         setForm]      = useState({});
  const [error,        setError]     = useState("");
  const [exito,        setExito]     = useState("");

  const cargar = () =>
    axios.get(`${API}/usuarios`).then(r => setUsuarios(r.data)).catch(() => {});

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setForm({ username:"", password:"", confirmar:"", nombres:"", apellidos:"", dni:"", telefono:"", rol:"VENDEDOR" });
    setError(""); setModal("crear");
  };
  const abrirEditar = (u) => {
    setSelec(u);
    setForm({ username: u.username||"", nombres: u.nombres, apellidos: u.apellidos, dni: u.dni||"", telefono: u.telefono||"", rol: u.rol });
    setError(""); setModal("editar");
  };
  const abrirPassword = (u) => {
    setSelec(u);
    setForm({ passwordNueva:"", confirmar:"" });
    setError(""); setModal("password");
  };

  const guardar = async () => {
    setError("");
    try {
      if (modal === "crear") {
        if (form.password !== form.confirmar) return setError("Las contraseñas no coinciden.");
        await axios.post(`${API}/usuarios`, form, { headers:{ "X-Usuario": yo?.username||"admin" }});
        setExito("Vendedor creado.");
      } else if (modal === "editar") {
        await axios.put(`${API}/usuarios/${seleccionado.idUsuario}`, form);
        setExito("Datos actualizados.");
      } else if (modal === "password") {
        if (form.passwordNueva !== form.confirmar) return setError("Las contraseñas no coinciden.");
        await axios.patch(`${API}/usuarios/${seleccionado.idUsuario}/reset-password`,
          { passwordNueva: form.passwordNueva });
        setExito("Contraseña restablecida.");
      }
      setModal(null); cargar();
      setTimeout(() => setExito(""), 3500);
    } catch (e) { setError(e.response?.data || "Error al guardar."); }
  };

  const toggleEstado = async (u) => {
    try {
      await axios.patch(`${API}/usuarios/${u.idUsuario}/estado`, { activo: !u.activo });
      cargar();
    } catch {}
  };

  const inp = (key, label, type="text", ph="") => (
    <div style={{ marginBottom:13 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#888", display:"block",
        marginBottom:4, textTransform:"uppercase", letterSpacing:"0.7px" }}>{label}</label>
      <input type={type} placeholder={ph} value={form[key]||""}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        style={{ width:"100%", padding:"10px 13px", borderRadius:8,
          border:`1.5px solid ${C.border}`, background: C.softGray,
          fontSize:14, boxSizing:"border-box", outline:"none",
          color: C.charcoal, fontFamily:"inherit", transition:"border-color 0.2s" }}
        onFocus={e => e.target.style.borderColor = C.emerald}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );

  return (
    <div style={{ background: C.softGray, minHeight:"100vh", padding:24,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:960, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:22 }}>
          <div>
            <h1 style={{ margin:0, color: C.charcoal, fontSize:22, fontWeight:800 }}>
              👥 Usuarios
            </h1>
            <p style={{ margin:"4px 0 0", color:"#888", fontSize:13 }}>
              {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrados
            </p>
          </div>
          {esAdmin() && (
            <button onClick={abrirCrear}
              style={{ padding:"10px 20px",
                background:`linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                color:"#fff", border:"none", borderRadius:10, cursor:"pointer",
                fontSize:14, fontWeight:700, fontFamily:"inherit",
                boxShadow:`0 4px 14px rgba(13,94,79,0.35)` }}>
              + Nuevo Vendedor
            </button>
          )}
        </div>

        {exito && (
          <div style={{ background:"#E8F5E9", border:"1px solid #A5D6A7", borderRadius:8,
            padding:"10px 16px", color:"#2E7D32", marginBottom:16, fontSize:14 }}>
            ✅ {exito}
          </div>
        )}

        {/* Tabla */}
        <div style={{ background:"#fff", borderRadius:16, overflow:"hidden",
          boxShadow:"0 2px 12px rgba(0,0,0,0.06)", border:`1px solid ${C.border}` }}>

          {/* Cabecera */}
          <div style={{ display:"grid", gridTemplateColumns:"140px 1fr 100px 90px 90px 1fr",
            padding:"10px 16px", background: C.softGray,
            fontSize:11, fontWeight:700, color:"#888",
            textTransform:"uppercase", letterSpacing:"0.8px" }}>
            {["Usuario","Nombre","DNI","Rol","Estado","Acciones"].map(h => (
              <span key={h}>{h}</span>
            ))}
          </div>

          {usuarios.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:"#ccc", fontSize:13 }}>
              No hay usuarios registrados
            </div>
          ) : usuarios.map((u, i) => (
            <div key={u.idUsuario} style={{
              display:"grid", gridTemplateColumns:"140px 1fr 100px 90px 90px 1fr",
              padding:"12px 16px", alignItems:"center",
              borderTop:`1px solid ${C.border}`,
              background: i % 2 === 0 ? "#fff" : "#FAFDF8",
            }}>
              <span style={{ fontSize:13, fontWeight:700, color: C.emerald }}>
                @{u.username}
              </span>
              <span style={{ fontSize:13, color: C.charcoal }}>
                {u.nombres} {u.apellidos}
              </span>
              <span style={{ fontSize:12, color:"#888" }}>{u.dni || "—"}</span>
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background: u.rol==="ADMIN" ? "#E3F2FD" : "#F3E5F5",
                color: u.rol==="ADMIN" ? "#1565C0" : "#6A1B9A",
                display:"inline-block" }}>
                {u.rol}
              </span>
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                background: u.activo ? "#E8F5E9" : "#FCE4EC",
                color: u.activo ? "#2E7D32" : "#C62828",
                display:"inline-block" }}>
                {u.activo ? "Activo" : "Inactivo"}
              </span>
              {esAdmin() && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <button onClick={() => abrirEditar(u)}
                    style={{ padding:"5px 10px", fontSize:11, background:"#E3F2FD",
                      color:"#1565C0", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => abrirPassword(u)}
                    style={{ padding:"5px 10px", fontSize:11, background:"#FFF3E0",
                      color:"#E65100", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>
                    🔑 Reset
                  </button>
                  {u.idUsuario !== yo?.idUsuario && (
                    <button onClick={() => toggleEstado(u)}
                      style={{ padding:"5px 10px", fontSize:11,
                        background: u.activo ? "#FCE4EC" : "#E8F5E9",
                        color: u.activo ? "#C62828" : "#2E7D32",
                        border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>
                      {u.activo ? "⛔ Desactivar" : "✅ Activar"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000,
          backdropFilter:"blur(4px)" }}>
          <div style={{ background:"#fff", borderRadius:18, padding:32,
            width:420, boxShadow:"0 16px 48px rgba(0,0,0,0.18)",
            fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
            <h3 style={{ margin:"0 0 22px", color: C.charcoal, fontSize:18, fontWeight:800 }}>
              {modal==="crear" ? "🆕 Nuevo Vendedor"
                : modal==="editar" ? "✏️ Editar Usuario"
                : "🔑 Restablecer Contraseña"}
            </h3>

            {modal === "crear" && <>
              {inp("nombres","Nombres *","text","Juan Carlos")}
              {inp("apellidos","Apellidos","text","García")}
              {inp("dni","DNI","text","12345678")}
              {inp("telefono","Teléfono","text","987654321")}
              {inp("username","Usuario *","text","vendedor1")}
              {inp("password","Contraseña *","password","Mínimo 6 caracteres")}
              {inp("confirmar","Confirmar contraseña *","password","")}
            </>}

            {modal === "editar" && <>
              {inp("username","Usuario *","text","nombre_usuario")}
              {inp("nombres","Nombres *")}
              {inp("apellidos","Apellidos")}
              {inp("dni","DNI")}
              {inp("telefono","Teléfono")}
              <div style={{ marginBottom:13 }}>
                <label style={{ fontSize:11, fontWeight:700, color:"#888",
                  display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.7px" }}>
                  Rol
                </label>
                <select value={form.rol||"VENDEDOR"}
                  onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:8,
                    border:`1.5px solid ${C.border}`, background: C.softGray,
                    fontSize:14, outline:"none", color: C.charcoal, fontFamily:"inherit" }}>
                  <option value="VENDEDOR">VENDEDOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </>}

            {modal === "password" && <>
              <p style={{ color:"#888", fontSize:13, marginBottom:16 }}>
                Restableciendo contraseña de: <strong style={{ color: C.charcoal }}>@{seleccionado?.username}</strong>
              </p>
              {inp("passwordNueva","Nueva contraseña *","password","Mínimo 6 caracteres")}
              {inp("confirmar","Confirmar contraseña *","password","")}
            </>}

            {error && (
              <div style={{ background:"#FFF0F0", border:"1px solid #FCC",
                borderRadius:8, padding:"10px 14px", color:"#C62828",
                fontSize:13, marginBottom:14 }}>⚠️ {error}</div>
            )}

            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button onClick={() => { setModal(null); setError(""); }}
                style={{ flex:1, padding:11, background: C.softGray,
                  border:`1px solid ${C.border}`, borderRadius:9,
                  cursor:"pointer", fontSize:14, fontFamily:"inherit", fontWeight:600, color:"#666" }}>
                Cancelar
              </button>
              <button onClick={guardar}
                style={{ flex:2, padding:11,
                  background:`linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                  color:"#fff", border:"none", borderRadius:9,
                  cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit",
                  boxShadow:`0 4px 14px rgba(13,94,79,0.35)` }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}