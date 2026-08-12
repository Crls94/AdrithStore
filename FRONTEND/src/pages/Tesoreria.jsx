import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { getProductos } from "../api/productosApi";

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
  COMPRA_ANULADA: { label:"Compra anulada", color:"#2E7D32", bg:"#E8F5E9", icon:"↩️" },
  AJUSTE:      { label:"Ajuste",       color:"#0D5E4F", bg:"#E8F5F2", icon:"⚙️" },
  APORTE:      { label:"Ingreso capital", color:"#2E7D32", bg:"#E8F5E9", icon:"💵" },
  RETIRO:      { label:"Retiro",       color:"#B84D00", bg:"#FFF3E0", icon:"📤" },
  TRANSFERENCIA: { label:"Transferencia entre cuentas", color:"#1A73E8", bg:"#E8F0FE", icon:"🔁" },
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
const TIPOS_INGRESO_CAPITAL = [
  "Aporte de capital inicial",
  "Inversión",
  "Reposición de caja",
  "Otro ingreso",
];
const TIPOS_RETIRO = [
  "Sueldo del mes",
  "Retorno de inversión",
  "Otro retiro",
];

export default function Tesoreria() {
  const navigate = useNavigate();

  const [cuentas,     setCuentas]     = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [errorCarga,  setErrorCarga]  = useState("");
  const [tab,         setTab]         = useState("resumen");
  const [filtroTipo,  setFiltroTipo]  = useState("");
  const [filtroCuenta,setFiltroCuenta]= useState("");


  const [movTipo, setMovTipo] = useState("gasto"); // "gasto" | "capital" | "retiro"

  const [formGasto, setFormGasto] = useState({
    concepto:"", tipo:"Servicios (luz, agua, internet)", monto:"", cuenta:"Caja Fisica",
  });
  const [guardando,  setGuardando]  = useState(false);
  const [exito,      setExito]      = useState("");
  const [errorGasto, setErrorGasto] = useState("");


  const [formCapital, setFormCapital] = useState({
    concepto:"", tipo:"Aporte de capital inicial", monto:"", cuenta:"Caja Fisica",
  });
  const [guardandoCapital, setGuardandoCapital] = useState(false);
  const [exitoCapital,     setExitoCapital]     = useState("");
  const [errorCapital,     setErrorCapital]     = useState("");


  const [formRetiro, setFormRetiro] = useState({
    concepto:"", tipo:"Sueldo del mes", monto:"", cuenta:"Caja Fisica",
  });
  const [guardandoRetiro, setGuardandoRetiro] = useState(false);
  const [exitoRetiro,     setExitoRetiro]     = useState("");
  const [errorRetiro,     setErrorRetiro]     = useState("");
  const [statsMes,        setStatsMes]        = useState(null); // ganancia del mes (calculadora)
  const [cargandoStatsMes,setCargandoStatsMes]= useState(false);
  const [pctRetiro,       setPctRetiro]       = useState("");


  const [formTransferencia, setFormTransferencia] = useState({
    cuentaOrigen:"Yape", cuentaDestino:"Caja Fisica", monto:"", concepto:"",
  });
  const [guardandoTransferencia, setGuardandoTransferencia] = useState(false);
  const [exitoTransferencia,     setExitoTransferencia]     = useState("");
  const [errorTransferencia,     setErrorTransferencia]     = useState("");

  const [fechaCierre, setFechaCierre] = useState(() => new Date().toISOString().split('T')[0]);
  const [previewCierre, setPreviewCierre] = useState([]);
  const [cierreCargando, setCierreCargando] = useState(false);
  const [ejecutandoCierre, setEjecutandoCierre] = useState(false);
  const [cierreExito, setCierreExito] = useState("");
  const [cierreError, setCierreError] = useState("");
  const [saldoContadoInput, setSaldoContadoInput] = useState({});
  const [observacionInput,  setObservacionInput]  = useState({});

  const [productosInv,     setProductosInv]     = useState([]);
  const [cargandoInv,      setCargandoInv]       = useState(false);
  const [busquedaInv,      setBusquedaInv]       = useState("");
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  const cargarDatos = () => {
    setCargando(true); setErrorCarga("");
    Promise.all([
      api.get('/tesoreria/cuentas'),
      api.get('/tesoreria/movimientos?dias=30'),
    ]).then(([c, m]) => {
      setCuentas(Array.isArray(c.data) ? c.data : []);
      setMovimientos(Array.isArray(m.data) ? m.data : []);
    }).catch(() => setErrorCarga("No se pudieron cargar las cuentas/movimientos. Verifica tu conexión e intenta de nuevo."))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { if (tab === "cierre") cargarPreview(fechaCierre); }, [tab]);
  useEffect(() => { if (tab === "inventario") cargarInventario(); }, [tab]);
  useEffect(() => {
    if (tab === "movimiento" && movTipo === "retiro" && !statsMes && !cargandoStatsMes) cargarStatsMes();
  }, [tab, movTipo]);

  const cargarInventario = () => {
    setCargandoInv(true); setErrorCarga("");
    getProductos()
      .then(r => setProductosInv(Array.isArray(r.data) ? r.data : []))
      .catch(() => setErrorCarga("No se pudo cargar el inventario. Verifica tu conexión e intenta de nuevo."))
      .finally(() => setCargandoInv(false));
  };

  // Ganancia del mes para la calculadora de retiro: mismo dato/cálculo que ya
  // muestra el Dashboard (ingresos - costos), viene de un endpoint que ya existe.
  const cargarStatsMes = () => {
    setCargandoStatsMes(true);
    api.get('/dashboard/stats?periodo=mes')
      .then(r => setStatsMes(r.data))
      .catch(() => setStatsMes(null))
      .finally(() => setCargandoStatsMes(false));
  };

  const gananciaMes = statsMes
    ? parseFloat(statsMes.totalIngresos || 0) - parseFloat(statsMes.totalCostos || 0)
    : null;

  const cambiarMovTipo = (t) => {
    setMovTipo(t);
    setErrorGasto(""); setExito("");
    setErrorCapital(""); setExitoCapital("");
    setErrorRetiro(""); setExitoRetiro("");
    setErrorTransferencia(""); setExitoTransferencia("");
  };

  const aplicarPctRetiro = (pct) => {
    setPctRetiro(pct);
    if (gananciaMes == null || pct === "") return;
    const sugerido = gananciaMes * (parseFloat(pct) || 0) / 100;
    setFormRetiro(f => ({ ...f, monto: sugerido > 0 ? sugerido.toFixed(2) : "" }));
  };


  const categoriasInv = useMemo(() => {
    const soloStock = productosInv.filter(p =>
      p.tipo === "BIEN_FISICO" || p.tipo === "CONSUMIBLE");
    const filtrados = busquedaInv.trim()
      ? soloStock.filter(p =>
          p.nombre?.toLowerCase().includes(busquedaInv.toLowerCase()) ||
          p.sku?.toLowerCase().includes(busquedaInv.toLowerCase()))
      : soloStock;

    const grupos = {};
    for (const p of filtrados) {
      const nombreCat = p.categoria?.nombre || "Sin categoría";
      const stock     = parseFloat(p.stock || 0);
      const costoUnit = parseFloat(p.cpp) > 0 ? parseFloat(p.cpp) : parseFloat(p.precioCosto || 0);
      const costoInvertido = stock * costoUnit;
      const valorMerc      = stock * parseFloat(p.precioVenta || 0);
      if (!grupos[nombreCat]) grupos[nombreCat] = { nombre: nombreCat, productos: [], costo: 0, valor: 0 };
      grupos[nombreCat].productos.push({ ...p, stock, costoUnit, costoInvertido, valorMerc });
      grupos[nombreCat].costo += costoInvertido;
      grupos[nombreCat].valor += valorMerc;
    }
    return Object.values(grupos)
      .map(g => ({ ...g, productos: g.productos.sort((a,b) => a.nombre.localeCompare(b.nombre)) }))
      .sort((a,b) => a.nombre.localeCompare(b.nombre));
  }, [productosInv, busquedaInv]);

  const totalesInv = useMemo(() => categoriasInv.reduce((acc, g) => ({
    costo: acc.costo + g.costo,
    valor: acc.valor + g.valor,
    productos: acc.productos + g.productos.length,
  }), { costo:0, valor:0, productos:0 }), [categoriasInv]);

  const toggleCategoria = (nombre) =>
    setCategoriasAbiertas(s => ({ ...s, [nombre]: !s[nombre] }));

  const totalSaldo = cuentas.reduce((s, c) => s + parseFloat(c.saldoActual || 0), 0);

  
  const movFiltrados = movimientos.filter(m => {
    const okTipo   = !filtroTipo    || m.tipoMov === filtroTipo;
    const okCuenta = !filtroCuenta  || m.cuenta?.nombre?.toLowerCase().includes(filtroCuenta.toLowerCase());
    return okTipo && okCuenta;
  });

  
  const handleRegistrarGasto = async () => {
    setErrorGasto("");
    if (!formGasto.concepto.trim()) { setErrorGasto("El concepto es obligatorio."); return; }
    if (!formGasto.monto || parseFloat(formGasto.monto) <= 0) {
      setErrorGasto("Ingresa un monto válido mayor a 0."); return;
    }
    setGuardando(true);
    try {
      await api.post('/tesoreria/gasto', {
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


  const handleRegistrarIngresoCapital = async () => {
    setErrorCapital("");
    if (!formCapital.concepto.trim()) { setErrorCapital("El concepto es obligatorio."); return; }
    if (!formCapital.monto || parseFloat(formCapital.monto) <= 0) {
      setErrorCapital("Ingresa un monto válido mayor a 0."); return;
    }
    setGuardandoCapital(true);
    try {
      await api.post('/tesoreria/ingreso-capital', {
        concepto: formCapital.concepto.trim(),
        tipo:     formCapital.tipo,
        monto:    parseFloat(formCapital.monto),
        cuenta:   formCapital.cuenta,
      });
      setExitoCapital(`✅ Ingreso de ${money(formCapital.monto)} registrado correctamente.`);
      setFormCapital({ concepto:"", tipo:"Aporte de capital inicial", monto:"", cuenta:"Caja Fisica" });
      cargarDatos();
      setTimeout(() => setExitoCapital(""), 4000);
    } catch (e) {
      const msg = e.response?.data;
      setErrorCapital(typeof msg === "string" ? msg : "Error al registrar el ingreso.");
    } finally { setGuardandoCapital(false); }
  };


  const handleRegistrarRetiro = async () => {
    setErrorRetiro("");
    if (!formRetiro.concepto.trim()) { setErrorRetiro("El concepto es obligatorio."); return; }
    if (!formRetiro.monto || parseFloat(formRetiro.monto) <= 0) {
      setErrorRetiro("Ingresa un monto válido mayor a 0."); return;
    }
    setGuardandoRetiro(true);
    try {
      await api.post('/tesoreria/retiro', {
        concepto: formRetiro.concepto.trim(),
        tipo:     formRetiro.tipo,
        monto:    parseFloat(formRetiro.monto),
        cuenta:   formRetiro.cuenta,
      });
      setExitoRetiro(`✅ Retiro de ${money(formRetiro.monto)} registrado correctamente.`);
      setFormRetiro({ concepto:"", tipo:"Sueldo del mes", monto:"", cuenta:"Caja Fisica" });
      setPctRetiro("");
      setStatsMes(null);
      cargarDatos();
      setTimeout(() => setExitoRetiro(""), 4000);
    } catch (e) {
      const msg = e.response?.data;
      setErrorRetiro(typeof msg === "string" ? msg : "Error al registrar el retiro.");
    } finally { setGuardandoRetiro(false); }
  };


  const handleRegistrarTransferencia = async () => {
    setErrorTransferencia("");
    if (formTransferencia.cuentaOrigen === formTransferencia.cuentaDestino) {
      setErrorTransferencia("Elige dos cuentas distintas."); return;
    }
    if (!formTransferencia.monto || parseFloat(formTransferencia.monto) <= 0) {
      setErrorTransferencia("Ingresa un monto válido mayor a 0."); return;
    }
    setGuardandoTransferencia(true);
    try {
      await api.post('/tesoreria/transferencia', {
        cuentaOrigen:  formTransferencia.cuentaOrigen,
        cuentaDestino: formTransferencia.cuentaDestino,
        monto:         parseFloat(formTransferencia.monto),
        concepto:      formTransferencia.concepto.trim(),
      });
      setExitoTransferencia(`✅ Transferencia de ${money(formTransferencia.monto)} de ${formTransferencia.cuentaOrigen} a ${formTransferencia.cuentaDestino} registrada.`);
      setFormTransferencia(f => ({ ...f, monto:"", concepto:"" }));
      cargarDatos();
      setTimeout(() => setExitoTransferencia(""), 4000);
    } catch (e) {
      const msg = e.response?.data;
      setErrorTransferencia(typeof msg === "string" ? msg : "Error al registrar la transferencia.");
    } finally { setGuardandoTransferencia(false); }
  };

  const cargarPreview = async (fecha) => {
    setCierreCargando(true);
    setCierreError("");
    try {
      const res = await api.get(`/tesoreria/cierre/preview?fecha=${fecha}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setPreviewCierre(data);
      const inputs = {};
      data.forEach(c => { inputs[c.idCuenta] = c.saldoSistema; });
      setSaldoContadoInput(inputs);
      setObservacionInput({});
    } catch (e) {
      setCierreError("No se pudo cargar el preview del cierre. Intenta de nuevo.");
    }
    finally { setCierreCargando(false); }
  };

  const handleEjecutarCierre = async () => {
    setCierreError("");
    const items = previewCierre.map(c => ({
      idCuenta: c.idCuenta,
      saldoContado: parseFloat(saldoContadoInput[c.idCuenta] ?? c.saldoSistema),
      observacion: (observacionInput[c.idCuenta] || "").trim(),
    }));
    if (items.length === 0) return;
    setEjecutandoCierre(true);
    try {
      const res = await api.post('/tesoreria/cierre/ejecutar', {
        fecha: fechaCierre, items,
      });
      setCierreExito(res.data.mensaje || "✅ Cierre ejecutado");
      setTimeout(() => setCierreExito(""), 4000);
      cargarPreview(fechaCierre);
      cargarDatos();
    } catch (e) {
      setCierreError(e.response?.data?.error || "Error al ejecutar cierre");
    } finally { setEjecutandoCierre(false); }
  };

  const cuentaSeleccionada = cuentas.find(c => c.nombre === formGasto.cuenta);
  const saldoDisponible = cuentaSeleccionada?.saldoActual ?? 0;
  const montoSuperaSaldo = parseFloat(formGasto.monto || 0) > parseFloat(saldoDisponible);

  const cuentaSeleccionadaRetiro = cuentas.find(c => c.nombre === formRetiro.cuenta);
  const saldoDisponibleRetiro = cuentaSeleccionadaRetiro?.saldoActual ?? 0;
  const montoSuperaSaldoRetiro = parseFloat(formRetiro.monto || 0) > parseFloat(saldoDisponibleRetiro);

  const cuentaOrigenTransferencia = cuentas.find(c => c.nombre === formTransferencia.cuentaOrigen);
  const saldoDisponibleTransferencia = cuentaOrigenTransferencia?.saldoActual ?? 0;
  const montoSuperaSaldoTransferencia = parseFloat(formTransferencia.monto || 0) > parseFloat(saldoDisponibleTransferencia);

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

        { }
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

          { }
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Saldo total</div>
            <div style={{ fontSize:32, fontWeight:900, color: C.tangerine }}>
              {money(totalSaldo)}
            </div>
          </div>
        </div>

        { }
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

        { }
        <div style={{ display:"flex", gap:4, marginBottom:20,
          borderBottom:`2px solid ${C.border}`, paddingBottom:0 }}>
          {[
            { k:"resumen",    l:"📊 Resumen" },
            { k:"movimientos",l:"📋 Movimientos" },
            { k:"movimiento", l:"💸 Movimiento de caja" },
            { k:"cierre",     l:"🔒 Cierre de caja" },
            { k:"inventario", l:"📦 Inventario" },
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

        { }
        {errorCarga && (
          <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
            borderRadius:10, padding:"10px 14px", fontSize:13, color:"#C62828",
            marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span>⚠️ {errorCarga}</span>
            <button onClick={() => (tab === "inventario" ? cargarInventario() : cargarDatos())}
              style={{ background:"none", border:"none", color:"#C62828", fontWeight:700,
                cursor:"pointer", fontSize:13, textDecoration:"underline" }}>
              Reintentar
            </button>
          </div>
        )}

        { }
        {tab === "resumen" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            { }
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

        { }
        {tab === "movimientos" && (
          <div>
            { }
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
              { }
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

        { }
        {tab === "movimiento" && (
          <div style={{ maxWidth:520 }}>
            { }
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {[
                { k:"gasto",   l:"💸 Gasto" },
                { k:"capital", l:"💵 Ingreso de capital" },
                { k:"retiro",  l:"📤 Retiro" },
                { k:"transferencia", l:"🔁 Transferencia" },
              ].map(m => (
                <button key={m.k} onClick={() => cambiarMovTipo(m.k)}
                  style={{ flex:1, padding:"9px 10px", borderRadius:10,
                    cursor:"pointer", fontSize:12.5, fontWeight:700,
                    background: movTipo === m.k ? C.emerald : "#fff",
                    color:      movTipo === m.k ? "#fff"    : "#666",
                    boxShadow:  movTipo === m.k ? `0 4px 12px ${C.emerald}33` : `0 1px 4px #0001`,
                    border: movTipo === m.k ? "none" : `1px solid ${C.border}` }}>
                  {m.l}
                </button>
              ))}
            </div>

            {movTipo === "gasto" && (
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
                  <div style={{ fontSize:12, color:"#666", marginTop:4 }}>
                    Saldo disponible: <strong>{money(saldoDisponible)}</strong>
                  </div>
                </div>
              </div>

              {montoSuperaSaldo && formGasto.monto && (
                <div style={{ background:"#FFF3E0", border:"1px solid rgba(224,122,47,0.3)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#B84D00", marginBottom:16 }}>
                  ⚠️ El monto supera el saldo disponible en {formGasto.cuenta}.
                </div>
              )}

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
            )}

            {movTipo === "capital" && (
            <div style={{ background:"#fff", borderRadius:16, padding:28,
              border:`1px solid ${C.border}` }}>
              <h3 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800, color: C.charcoal }}>
                Registrar ingreso de capital
              </h3>

              {exitoCapital && (
                <div style={{ background:"#E8F5E9", border:"1px solid rgba(46,125,50,0.2)",
                  borderRadius:10, padding:"12px 16px", fontSize:14, color:"#2E7D32",
                  marginBottom:18 }}>
                  {exitoCapital}
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Tipo de ingreso
                </label>
                <select value={formCapital.tipo}
                  onChange={e => setFormCapital(f => ({...f, tipo:e.target.value}))}
                  style={inp}>
                  {TIPOS_INGRESO_CAPITAL.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Concepto / descripción *
                </label>
                <input value={formCapital.concepto}
                  onChange={e => setFormCapital(f => ({...f, concepto:e.target.value}))}
                  placeholder="Ej: Dejé S/100 para iniciar la venta de esta semana"
                  style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    Monto (S/) *
                  </label>
                  <input type="number" min="0.01" step="0.01"
                    value={formCapital.monto}
                    onChange={e => setFormCapital(f => ({...f, monto:e.target.value}))}
                    placeholder="0.00"
                    style={inp} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    Cuenta destino
                  </label>
                  <select value={formCapital.cuenta}
                    onChange={e => setFormCapital(f => ({...f, cuenta:e.target.value}))}
                    style={inp}>
                    {cuentas.map(c => <option key={c.idCuenta}>{c.nombre}</option>)}
                    {CUENTAS_DESTINO.filter(n => !cuentas.find(c=>c.nombre===n)).map(n=>(
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {errorCapital && (
                <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#C62828",
                  marginBottom:16 }}>
                  ⚠️ {errorCapital}
                </div>
              )}

              <button onClick={handleRegistrarIngresoCapital} disabled={guardandoCapital}
                style={{ width:"100%", padding:"13px", borderRadius:10, border:"none",
                  background: guardandoCapital
                    ? "#ccc"
                    : `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                  color:"#fff", cursor: guardandoCapital ? "not-allowed" : "pointer",
                  fontSize:15, fontWeight:700,
                  fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>
                {guardandoCapital ? "Registrando..." : "💵 Registrar ingreso"}
              </button>

              <p style={{ margin:"14px 0 0", fontSize:12, color:"#aaa", textAlign:"center" }}>
                El ingreso se suma a la cuenta seleccionada y se registra en el log de eventos.
                No cuenta como venta ni afecta la ganancia del Dashboard.
              </p>
            </div>
            )}

            {movTipo === "retiro" && (
            <div style={{ background:"#fff", borderRadius:16, padding:28,
              border:`1px solid ${C.border}` }}>
              <h3 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800, color: C.charcoal }}>
                Registrar retiro
              </h3>

              { }
              <div style={{ background: C.softGray, borderRadius:12, padding:"14px 16px", marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
                  Calculadora — ganancia de este mes
                </div>
                {cargandoStatsMes ? (
                  <div style={{ fontSize:13, color:"#888" }}>Cargando...</div>
                ) : gananciaMes == null ? (
                  <div style={{ fontSize:13, color:"#888" }}>No se pudo cargar la ganancia del mes.</div>
                ) : (
                  <>
                    <div style={{ fontSize:20, fontWeight:800, color: C.emerald, marginBottom:10 }}>
                      {money(gananciaMes)}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <label style={{ fontSize:12, color:"#666" }}>% a retirar:</label>
                      <input type="number" min="0" max="100" step="1"
                        value={pctRetiro}
                        onChange={e => aplicarPctRetiro(e.target.value)}
                        placeholder="30"
                        style={{ width:70, padding:"6px 8px", borderRadius:8,
                          border:`1px solid ${C.border}`, fontSize:13, textAlign:"right",
                          outline:"none", fontFamily:"inherit" }} />
                      <span style={{ fontSize:12, color:"#888" }}>→ autocompleta el monto abajo</span>
                    </div>
                  </>
                )}
                <p style={{ margin:"10px 0 0", fontSize:11, color:"#aaa" }}>
                  El resto de la ganancia no se registra aparte: se queda en la cuenta tal cual.
                </p>
              </div>

              {exitoRetiro && (
                <div style={{ background:"#E8F5E9", border:"1px solid rgba(46,125,50,0.2)",
                  borderRadius:10, padding:"12px 16px", fontSize:14, color:"#2E7D32",
                  marginBottom:18 }}>
                  {exitoRetiro}
                </div>
              )}

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Tipo de retiro
                </label>
                <select value={formRetiro.tipo}
                  onChange={e => setFormRetiro(f => ({...f, tipo:e.target.value}))}
                  style={inp}>
                  {TIPOS_RETIRO.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Concepto / descripción *
                </label>
                <input value={formRetiro.concepto}
                  onChange={e => setFormRetiro(f => ({...f, concepto:e.target.value}))}
                  placeholder="Ej: Sueldo al mes"
                  style={inp} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    Monto (S/) *
                  </label>
                  <input type="number" min="0.01" step="0.01"
                    value={formRetiro.monto}
                    onChange={e => setFormRetiro(f => ({...f, monto:e.target.value}))}
                    placeholder="0.00"
                    style={inp} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    Cuenta de salida
                  </label>
                  <select value={formRetiro.cuenta}
                    onChange={e => setFormRetiro(f => ({...f, cuenta:e.target.value}))}
                    style={inp}>
                    {cuentas.map(c => <option key={c.idCuenta}>{c.nombre}</option>)}
                    {CUENTAS_DESTINO.filter(n => !cuentas.find(c=>c.nombre===n)).map(n=>(
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                  <div style={{ fontSize:12, color:"#666", marginTop:4 }}>
                    Saldo disponible: <strong>{money(saldoDisponibleRetiro)}</strong>
                  </div>
                </div>
              </div>

              {montoSuperaSaldoRetiro && formRetiro.monto && (
                <div style={{ background:"#FFF3E0", border:"1px solid rgba(224,122,47,0.3)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#B84D00", marginBottom:16 }}>
                  ⚠️ El monto supera el saldo disponible en {formRetiro.cuenta}.
                </div>
              )}

              {errorRetiro && (
                <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#C62828",
                  marginBottom:16 }}>
                  ⚠️ {errorRetiro}
                </div>
              )}

              <button onClick={handleRegistrarRetiro} disabled={guardandoRetiro}
                style={{ width:"100%", padding:"13px", borderRadius:10, border:"none",
                  background: guardandoRetiro
                    ? "#ccc"
                    : `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                  color:"#fff", cursor: guardandoRetiro ? "not-allowed" : "pointer",
                  fontSize:15, fontWeight:700,
                  fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>
                {guardandoRetiro ? "Registrando..." : "📤 Registrar retiro"}
              </button>

              <p style={{ margin:"14px 0 0", fontSize:12, color:"#aaa", textAlign:"center" }}>
                El retiro se descuenta de la cuenta seleccionada y se registra en el log de eventos.
              </p>
            </div>
            )}

            {movTipo === "transferencia" && (
            <div style={{ background:"#fff", borderRadius:16, padding:28,
              border:`1px solid ${C.border}` }}>
              <h3 style={{ margin:"0 0 20px", fontSize:16, fontWeight:800, color: C.charcoal }}>
                Transferir entre cuentas propias
              </h3>

              {exitoTransferencia && (
                <div style={{ background:"#E8F5E9", border:"1px solid rgba(46,125,50,0.2)",
                  borderRadius:10, padding:"12px 16px", fontSize:14, color:"#2E7D32",
                  marginBottom:18 }}>
                  {exitoTransferencia}
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    De (origen)
                  </label>
                  <select value={formTransferencia.cuentaOrigen}
                    onChange={e => setFormTransferencia(f => ({...f, cuentaOrigen:e.target.value}))}
                    style={inp}>
                    {cuentas.map(c => <option key={c.idCuenta}>{c.nombre}</option>)}
                    {CUENTAS_DESTINO.filter(n => !cuentas.find(c=>c.nombre===n)).map(n=>(
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                  <div style={{ fontSize:12, color:"#666", marginTop:4 }}>
                    Saldo disponible: <strong>{money(saldoDisponibleTransferencia)}</strong>
                  </div>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                    textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                    A (destino)
                  </label>
                  <select value={formTransferencia.cuentaDestino}
                    onChange={e => setFormTransferencia(f => ({...f, cuentaDestino:e.target.value}))}
                    style={inp}>
                    {cuentas.map(c => <option key={c.idCuenta}>{c.nombre}</option>)}
                    {CUENTAS_DESTINO.filter(n => !cuentas.find(c=>c.nombre===n)).map(n=>(
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Monto (S/) *
                </label>
                <input type="number" min="0.01" step="0.01"
                  value={formTransferencia.monto}
                  onChange={e => setFormTransferencia(f => ({...f, monto:e.target.value}))}
                  placeholder="0.00"
                  style={inp} />
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#888",
                  textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
                  Concepto (opcional)
                </label>
                <input value={formTransferencia.concepto}
                  onChange={e => setFormTransferencia(f => ({...f, concepto:e.target.value}))}
                  placeholder="Ej: Cambié el Yape del día a efectivo"
                  style={inp} />
              </div>

              {formTransferencia.cuentaOrigen === formTransferencia.cuentaDestino && (
                <div style={{ background:"#FFF3E0", border:"1px solid rgba(224,122,47,0.3)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#B84D00", marginBottom:16 }}>
                  ⚠️ Elige dos cuentas distintas.
                </div>
              )}

              {montoSuperaSaldoTransferencia && formTransferencia.monto && (
                <div style={{ background:"#FFF3E0", border:"1px solid rgba(224,122,47,0.3)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#B84D00", marginBottom:16 }}>
                  ⚠️ El monto supera el saldo disponible en {formTransferencia.cuentaOrigen}.
                </div>
              )}

              {errorTransferencia && (
                <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
                  borderRadius:10, padding:"10px 14px", fontSize:13, color:"#C62828",
                  marginBottom:16 }}>
                  ⚠️ {errorTransferencia}
                </div>
              )}

              <button onClick={handleRegistrarTransferencia}
                disabled={guardandoTransferencia || formTransferencia.cuentaOrigen === formTransferencia.cuentaDestino}
                style={{ width:"100%", padding:"13px", borderRadius:10, border:"none",
                  background: (guardandoTransferencia || formTransferencia.cuentaOrigen === formTransferencia.cuentaDestino)
                    ? "#ccc"
                    : `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                  color:"#fff",
                  cursor: (guardandoTransferencia || formTransferencia.cuentaOrigen === formTransferencia.cuentaDestino) ? "not-allowed" : "pointer",
                  fontSize:15, fontWeight:700,
                  fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>
                {guardandoTransferencia ? "Registrando..." : "🔁 Transferir"}
              </button>

              <p style={{ margin:"14px 0 0", fontSize:12, color:"#aaa", textAlign:"center" }}>
                No es venta ni gasto: la plata sigue siendo del negocio, solo cambia de cuenta.
                Queda registrada en el log de eventos.
              </p>
            </div>
            )}

          </div>
        )}

        { }
        {tab === "cierre" && (
          <div>
            {cierreCargando ? (
              <div style={{ textAlign:"center", padding:40, color:C.emerald, fontSize:15 }}>
                Cargando cierre...
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.charcoal }}>
                    🔒 Cierre de caja
                  </h3>
                  <input type="date" value={fechaCierre}
                    onChange={e => { setFechaCierre(e.target.value); cargarPreview(e.target.value); }}
                    style={{ padding:"8px 12px", borderRadius:10, border:`1.5px solid ${C.border}`,
                      fontSize:13, outline:"none", fontFamily:"inherit" }} />
                </div>

                {cierreExito && (
                  <div style={{ background:"#E8F5E9", border:"1px solid rgba(46,125,50,0.2)",
                    borderRadius:10, padding:"12px 16px", fontSize:14, color:"#2E7D32", marginBottom:16 }}>
                    {cierreExito}
                  </div>
                )}
                {cierreError && (
                  <div style={{ background:"#FFEBEE", border:"1px solid rgba(198,40,40,0.2)",
                    borderRadius:10, padding:"10px 14px", fontSize:13, color:"#C62828", marginBottom:16 }}>
                    ⚠️ {cierreError}
                  </div>
                )}

                {previewCierre.length === 0 && (
                  <div style={{ textAlign:"center", padding:32, color:"#bbb" }}>
                    No hay cuentas activas para este día
                  </div>
                )}

                {previewCierre.length > 0 && (
                  <div style={{ background:"#fff", borderRadius:16,
                    border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:16 }}>
                    <div style={{ display:"grid",
                      gridTemplateColumns:"1fr 100px 120px 90px 1.4fr",
                      padding:"10px 16px", background:C.softGray,
                      fontSize:11, fontWeight:700, color:"#888",
                      textTransform:"uppercase", letterSpacing:"0.8px" }}>
                      <span>Cuenta</span>
                      <span style={{ textAlign:"right" }}>Sistema</span>
                      <span style={{ textAlign:"right" }}>Contado</span>
                      <span style={{ textAlign:"right" }}>Diff</span>
                      <span style={{ paddingLeft:12 }}>Observación</span>
                    </div>
                    {previewCierre.map((c, i) => {
                      const contado = parseFloat(saldoContadoInput[c.idCuenta] ?? c.saldoSistema);
                      const diff = contado - c.saldoSistema;
                      const diffColor = diff === 0 ? "#888" : diff > 0 ? "#2E7D32" : "#C62828";
                      return (
                        <div key={c.idCuenta} style={{ display:"grid",
                          gridTemplateColumns:"1fr 100px 120px 90px 1.4fr",
                          padding:"11px 16px", alignItems:"center",
                          borderBottom: i < previewCierre.length-1 ? `1px solid ${C.border}` : "none",
                          background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                          <span style={{ fontSize:13, fontWeight:600, color:C.charcoal }}>
                            {c.nombre}
                          </span>
                          <span style={{ fontSize:13, textAlign:"right", color:C.charcoal }}>
                            {money(c.saldoSistema)}
                          </span>
                          <span style={{ textAlign:"right" }}>
                            <input type="number" step="0.01"
                              value={saldoContadoInput[c.idCuenta] ?? ""}
                              onChange={e => setSaldoContadoInput(i => ({...i, [c.idCuenta]: e.target.value}))}
                              style={{ width:"90%", padding:"6px 8px", borderRadius:8,
                                border:`1px solid ${C.border}`, fontSize:13, textAlign:"right",
                                outline:"none", fontFamily:"inherit" }} />
                            {c.yaCerrado && (
                              <div style={{ fontSize:10, color:"#aaa", marginTop:2 }}>
                                último: {money(c.saldoContado)} · {new Date(c.cerradoEn).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
                              </div>
                            )}
                          </span>
                          <span style={{ fontSize:13, textAlign:"right", fontWeight:700, color:diffColor }}>
                            {diff >= 0 ? "+" : ""}{money(diff)}
                          </span>
                          <span style={{ paddingLeft:12 }}>
                            <input type="text"
                              value={observacionInput[c.idCuenta] ?? ""}
                              onChange={e => setObservacionInput(i => ({...i, [c.idCuenta]: e.target.value}))}
                              placeholder={diff !== 0 ? "Ej: faltó S/10, ya se repuso" : "Sin novedad"}
                              style={{ width:"100%", padding:"6px 8px", borderRadius:8,
                                border:`1px solid ${C.border}`, fontSize:13,
                                outline:"none", fontFamily:"inherit", boxSizing:"border-box" }} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {previewCierre.length > 0 && (
                  <button onClick={handleEjecutarCierre} disabled={ejecutandoCierre}
                    style={{ padding:"13px 28px", borderRadius:10, border:"none",
                      background: ejecutandoCierre ? "#ccc"
                        : `linear-gradient(135deg, ${C.emerald}, ${C.teal})`,
                      color:"#fff", cursor: ejecutandoCierre ? "not-allowed" : "pointer",
                      fontSize:14, fontWeight:700, fontFamily:"inherit" }}>
                    {ejecutandoCierre ? "Ejecutando..." : "🔒 Ejecutar cierre del día"}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        { }
        {tab === "inventario" && (
          <div>
            {cargandoInv ? (
              <div style={{ textAlign:"center", padding:40, color:C.emerald, fontSize:15 }}>
                Cargando inventario...
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:16, gap:12, flexWrap:"wrap" }}>
                  <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.charcoal }}>
                    📦 Inventario valorizado
                  </h3>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input type="text" placeholder="Buscar producto o SKU..."
                      value={busquedaInv}
                      onChange={e => setBusquedaInv(e.target.value)}
                      style={{ padding:"8px 12px", borderRadius:10, border:`1.5px solid ${C.border}`,
                        fontSize:13, outline:"none", fontFamily:"inherit", width:220 }} />
                    <button onClick={() => setCategoriasAbiertas(
                        Object.fromEntries(categoriasInv.map(g => [g.nombre, true])))}
                      style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${C.border}`,
                        background:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, color:"#666" }}>
                      Expandir todo
                    </button>
                    <button onClick={() => setCategoriasAbiertas({})}
                      style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${C.border}`,
                        background:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, color:"#666" }}>
                      Colapsar todo
                    </button>
                    <button onClick={cargarInventario}
                      style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${C.border}`,
                        background:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, color:"#666" }}>
                      🔄
                    </button>
                  </div>
                </div>

                { }
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
                  gap:12, marginBottom:20 }}>
                  <div style={{ borderRadius:16, padding:"16px 20px", background:G.hero }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
                      Costo invertido
                    </div>
                    <div style={{ fontSize:24, fontWeight:900, color:"#fff" }}>
                      {money(totalesInv.costo)}
                    </div>
                  </div>
                  <div style={{ borderRadius:16, padding:"16px 20px", background:G.hero }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
                      Valor de mercadería
                    </div>
                    <div style={{ fontSize:24, fontWeight:900, color: C.tangerine }}>
                      {money(totalesInv.valor)}
                    </div>
                  </div>
                  <div style={{ borderRadius:16, padding:"16px 20px", background:"#fff",
                    border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:11, color:"#888", fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
                      Margen potencial
                    </div>
                    <div style={{ fontSize:24, fontWeight:900, color:"#2E7D32" }}>
                      {money(totalesInv.valor - totalesInv.costo)}
                    </div>
                  </div>
                  <div style={{ borderRadius:16, padding:"16px 20px", background:"#fff",
                    border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:11, color:"#888", fontWeight:700,
                      textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>
                      Productos con stock
                    </div>
                    <div style={{ fontSize:24, fontWeight:900, color:C.charcoal }}>
                      {totalesInv.productos}
                    </div>
                  </div>
                </div>

                {categoriasInv.length === 0 && (
                  <div style={{ textAlign:"center", padding:32, color:"#bbb" }}>
                    No hay productos que coincidan.
                  </div>
                )}

                { }
                {categoriasInv.map(g => {
                  const abierta = !!categoriasAbiertas[g.nombre];
                  return (
                    <div key={g.nombre} style={{ background:"#fff", borderRadius:16,
                      border:`1px solid ${C.border}`, overflow:"hidden", marginBottom:12 }}>
                      <div onClick={() => toggleCategoria(g.nombre)}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                          padding:"14px 18px", cursor:"pointer", background:C.softGray }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontSize:12, color:"#888",
                            transform: abierta ? "rotate(90deg)" : "none", transition:"transform 0.15s" }}>▶</span>
                          <span style={{ fontSize:14, fontWeight:800, color:C.charcoal }}>{g.nombre}</span>
                          <span style={{ fontSize:11, color:"#888", fontWeight:600 }}>
                            {g.productos.length} producto{g.productos.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div style={{ display:"flex", gap:20 }}>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:10, color:"#888", fontWeight:600 }}>Costo</div>
                            <div style={{ fontSize:13, fontWeight:800, color:C.charcoal }}>{money(g.costo)}</div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:10, color:"#888", fontWeight:600 }}>Valor</div>
                            <div style={{ fontSize:13, fontWeight:800, color:C.tangerine }}>{money(g.valor)}</div>
                          </div>
                        </div>
                      </div>

                      {abierta && (
                        <div>
                          <div style={{ display:"grid",
                            gridTemplateColumns:"2fr 90px 100px 100px 110px 110px",
                            padding:"8px 18px", background:"#FAFAFA",
                            fontSize:10, fontWeight:700, color:"#aaa",
                            textTransform:"uppercase", letterSpacing:"0.6px" }}>
                            <span>Producto</span>
                            <span style={{ textAlign:"right" }}>Stock</span>
                            <span style={{ textAlign:"right" }}>Costo u.</span>
                            <span style={{ textAlign:"right" }}>Precio</span>
                            <span style={{ textAlign:"right" }}>Costo inv.</span>
                            <span style={{ textAlign:"right" }}>Valor merc.</span>
                          </div>
                          {g.productos.map((p, i) => (
                            <div key={p.idProducto} style={{ display:"grid",
                              gridTemplateColumns:"2fr 90px 100px 100px 110px 110px",
                              padding:"9px 18px", alignItems:"center",
                              borderTop:`1px solid ${C.border}`,
                              background: i % 2 === 0 ? "#fff" : "#FCFCFC" }}>
                              <span style={{ fontSize:12.5, color:C.charcoal }}>
                                {p.nombre}
                                <span style={{ color:"#bbb", fontSize:10.5 }}> · {p.sku}</span>
                              </span>
                              <span style={{ fontSize:12.5, textAlign:"right", color:C.charcoal }}>
                                {p.stock} {p.unidadMedida === "KG" ? "kg" : "u."}
                              </span>
                              <span style={{ fontSize:12.5, textAlign:"right", color:"#666" }}>
                                {money(p.costoUnit)}
                              </span>
                              <span style={{ fontSize:12.5, textAlign:"right", color:"#666" }}>
                                {money(p.precioVenta)}
                              </span>
                              <span style={{ fontSize:12.5, textAlign:"right", fontWeight:700, color:C.charcoal }}>
                                {money(p.costoInvertido)}
                              </span>
                              <span style={{ fontSize:12.5, textAlign:"right", fontWeight:700, color:C.tangerine }}>
                                {money(p.valorMerc)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}