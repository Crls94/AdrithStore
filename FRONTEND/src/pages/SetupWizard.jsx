import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

const API = "http://192.168.18.28:8080/api";

export default function SetupWizard() {
  const { recargarEstado, usuario } = useAuth();
  const navigate   = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");
  const [cuentas, setCuentas]   = useState([]);

  const [nombreNegocio, setNombreNegocio] = useState("AdrithStore");
  const [cajaInicial, setCajaInicial]     = useState("");

  const T = {
    verde:"#2d6a4f", verdeClaro:"#e8f5e9", bg:"#f0faf0",
    card:"#fff", texto:"#1a3329", borde:"#c3dac3", input:"#f8fbf8"
  };

  // Cargar cuentas disponibles al montar
  useEffect(() => {
    axios.get(`${API}/auth/cuentas-setup`)
      .then(r => setCuentas(r.data))
      .catch(() => setCuentas([]));
  }, []);

  const handleIniciar = async () => {
    setError("");
    const monto = parseFloat(cajaInicial);
    if (!nombreNegocio.trim()) return setError("El nombre del negocio es obligatorio.");
    if (isNaN(monto) || monto < 0)
      return setError("Ingresa un monto válido para la caja (puede ser 0).");

    setCargando(true);
    try {
      // Buscar cuenta de caja física
      const cajaCuenta = cuentas.find(c =>
        c.tipo === "EFECTIVO" || c.nombre.toLowerCase().includes("caja")
      );
      const nombreCaja = cajaCuenta ? cajaCuenta.nombre : "Caja Fisica";

      const body = {
        nombreNegocio: nombreNegocio.trim(),
        saldos: [{ nombreCuenta: nombreCaja, monto }],
        stocks: [],
      };

      const res = await axios.post(`${API}/setup/configurar`, body);

      // Verificar que la respuesta sea exitosa
      if (res.data?.ok) {
        await recargarEstado();
        navigate("/dashboard");
      } else {
        setError("Error inesperado al configurar.");
      }
    } catch (e) {
      // Extraer el mensaje de error de forma segura
      const msg = e.response?.data;
      if (typeof msg === "string") {
        setError(msg);
      } else if (msg?.message) {
        setError(msg.message);
      } else {
        setError("Error al configurar. Verifica que el backend esté activo.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center",
      justifyContent:"center", background: T.bg }}>
      <div style={{ background: T.card, borderRadius:20, padding:"40px 44px",
        width:440, boxShadow:"0 8px 32px #0002" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🏪</div>
          <h1 style={{ margin:0, color: T.verde, fontSize:24, fontWeight:800 }}>
            ¡Bienvenido{usuario?.nombres ? `, ${usuario.nombres}` : ""}!
          </h1>
          <p style={{ margin:"8px 0 0", color:"#666", fontSize:14, lineHeight:1.5 }}>
            Configura tu tienda antes de empezar. Solo tomará un momento.
          </p>
        </div>

        {/* Nombre del negocio */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:700,
            color: T.texto, marginBottom:6 }}>
            Nombre de la tienda
          </label>
          <input
            type="text"
            value={nombreNegocio}
            onChange={e => setNombreNegocio(e.target.value)}
            placeholder="Ej: AdrithStore"
            style={{ width:"100%", padding:"12px 14px", borderRadius:10,
              border:`1.5px solid ${T.borde}`, background: T.input,
              fontSize:15, color: T.texto, boxSizing:"border-box", outline:"none" }}
          />
        </div>

        {/* Caja inicial */}
        <div style={{ marginBottom:28 }}>
          <label style={{ display:"block", fontSize:13, fontWeight:700,
            color: T.texto, marginBottom:6 }}>
            Saldo inicial de Caja Física
          </label>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:15, color:"#888", fontWeight:600 }}>S/</span>
            <input
              type="number"
              min="0" step="0.50"
              value={cajaInicial}
              onChange={e => setCajaInicial(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleIniciar()}
              placeholder="700.00"
              style={{ flex:1, padding:"12px 14px", borderRadius:10,
                border:`1.5px solid ${T.borde}`, background: T.input,
                fontSize:15, color: T.texto, outline:"none" }}
            />
          </div>
          <p style={{ margin:"6px 0 0", fontSize:12, color:"#888" }}>
            Con cuánto efectivo abre la tienda hoy. El stock se actualiza desde Productos.
          </p>
        </div>

        {/* Resumen */}
        {(nombreNegocio || cajaInicial) && (
          <div style={{ background: T.verdeClaro, borderRadius:10,
            padding:"14px 16px", marginBottom:20, border:`1px solid ${T.borde}` }}>
            <p style={{ margin:0, fontSize:13, color: T.texto }}>
              🏪 <strong>{nombreNegocio || "Sin nombre"}</strong>
            </p>
            <p style={{ margin:"4px 0 0", fontSize:13, color: T.texto }}>
              💰 Caja inicial: <strong>S/ {parseFloat(cajaInicial || 0).toFixed(2)}</strong>
            </p>
            <p style={{ margin:"4px 0 0", fontSize:13, color: T.texto }}>
              📦 Stock: <strong>Se define en Productos luego</strong>
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background:"#fff0f0", border:"1px solid #fcc",
            borderRadius:8, padding:"10px 14px", color:"#c00",
            fontSize:13, marginBottom:16 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Botón */}
        <button onClick={handleIniciar} disabled={cargando}
          style={{ width:"100%", padding:14, background: T.verde,
            color:"#fff", border:"none", borderRadius:12, cursor:"pointer",
            fontSize:16, fontWeight:800, opacity: cargando ? 0.7 : 1,
            boxShadow:"0 4px 12px #2d6a4f44" }}>
          {cargando ? "Configurando..." : "✅ Iniciar Operaciones"}
        </button>
      </div>
    </div>
  );
}