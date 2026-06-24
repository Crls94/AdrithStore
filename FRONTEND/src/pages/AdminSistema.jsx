import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../auth/AuthContext";

const API = "http://192.168.18.28:8080/api";

const C = {
  emerald:   "#0D5E4F",
  teal:      "#0A3D3A",
  tangerine: "#E07A2F",
  softGray:  "#F1F3F2",
  warmWhite: "#FAFAF8",
  charcoal:  "#1F1F1F",
  border:    "rgba(13,94,79,0.12)",
};

export default function AdminSistema() {
  const { estado, recargarEstado } = useAuth();
  const [config,   setConfig]  = useState(null);
  const [resumen,  setResumen] = useState(null);
  const [cargando, setCarg]    = useState(false);
  const [confirm,  setConfirm] = useState(false);
  const [msg,      setMsg]     = useState({ tipo:"", texto:"" });

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/setup/estado`),
      axios.get(`${API}/tesoreria/resumen`),
    ]).then(([c, r]) => {
      setConfig(c.data);
      setResumen(r.data);
    }).catch(() => {});
  }, []);

  const handleReset = async () => {
    setCarg(true); setMsg({ tipo:"", texto:"" });
    try {
      await axios.post(`${API}/setup/reset-operaciones`, { confirmacion:"CONFIRMAR_RESET" });
      await recargarEstado();
      setMsg({ tipo:"exito", texto:"Reset completado. El sistema volvió al estado inicial." });
      setConfirm(false);
    } catch (e) {
      setMsg({ tipo:"error", texto: e.response?.data || "Error al ejecutar el reset." });
    } finally { setCarg(false); }
  };

  const card = (children, extra={}) => (
    <div style={{ background:"#fff", borderRadius:16, padding:24,
      boxShadow:"0 2px 12px rgba(0,0,0,0.06)", marginBottom:18,
      border:`1px solid ${C.border}`, ...extra }}>
      {children}
    </div>
  );

  return (
    <div style={{ background: C.softGray, minHeight:"100vh", padding:24,
      fontFamily:"'DM Sans','Segoe UI',sans-serif", color: C.charcoal }}>
      <div style={{ maxWidth:820, margin:"0 auto" }}>

        <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800 }}>
          ⚙️ Sistema
        </h1>
        <p style={{ margin:"0 0 22px", color:"#888", fontSize:13 }}>
          Estado general y herramientas administrativas
        </p>

        {/* Estado del sistema */}
        {card(
          <>
            <h3 style={{ margin:"0 0 16px", color: C.emerald, fontSize:14,
              fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px" }}>
              📋 Estado actual
            </h3>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { label:"Negocio",      valor: estado?.nombreNegocio || "Sin nombre" },
                { label:"Sistema",      valor: config?.configurado ? "✅ Configurado" : "⚠️ Sin configurar" },
                { label:"Período",      valor: resumen?.periodo || "—" },
                { label:"Movimientos",  valor: resumen?.movimientosPeriodo ?? "—" },
                { label:"Ingresos mes", valor: `S/ ${parseFloat(resumen?.totalIngresosPeriodo||0).toFixed(2)}` },
                { label:"Gastos mes",   valor: `S/ ${parseFloat(resumen?.totalGastosPeriodo||0).toFixed(2)}` },
              ].map(item => (
                <div key={item.label} style={{ background: C.softGray,
                  borderRadius:10, padding:"12px 14px", border:`1px solid ${C.border}` }}>
                  <p style={{ margin:0, fontSize:10, color:"#888", fontWeight:700,
                    textTransform:"uppercase", letterSpacing:"0.8px" }}>{item.label}</p>
                  <p style={{ margin:"5px 0 0", fontSize:15, color: C.charcoal, fontWeight:700 }}>
                    {item.valor}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Saldos de cuentas */}
        {resumen?.cuentas && card(
          <>
            <h3 style={{ margin:"0 0 14px", color: C.emerald, fontSize:14,
              fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px" }}>
              💰 Saldos de cuentas
            </h3>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {resumen.cuentas.map(c => (
                <div key={c.idCuenta} style={{ flex:"1 0 160px",
                  background:`linear-gradient(135deg, ${C.emerald}10, ${C.emerald}05)`,
                  borderRadius:12, padding:"14px 16px",
                  border:`1.5px solid ${C.border}` }}>
                  <p style={{ margin:0, fontSize:12, color:"#888", fontWeight:600 }}>
                    {c.tipo === "EFECTIVO" ? "🏧" : "📱"} {c.nombre}
                  </p>
                  <p style={{ margin:"6px 0 0", fontSize:22, fontWeight:900, color: C.emerald }}>
                    S/ {parseFloat(c.saldoActual||0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Herramientas */}
        {card(
          <>
            <h3 style={{ margin:"0 0 6px", color:"#C62828", fontSize:14,
              fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px" }}>
              🔧 Herramientas administrativas
            </h3>
            <p style={{ margin:"0 0 20px", fontSize:13, color:"#888" }}>
              Estas acciones son irreversibles. Úsalas con precaución.
            </p>

            {msg.texto && (
              <div style={{
                background: msg.tipo==="exito" ? "#E8F5E9" : "#FFF0F0",
                border:`1px solid ${msg.tipo==="exito" ? "#A5D6A7" : "#FCC"}`,
                borderRadius:8, padding:"12px 16px", marginBottom:16,
                color: msg.tipo==="exito" ? "#2E7D32" : "#C62828", fontSize:13,
              }}>
                {msg.tipo==="exito" ? "✅" : "⚠️"} {msg.texto}
              </div>
            )}

            {!confirm ? (
              <div style={{ background:"#FFF8F0", borderRadius:12,
                padding:"18px 20px", border:`1.5px solid ${C.tangerine}44` }}>
                <h4 style={{ margin:"0 0 6px", color: C.tangerine, fontSize:14 }}>
                  🔄 Reset de operaciones
                </h4>
                <p style={{ margin:"0 0 14px", fontSize:13, color:"#795548" }}>
                  Limpia ventas, compras y movimientos financieros del período.
                  Deja stocks en 0 y vuelve al setup inicial.{" "}
                  <strong>No afecta productos, categorías, proveedores ni usuarios.</strong>
                </p>
                <button onClick={() => setConfirm(true)}
                  style={{ padding:"10px 20px", background: C.tangerine, color:"#fff",
                    border:"none", borderRadius:8, cursor:"pointer",
                    fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
                  Iniciar Reset →
                </button>
              </div>
            ) : (
              <div style={{ background:"#FFEBEE", borderRadius:12,
                padding:"18px 20px", border:"2px solid #EF9A9A" }}>
                <h4 style={{ margin:"0 0 8px", color:"#C62828", fontSize:15 }}>
                  ⚠️ ¿Confirmas el reset?
                </h4>
                <p style={{ margin:"0 0 16px", fontSize:13, color:"#C62828" }}>
                  Esta acción <strong>no se puede deshacer</strong>.
                  Se eliminarán todas las transacciones del período actual.
                </p>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => setConfirm(false)}
                    style={{ padding:"10px 20px", background:"#fff", color: C.charcoal,
                      border:`1.5px solid ${C.border}`, borderRadius:8,
                      cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>
                    Cancelar
                  </button>
                  <button onClick={handleReset} disabled={cargando}
                    style={{ padding:"10px 24px", background:"#C62828", color:"#fff",
                      border:"none", borderRadius:8, cursor:"pointer",
                      fontSize:13, fontWeight:700, fontFamily:"inherit",
                      opacity: cargando ? 0.75 : 1 }}>
                    {cargando ? "Ejecutando..." : "✅ Sí, ejecutar reset"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}