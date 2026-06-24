import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";

const C = {
  emerald:"#0D5E4F", teal:"#0A3D3A",
  tangerine:"#E07A2F", warmWhite:"#FAFAF8",
  softGray:"#F1F3F2", charcoal:"#1F1F1F",
  border:"rgba(13,94,79,0.12)",
};
const fmt = (n) => `S/ ${parseFloat(n||0).toFixed(2)}`;
const fmtFecha = (f) => f
  ? new Date(f).toLocaleString("es-PE",
      { day:"2-digit", month:"short", year:"numeric",
        hour:"2-digit", minute:"2-digit" })
  : "—";

export default function RegistroVentas() {
  const navigate = useNavigate();
  const [ventas,     setVentas]     = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [busqueda,   setBusqueda]   = useState("");
  const [expandida,  setExpandida]  = useState(null);
  const [pagina,     setPagina]     = useState(1);

  // Anulación
  const [modalAnular, setModalAnular] = useState(null); // venta a anular
  const [motivo,      setMotivo]      = useState("");
  const [anulando,    setAnulando]    = useState(false);
  const [errorAnul,   setErrorAnul]   = useState("");

  const POR_PAGINA = 20;

  const cargarVentas = () => {
    setCargando(true);
    api.get("/ventas/todas")
      .then(r => setVentas(Array.isArray(r.data) ? r.data : []))
      .catch(() => setVentas([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarVentas(); }, []);

  const filtradas = ventas.filter(v => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      String(v.idVenta).includes(q) ||
      v.cliente?.nombre?.toLowerCase().includes(q) ||
      v.cliente?.apellido?.toLowerCase().includes(q) ||
      v.estado?.toLowerCase().includes(q)
    );
  });

  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA);
  const paginadas    = filtradas.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA);
  const toggleExpandir = (id) => setExpandida(prev => prev === id ? null : id);
  const colorEstado = (e) => e === "confirmado"
    ? { bg:"#E8F5E9", color:"#2E7D32" }
    : { bg:"#FFEBEE", color:"#C62828" };

  // ── Anular venta ──────────────────────────────────────────────────────
  const abrirAnular = (e, venta) => {
    e.stopPropagation(); // no expandir la fila
    setModalAnular(venta);
    setMotivo(""); setErrorAnul("");
  };

  const confirmarAnulacion = async () => {
    if (!motivo.trim()) { setErrorAnul("El motivo es obligatorio."); return; }
    setAnulando(true); setErrorAnul("");
    try {
      await api.patch(`/ventas/${modalAnular.idVenta}/anular`, { motivo: motivo.trim() });
      setModalAnular(null);
      cargarVentas(); // recarga la lista actualizada
    } catch (e) {
      const msg = e.response?.data;
      setErrorAnul(typeof msg === "string" ? msg : "Error al anular la venta.");
    } finally { setAnulando(false); }
  };

  if (cargando) return (
    <div style={{ display:"flex", justifyContent:"center",
      alignItems:"center", minHeight:400, color: C.emerald, fontSize:18 }}>
      Cargando ventas...
    </div>
  );

  return (
    <div style={{ background: C.softGray, minHeight:"100vh",
      padding:24, fontFamily:"'Inter','DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
              <button onClick={() => navigate("/ventas")}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
                  border:`1px solid ${C.border}`, borderRadius:8, background:"#fff",
                  cursor:"pointer", fontSize:12, fontWeight:600, color:"#666" }}>
                ← Nueva Venta
              </button>
              <button onClick={() => navigate("/dashboard")}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
                  border:`1px solid ${C.border}`, borderRadius:8, background:"#fff",
                  cursor:"pointer", fontSize:12, fontWeight:600, color:"#666" }}>
                Dashboard
              </button>
            </div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color: C.charcoal }}>
              📋 Registro de Ventas
            </h1>
            <p style={{ margin:"4px 0 0", color:"#888", fontSize:13 }}>
              {filtradas.length} venta{filtradas.length !== 1 ? "s" : ""} registradas
            </p>
          </div>
          <input type="text"
            placeholder="Buscar por cliente, #venta, estado..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            style={{ padding:"10px 14px", borderRadius:10, fontSize:13,
              border:`1.5px solid ${C.border}`, background:"#fff",
              outline:"none", width:260, color: C.charcoal }}
          />
        </div>

        {/* Tabla */}
        <div style={{ background:"#fff", borderRadius:16,
          boxShadow:"0 2px 12px #0001", overflow:"hidden",
          border:`1px solid ${C.border}` }}>

          {/* Cabecera */}
          <div style={{ display:"grid",
            gridTemplateColumns:"70px 1fr 140px 100px 120px 100px 80px",
            padding:"10px 16px", background: C.softGray,
            fontSize:11, fontWeight:700, color:"#888",
            textTransform:"uppercase", letterSpacing:"0.8px" }}>
            <span>#</span>
            <span>Cliente</span>
            <span>Fecha</span>
            <span>Comprobante</span>
            <span>Pago</span>
            <span>Total</span>
            <span>Acción</span>
          </div>

          {paginadas.length === 0 && (
            <div style={{ padding:"40px", textAlign:"center", color:"#bbb", fontSize:14 }}>
              Sin ventas registradas
            </div>
          )}

          {paginadas.map((v, i) => {
            const est     = colorEstado(v.estado);
            const abierta = expandida === v.idVenta;
            const primPago  = v.pagos?.[0]?.medioPago || "—";
            const otrosPagos= v.pagos?.length > 1 ? ` +${v.pagos.length - 1}` : "";

            return (
              <div key={v.idVenta}
                style={{ borderBottom: i < paginadas.length-1 ? `1px solid ${C.border}` : "none" }}>

                {/* Fila principal */}
                <div style={{ display:"grid",
                  gridTemplateColumns:"70px 1fr 140px 100px 120px 100px 80px",
                  padding:"12px 16px", alignItems:"center",
                  cursor:"pointer", background: abierta ? "#F8FDF8" : "transparent" }}
                  onClick={() => toggleExpandir(v.idVenta)}>

                  <span style={{ fontSize:13, fontWeight:700, color: C.emerald }}>
                    #{v.idVenta}
                  </span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color: C.charcoal }}>
                      {v.cliente ? `${v.cliente.nombre} ${v.cliente.apellido || ""}` : "Cliente General"}
                    </div>
                    {v.usuario && (
                      <div style={{ fontSize:10, color:"#aaa" }}>
                        Vendedor: {v.usuario.nombres?.split(" ")[0]}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize:12, color:"#666" }}>{fmtFecha(v.fecha)}</span>
                  <span style={{ fontSize:12, color:"#666" }}>{v.tipoComprobante || "Boleta"}</span>
                  <div>
                    <span style={{ fontSize:12, color:"#666" }}>{primPago}{otrosPagos}</span>
                    {" "}
                    <span style={{ padding:"2px 7px", borderRadius:20, fontSize:10, fontWeight:700,
                      background: est.bg, color: est.color }}>
                      {v.estado}
                    </span>
                  </div>
                  <span style={{ fontSize:14, fontWeight:800, color: C.emerald }}>
                    {fmt(v.total)}
                  </span>
                  {/* Botón anular — solo para ventas confirmadas */}
                  <div onClick={e => e.stopPropagation()}>
                    {v.estado === "confirmado" ? (
                      <button onClick={e => abrirAnular(e, v)}
                        style={{ padding:"4px 10px", borderRadius:6, border:"none",
                          background:"#FFEBEE", color:"#C62828", fontSize:11,
                          fontWeight:700, cursor:"pointer" }}>
                        Anular
                      </button>
                    ) : (
                      <span style={{ fontSize:11, color:"#bbb" }}>—</span>
                    )}
                  </div>
                </div>

                {/* Detalle expandido */}
                {abierta && (
                  <div style={{ borderTop:`1px solid ${C.border}`, background:"#F8FDF8",
                    padding:"16px 20px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                      {/* Productos */}
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#888",
                          textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
                          Productos vendidos
                        </div>
                        {v.detalles?.length > 0 ? v.detalles.map((d, j) => (
                          <div key={j} style={{ display:"flex", justifyContent:"space-between",
                            padding:"6px 0", fontSize:13,
                            borderBottom: j < v.detalles.length-1 ? `1px solid ${C.border}` : "none" }}>
                            <div>
                              <span style={{ fontWeight:600, color: C.charcoal }}>
                                {d.producto?.nombre || `Prod #${d.producto?.idProducto}`}
                              </span>
                              <span style={{ color:"#888", marginLeft:8, fontSize:12 }}>
                                × {d.cantidad}
                              </span>
                              {d.descuentoItem > 0 && (
                                <span style={{ color:"#6aad7e", marginLeft:6, fontSize:11 }}>
                                  (desc: S/{parseFloat(d.descuentoItem).toFixed(2)})
                                </span>
                              )}
                            </div>
                            <span style={{ fontWeight:700, color: C.emerald }}>
                              {fmt(d.subtotal)}
                            </span>
                          </div>
                        )) : (
                          <div style={{ fontSize:12, color:"#bbb" }}>Sin detalles disponibles</div>
                        )}
                        {v.motivo && (
                          <div style={{ marginTop:10, padding:"8px 12px",
                            background:"#FFEBEE", borderRadius:8, fontSize:12, color:"#C62828" }}>
                            <strong>Motivo de anulación:</strong> {v.motivo}
                          </div>
                        )}
                      </div>

                      {/* Pagos y totales */}
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#888",
                          textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
                          Formas de pago
                        </div>
                        {v.pagos?.length > 0 ? v.pagos.map((p, j) => (
                          <div key={j} style={{ display:"flex", justifyContent:"space-between",
                            padding:"6px 0", fontSize:13,
                            borderBottom: j < v.pagos.length-1 ? `1px solid ${C.border}` : "none" }}>
                            <span style={{ color:"#666" }}>
                              {p.medioPago === "Efectivo" ? "💵" :
                               p.medioPago === "Plin"     ? "📱" :
                               p.medioPago === "Yape"     ? "📲" :
                               p.medioPago === "Tarjeta"  ? "💳" : "💰"} {p.medioPago}
                            </span>
                            <span style={{ fontWeight:700 }}>{fmt(p.monto)}</span>
                          </div>
                        )) : (
                          <div style={{ fontSize:12, color:"#bbb" }}>Sin pagos registrados</div>
                        )}

                        {/* Desglose */}
                        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            fontSize:12, color:"#888", marginBottom:3 }}>
                            <span>Subtotal (sin IGV)</span><span>{fmt(v.subtotal)}</span>
                          </div>
                          <div style={{ display:"flex", justifyContent:"space-between",
                            fontSize:12, color:"#888", marginBottom:3 }}>
                            <span>IGV (18%)</span><span>{fmt(v.igv)}</span>
                          </div>
                          {v.descuentoGlobal > 0 && (
                            <div style={{ display:"flex", justifyContent:"space-between",
                              fontSize:12, color:"#6aad7e", marginBottom:3 }}>
                              <span>Descuento global</span>
                              <span>-{fmt(v.descuentoGlobal)}</span>
                            </div>
                          )}
                          <div style={{ display:"flex", justifyContent:"space-between",
                            fontSize:15, fontWeight:800, color: C.emerald }}>
                            <span>TOTAL</span><span>{fmt(v.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:16 }}>
            {Array.from({ length: totalPaginas }, (_, i) => (
              <button key={i+1} onClick={() => setPagina(i+1)}
                style={{ width:36, height:36, borderRadius:8, border:"none",
                  cursor:"pointer", fontSize:13, fontWeight:600,
                  background: pagina === i+1 ? C.emerald : "#fff",
                  color:       pagina === i+1 ? "#fff"    : "#666",
                  boxShadow:   pagina === i+1 ? `0 4px 12px ${C.emerald}44` : "0 1px 4px #0001" }}>
                {i+1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL ANULAR VENTA ────────────────────────────────────────── */}
      {modalAnular && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 36px",
            maxWidth:420, width:"90%", boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>

            <h3 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800, color: C.charcoal }}>
              ⚠️ Anular Venta #{modalAnular.idVenta}
            </h3>
            <p style={{ margin:"0 0 20px", fontSize:13, color:"#888" }}>
              Esta acción revertirá el stock de los productos. No se puede deshacer.
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                Motivo de anulación *
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Error en el registro, cliente no pagó, etc."
                rows={3}
                autoFocus
                style={{ width:"100%", padding:"10px 14px", borderRadius:10,
                  border:`1.5px solid ${C.border}`, fontSize:13, outline:"none",
                  fontFamily:"inherit", resize:"vertical", boxSizing:"border-box",
                  color: C.charcoal }}
              />
            </div>
            {errorAnul && (
              <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
                borderRadius:8, padding:"10px 14px", fontSize:13, color:"#C62828", marginBottom:14 }}>
                ⚠️ {errorAnul}
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setModalAnular(null)}
                style={{ flex:1, padding:"11px", borderRadius:10,
                  border:`1px solid ${C.border}`, background:"#f5f5f5",
                  cursor:"pointer", fontSize:14, fontWeight:600, color:"#666" }}>
                Cancelar
              </button>
              <button onClick={confirmarAnulacion} disabled={anulando}
                style={{ flex:1, padding:"11px", borderRadius:10, border:"none",
                  background: anulando ? "#ccc" : "#C62828",
                  color:"#fff", cursor: anulando ? "not-allowed" : "pointer",
                  fontSize:14, fontWeight:700 }}>
                {anulando ? "Anulando..." : "Confirmar Anulación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}