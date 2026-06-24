import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://192.168.18.28:8080/api";

const C = {
  emerald:"#0D5E4F", teal:"#0A3D3A", tealDark:"#061A18",
  tangerine:"#E07A2F", warmWhite:"#FAFAF8", softGray:"#F1F3F2",
  charcoal:"#1F1F1F", border:"rgba(13,94,79,0.12)",
};
const G = {
  hero:     "linear-gradient(135deg, #061A18 0%, #0A3D3A 45%, #0D5E4F 100%)",
  glass:    "rgba(255,255,255,0.10)",
  glassBdr: "rgba(255,255,255,0.14)",
};

const money  = (n) => `S/ ${parseFloat(n||0).toFixed(2)}`;
const fmtFecha = (f) => f
  ? new Date(f).toLocaleString("es-PE", { day:"2-digit", month:"short",
      year:"numeric", hour:"2-digit", minute:"2-digit" })
  : "—";

const TIPO_MOV_LABEL = {
  VENTA:       { label:"Venta",        color:"#2E7D32", bg:"#E8F5E9", icon:"💰" },
  GASTO:       { label:"Gasto",        color:"#C62828", bg:"#FFEBEE", icon:"💸" },
  COMPRA:      { label:"Compra",       color:"#B84D00", bg:"#FFF3E0", icon:"🚚" },
  AJUSTE:      { label:"Ajuste",       color:"#0D5E4F", bg:"#E8F5F2", icon:"⚙️" },
  INICIAL:     { label:"Saldo inicial",color:"#555",    bg:"#F5F5F5", icon:"🏦" },
};

const CUENTAS_DESTINO = ["Caja Fisica","Plin","Yape","Otro"];
const TIPOS_GASTO = [
  "Servicios (luz, agua, internet)",
  "Alquiler",
  "Remuneraciones",
  "Útiles de oficina",
  "Mantenimiento",
  "Marketing",
  "Transporte",
  "Otros gastos",
];

export default function Tesoreria() {
  const navigate = useNavigate();

  const [cuentas,     setCuentas]     = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [tab,         setTab]         = useState("resumen"); // resumen | movimientos | registrar
  const [filtroTipo,  setFiltroTipo]  = useState("");
  const [filtroCuenta,setFiltroCuenta]= useState("");

  // Form de gasto manual
  const [formGasto, setFormGasto] = useState({
    concepto:"", tipo:"Servicios (luz, agua, internet)", monto:"", cuenta:"Caja Fisica",
  });
  const [guardando,  setGuardando]  = useState(false);
  const [exito,      setExito]      = useState("");
  const [errorGasto, setErrorGasto] = useState("");

  const cargarDatos = () => {
    setCargando(true);
    Promise.all([
      axios.get(`${API}/tesoreria/cuentas`),
      axios.get(`${API}/tesoreria/movimientos?dias=30`),
    ]).then(([c, m]) => {
      setCuentas(Array.isArray(c.data) ? c.data : []);
      setMovimientos(Array.isArray(m.data) ? m.data : []);
    }).catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarDatos(); }, []);

  const totalSaldo = cuentas.reduce((s, c) => s + parseFloat(c.saldoActual || 0), 0);

  // Movimientos filtrados
  const movFiltrados = movimientos.filter(m => {
    const okTipo   = !filtroTipo    || m.tipoMov === filtroTipo;
    const okCuenta = !filtroCuenta  || m.cuenta?.nombre?.toLowerCase().includes(filtroCuenta.toLowerCase());
    return okTipo && okCuenta;
  });

  // ── Registrar gasto manual ──────────────────────────────────────────────
  const handleRegistrarGasto = async () => {
    setErrorGasto("");
    if (!formGasto.concepto.trim()) { setErrorGasto("El concepto es obligatorio."); return; }
    if (!formGasto.monto || parseFloat(formGasto.monto) <= 0) {
      setErrorGasto("Ingresa un monto válido mayor a 0."); return;
    }
    setGuardando(true);
    try {
      await axios.post(`${API}/tesoreria/gasto`, {
        concepto: formGasto.concepto.trim(),
        tipo:     formGasto.tipo,
        monto:    parseFloat(formGasto.monto),
        cuenta:   formGasto.cuenta,
      });
      setExito(`✅ Gasto de ${money(formGasto.monto)} registrado correctamente.`);
      setFormGasto({ concepto:"", tipo:"Servicios (luz, agua, internet)", monto:"", cuenta:"Caja Fisica" });
      cargarDatos();
      setTimeout(() => setExito(""), 4000);
    } catch (e) {
      const msg = e.response?.data;
      setErrorGasto(typeof msg === "string" ? msg : "Error al registrar el gasto.");
    } finally { setGuardando(false); }
  };

  const inp = {
    width:"100%", padding:"10px 14px", borderRadius:10,
    border:`1.5px solid ${C.border}`, background:"#fff",
    fontSize:14, color: C.charcoal, outline:"none", boxSizing:"border-box",
    fontFamily:"'Inter','DM Sans',system-ui,sans-serif",
  };

  if (cargando) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center",
      minHeight:400, color: C.emerald, fontSize:18 }}>
      Cargando tesorería...
    </div>
  );

  return (
    <div style={{ background: C.softGray, minHeight:"100vh", padding:24,
      fontFamily:"'Inter','DM Sans','Segoe UI',sans-serif" }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <button onClick={() => navigate("/dashboard")}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px",
                border:`1px solid ${C.border}`, borderRadius:8, background:"#fff",
                cursor:"pointer", fontSize:12, fontWeight:600, color:"#666",
                marginBottom:10 }}>
              ← Dashboard
            </button>
            <h1 style={{ margin:0, fontSize:24, fontWeight:800, color: C.charcoal }}>
              💰 Tesorería
            </h1>
            <p style={{ margin:"4px 0 0", color:"#888", fontSize:13 }}>
              Control de cuentas y movimientos financieros
            </p>
          </div>

          {/* Saldo total */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Saldo total</div>
            <div style={{ fontSize:32, fontWeight:900, color: C.tangerine }}>
              {money(totalSaldo)}
            </div>
          </div>
        </div>

        {/* ── TARJETAS DE CUENTAS ───────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
          gap:12, marginBottom:24 }}>
          {cuentas.map(c => (
            <div key={c.idCuenta} style={{
              borderRadius:16, padding:"18px 20px", position:"relative", overflow:"hidden",
              background: G.hero, boxShadow:"0 8px 24px rgba(6,26,24,0.35)",
            }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80,
                borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }}/>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", fontWeight:700,
                textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 }}>
                {c.tipo === "EFECTIVO" ? "🏧" : "📱"} {c.nombre}
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:"#fff" }}>
                {money(c.saldoActual)}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:2 }}>
                {c.tipo}
              </div>
            </div>
          ))}
        </div>

        {/* ── TABS ──────────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:4, marginBottom:20,
          borderBottom:`2px solid ${C.border}`, paddingBottom:0 }}>
          {[
            { k:"resumen",    l:"📊 Resumen" },
            { k:"movimientos",l:"📋 Movimientos" },
            { k:"registrar",  l:"➕ Registrar gasto" },
            // Solo diseño — sin funcionalidad aún
            { k:"cierre",     l:"🔒 Cierre de caja", disabled:true },
            { k:"reportes",   l:"📄 Reportes",        disabled:true },
          ].map(t => (
            <button key={t.k}
              onClick={() => !t.disabled && setTab(t.k)}
              title={t.disabled ? "Próximamente" : ""}
              style={{
                padding:"9px 16px", border:"none", borderRadius:"8px 8px 0 0",
                cursor: t.disabled ? "not-allowed" : "pointer",
                fontSize:13, fontWeight:700, transition:"all 0.15s",
                background: tab === t.k ? "#fff" : "transparent",
                color: t.disabled ? "#ccc" : tab === t.k ? C.emerald : "#888",
                borderBottom: tab === t.k ? `2px solid ${C.emerald}` : "2px solid transparent",
                marginBottom:-2,
              }}>
              {t.l}{t.disabled && " 🔜"}
            </button>
          ))}
        </div>

        {/* ══ TAB: RESUMEN ═══════════════════════════════════════════ */}
        {tab === "resumen" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {/* Últimos movimientos */}
            <div style={{ background:"#fff", borderRadius:16, padding:20,
              border:`1px solid ${C.border}`, gridColumn:"1 / -1" }}>
              <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:800, color: C.charcoal }}>
                Últimos 10 movimientos
              </h3>
              {movimientos.slice(0, 10).map((m, i) => {
                const tipo = TIPO_MOV_LABEL[m.tipoMov] || { label:m.tipoMov, color:"#888", bg:"#f5f5f5", icon:"📝" };
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", padding:"10px 0",
                    borderBottom: i < 9 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10,
                        background: tipo.bg, display:"flex", alignItems:"center",
                        justifyContent:"center", fontSize:18, flexShrink:0 }}>
                        {tipo.icon}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color: C.charcoal }}>
                          {m.descripcion || tipo.label}
                        </div>
                        <div style={{ fontSize:11, color:"#888" }}>
                          {m.cuenta?.nombre || "—"} · {fmtFecha(m.fecha)}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:14, fontWeight:800,
                        color: m.signo === 1 ? "#2E7D32" : "#C62828" }}>
                        {m.signo === 1 ? "+" : "-"}{money(m.monto)}
                      </div>
                      <div style={{ fontSize:11, padding:"2px 8px", borderRadius:20,
                        background: tipo.bg, color: tipo.color, fontWeight:700 }}>
                        {tipo.label}
                      </div>
                    </div>
                  </div>
                );
              })}
              {movimientos.length === 0 && (
                <div style={{ textAlign:"center", padding:"32px", color:"#bbb" }}>
                  Sin movimientos registrados aún
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: MOVIMIENTOS ═══════════════════════════════════════ */}
        {tab === "movimientos" && (
          <div>
            {/* Filtros */}
            <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                style={{ ...inp, width:"auto", padding:"8px 12px" }}>
                <option value="">Todos los tipos</option>
                {Object.entries(TIPO_MOV_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
              <select value={filtroCuenta} onChange={e => setFiltroCuenta(e.target.value)}
                style={{ ...inp, width:"auto", padding:"8px 12px" }}>
                <option value="">Todas las cuentas</option>
                {cuentas.map(c => (
                  <option key={c.idCuenta} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
              {(filtroTipo || filtroCuenta) && (
                <button onClick={() => { setFiltroTipo(""); setFiltroCuenta(""); }}
                  style={{ padding:"8px 14px", borderRadius:10, border:`1px solid ${C.border}`,
                    background:"#fff", cursor:"pointer", fontSize:13, color:"#888" }}>
                  × Limpiar
                </button>
              )}
              <div style={{ marginLeft:"auto", fontSize:13, color:"#888", alignSelf:"center" }}>
                {movFiltrados.length} movimiento{movFiltrados.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div style={{ background:"#fff", borderRadius:16,
              border:`1px solid ${C.border}`, overflow:"hidden" }}>
              {/* Header tabla */}
              <div style={{ display:"grid",
                gridTemplateColumns:"44px 1fr 140px 120px 100px",
                padding:"10px 16px", background: C.softGray,
                fontSize:11, fontWeight:700, color:"#888",
                textTransform:"uppercase", letterSpacing:"0.8px" }}>
                <span></span>
                <span>Descripción</span>
                <span>Fecha</span>
                <span>Cuenta</span>
                <span style={{ textAlign:"right" }}>Monto</span>
              </div>
              {movFiltrados.length === 0 && (
                <div style={{ padding:"40px", textAlign:"center", color:"#bbb" }}>
                  Sin movimientos que coincidan con el filtro
                </div>
              )}
              {movFiltrados.map((m, i) => {
                const tipo = TIPO_MOV_LABEL[m.tipoMov] || { label:m.tipoMov, color:"#888", bg:"#f5f5f5", icon:"📝" };
                return (
                  <div key={i} style={{ display:"grid",
                    gridTemplateColumns:"44px 1fr 140px 120px 100px",
                    padding:"11px 16px", alignItems:"center",
                    borderBottom: i < movFiltrados.length-1 ? `1px solid ${C.border}` : "none",
                    background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                    <div style={{ width:30, height:30, borderRadius:8, background: tipo.bg,
                      display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                      {tipo.icon}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color: C.charcoal }}>
                        {m.descripcion || tipo.label}
                      </div>
                      <span style={{ fontSize:10, padding:"1px 7px", borderRadius:20,
                        background: tipo.bg, color: tipo.color, fontWeight:700 }}>
                        {tipo.label}
                      </span>
                    </div>
                    <span style={{ fontSize:12, color:"#666" }}>{fmtFecha(m.fecha)}</span>
                    <span style={{ fontSize:12, color:"#666" }}>{m.cuenta?.nombre || "—"}</span>
                    <span style={{ fontSize:14, fontWeight:800, textAlign:"right",
                      color: m.signo === 1 ? "#2E7D32" : "#C62828" }}>
                      {m.signo === 1 ? "+" : "-"}{money(m.monto)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ TAB: REGISTRAR GASTO ══════════════════════════════════ */}
        {tab === "registrar" && (
          <div style={{ maxWidth:520 }}>
            <div style={{ background:"#fff", borderRadius:16, padding:28,
              border:`1px solid ${C.border}` }}>
              <h3 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800, color: C.charcoal }}>
                Registrar gasto operativo
              </h3>

              {exito && (
                <div style={{ background:"#E8F5E9", border:"1px solid rgba(46,125,50,0.2)",
                  borderRadius:10, padding:"12px 16px", fontSize:14, color:"#2E7D32",
                  marginBottom:18 }}>
                  {exito}
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Tipo de gasto
                </label>
                <select value={formGasto.tipo}
                  onChange={e => setFormGasto(f => ({...f, tipo:e.target.value}))}
                  style={inp}>
                  {TIPOS_GASTO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Concepto / descripción *
                </label>
                <input value={formGasto.concepto}
                  onChange={e => setFormGasto(f => ({...f, concepto:e.target.value}))}
                  placeholder="Ej: Pago factura luz mes de junio"
                  style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    Monto (S/) *
                  </label>
                  <input type="number" min="0.01" step="0.01"
                    value={formGasto.monto}
                    onChange={e => setFormGasto(f => ({...f, monto:e.target.value}))}
                    placeholder="0.00"
                    style={inp} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    Cuenta de salida
                  </label>
                  <select value={formGasto.cuenta}
                    onChange={e => setFormGasto(f => ({...f, cuenta:e.target.value}))}
                    style={inp}>
                    {cuentas.map(c => <option key={c.idCuenta}>{c.nombre}</option>)}
                    {CUENTAS_DESTINO.filter(n => !cuentas.find(c=>c.nombre===n)).map(n=>(
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {errorGasto && (
                <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#C62828",
                  marginBottom:16 }}>
                  ⚠️ {errorGasto}
                </div>
              )}

              <button onClick={handleRegistrarGasto} disabled={guardando}
                style={{ width:"100%", padding:"13px", borderRadius:10, border:"none",
                  background: guardando
                    ? "#ccc"
                    : `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                  color:"#fff", cursor: guardando ? "not-allowed" : "pointer",
                  fontSize:15, fontWeight:700,
                  fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>
                {guardando ? "Registrando..." : "💸 Registrar gasto"}
              </button>

              <p style={{ margin:"14px 0 0", fontSize:12, color:"#aaa", textAlign:"center" }}>
                El gasto se descontará de la cuenta seleccionada y se registrará en el log de eventos.
              </p>
            </div>

            {/* Tarjetas de diseño — sin funcionalidad todavía */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:16 }}>
              <div style={{ background:"#fff", borderRadius:16, padding:20,
                border:`1px solid ${C.border}`, opacity:0.6 }}>
                <div style={{ fontSize:20, marginBottom:8 }}>🔒</div>
                <div style={{ fontSize:14, fontWeight:700, color: C.charcoal, marginBottom:4 }}>
                  Cierre de caja
                </div>
                <div style={{ fontSize:12, color:"#888" }}>
                  Arqueo y cierre del turno diario
                </div>
                <div style={{ marginTop:10, fontSize:11, color: C.tangerine, fontWeight:700 }}>
                  🔜 Próximamente
                </div>
              </div>
              <div style={{ background:"#fff", borderRadius:16, padding:20,
                border:`1px solid ${C.border}`, opacity:0.6 }}>
                <div style={{ fontSize:20, marginBottom:8 }}>📄</div>
                <div style={{ fontSize:14, fontWeight:700, color: C.charcoal, marginBottom:4 }}>
                  Reportes
                </div>
                <div style={{ fontSize:12, color:"#888" }}>
                  PDF y Excel de ingresos y egresos
                </div>
                <div style={{ marginTop:10, fontSize:11, color: C.tangerine, fontWeight:700 }}>
                  🔜 Próximamente
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}