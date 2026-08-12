import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import FiltroFecha from "../components/reportes/FiltroFecha";
import TablaReporte from "../components/reportes/TablaReporte";
import ExportButtons from "../components/reportes/ExportButtons";
import * as api from "../api/reportesApi";
import { imprimirComprobanteVenta, imprimirComprobanteCompra } from "../utils/comprobantePdf";

const C = {
  emerald:"#0D5E4F", teal:"#0A3D3A",
  tangerine:"#E07A2F", warmWhite:"#FAFAF8",
  softGray:"#F1F3F2", charcoal:"#1F1F1F",
  border:"rgba(13,94,79,0.12)",
};

const money = (n) => `S/ ${parseFloat(n||0).toFixed(2)}`;
const fmtFecha = (f) => f
  ? new Date(f).toLocaleString("es-PE",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})
  : "—";
const fmtFechaCorta = (f) => f
  ? new Date(f).toLocaleDateString("es-PE",{day:"2-digit",month:"short",year:"numeric"})
  : "—";
const hoy = () => new Date().toISOString().split("T")[0];
const badge = (txt, bg, color) => (
  <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700, background:bg||"#f0f0f0", color:color||"#666" }}>
    {txt}
  </span>
);
const siNo = (v) => v ? badge("Sí","#E8F5E9","#2E7D32") : badge("No","#FFEBEE","#C62828");

function valorCelda(val, row, col) {
  if (col.render) return col.render(val, row);
  if (col.numeric && val != null) return money(val);
  return val ?? "—";
}


const COL = {
  ventas: [
    { key:"fecha",            label:"Fecha",       numeric:false, sortable:true,  render:(v)=>fmtFecha(v) },
    { key:"comprobante",      label:"Comprobante", numeric:false, sortable:false, render:(_,r)=>`${r.tipoComprobante||""} ${r.serieComprobante||""}` },
    { key:"cliente",          label:"Cliente",     numeric:false, sortable:false, render:(_,r)=>r.cliente?`${r.cliente.nombre||""} ${r.cliente.apellido||""}`:"—" },
    { key:"vendedor",         label:"Vendedor",    numeric:false, sortable:false, render:(_,r)=>r.usuario?.nombres||"—" },
    { key:"medioPago",        label:"Pago",        numeric:false, sortable:false },
    { key:"subtotal",         label:"Subtotal",    numeric:true,  sortable:true },
    { key:"igv",              label:"IGV",         numeric:true,  sortable:true },
    { key:"descuentoGlobal",  label:"Desc.",       numeric:true,  sortable:true },
    { key:"total",            label:"Total",       numeric:true,  sortable:true,  width:"100px" },
    { key:"estado",           label:"Estado",      numeric:false, sortable:false,
      render:(v)=>v==="confirmado"?badge("Confirmado","#E8F5E9","#2E7D32"):badge("Anulado","#FFEBEE","#C62828"),
      textRender:(v)=>v==="confirmado"?"Confirmado":"Anulado" },
  ],
  compras: [
    { key:"fecha",            label:"Fecha",       numeric:false, sortable:true,  render:(v)=>fmtFecha(v) },
    { key:"proveedor",        label:"Proveedor",   numeric:false, sortable:false, render:(_,r)=>r.proveedor?.empresa||"—" },
    { key:"comprobante",      label:"Comprobante", numeric:false, sortable:false, render:(_,r)=>`${r.tipoComprobante||""} ${r.serieComprobante||""}` },
    { key:"subtotal",         label:"Subtotal",    numeric:true,  sortable:true },
    { key:"descuentoGlobal",  label:"Desc.",       numeric:true,  sortable:true },
    { key:"percepcion",       label:"Percepción",  numeric:true,  sortable:true },
    { key:"total",            label:"Total",       numeric:true,  sortable:true,  width:"100px" },
    { key:"estado",           label:"Estado",      numeric:false, sortable:false,
      render:(v)=>v==="confirmado"?badge("Confirmado","#E8F5E9","#2E7D32"):badge("Anulado","#FFEBEE","#C62828"),
      textRender:(v)=>v==="confirmado"?"Confirmado":"Anulado" },
  ],
  ajustes: [
    { key:"fecha",            label:"Fecha",       numeric:false, sortable:false, render:(v)=>fmtFecha(v) },
    { key:"tipo",             label:"Tipo",        numeric:false, sortable:false,
      render:(v)=>badge(v, v==="COSTO"?"#E8F5E9":v==="CANTIDAD"?"#FFF3E0":"#FFEBEE",
        v==="COSTO"?"#2E7D32":v==="CANTIDAD"?"#B84D00":"#C62828"),
      textRender:(v)=>v||"" },
    { key:"producto",         label:"Producto",    numeric:false, sortable:false, render:(_,r)=>r.producto?.nombre||"—" },
    { key:"motivo",           label:"Motivo",      numeric:false, sortable:false },
    { key:"deltaCantidad",    label:"Δ Cant.",     numeric:true,  sortable:false, isMoney:false },
    { key:"costoAnterior",    label:"Costo ant.",  numeric:true,  sortable:false },
    { key:"costoNuevo",       label:"Costo nuevo", numeric:true,  sortable:false },
    { key:"cppResultante",    label:"CPP",         numeric:true,  sortable:false },
    { key:"impactoStock",     label:"Impacto stk", numeric:true,  sortable:false,
      render:(v)=>v>0?badge(`+${v}`,"#E8F5E9","#2E7D32"):v<0?badge(v,"#FFEBEE","#C62828"):"0",
      textRender:(v)=>v>0?`+${v}`:String(v||"0") },
  ],
  movimientos: [
    { key:"fecha",            label:"Fecha",       numeric:false, sortable:true,  render:(v)=>fmtFecha(v) },
    { key:"tipoMov",          label:"Tipo",        numeric:false, sortable:false,
      render:(v)=>badge(v||"—","#F1F3F2","#555"),
      textRender:(v)=>v||"—" },
    { key:"cuenta",           label:"Cuenta",      numeric:false, sortable:false, render:(_,r)=>r.cuenta?.nombre||"—" },
    { key:"monto",            label:"Monto",       numeric:true,  sortable:true,
      render:(v,row)=>(<span style={{color:row.signo===1?"#2E7D32":"#C62828",fontWeight:800}}>
        {row.signo===1?"+":"-"} {money(v)}</span>),
      textRender:(v,row)=>`${row.signo===1?"+":"-"} ${money(v)}` },
    { key:"concepto",         label:"Concepto",    numeric:false, sortable:false },
    { key:"creadaPor",        label:"Registrado",  numeric:false, sortable:false },
  ],
  cierres: [
    { key:"fechaCierre",      label:"Fecha",       numeric:false, sortable:false, render:(v)=>fmtFechaCorta(v) },
    { key:"cuenta",           label:"Cuenta",      numeric:false, sortable:false, render:(_,r)=>r.cuenta?.nombre||"—" },
    { key:"saldoSistema",     label:"Sistema",     numeric:true,  sortable:false },
    { key:"saldoContado",     label:"Contado",     numeric:true,  sortable:false },
    { key:"diferencia",       label:"Diferencia",  numeric:true,  sortable:false,
      color:(v)=>v!==0?"#C62828":"#888" },
    { key:"observacion",      label:"Observación", numeric:false, sortable:false, render:(v)=>v||"—" },
    { key:"ajusteRegistrado", label:"Ajuste",      numeric:false, sortable:false, render:(v)=>siNo(v), textRender:(v)=>v?"Sí":"No" },
    { key:"cerradoPor",       label:"Cerrado por", numeric:false, sortable:false },
  ],
  productos: [
    { key:"sku",              label:"SKU",         numeric:false, sortable:false },
    { key:"nombre",           label:"Nombre",      numeric:false, sortable:false },
    { key:"categoria",        label:"Categoría",   numeric:false, sortable:false, render:(_,r)=>r.categoria?.nombre||"—" },
    { key:"tipo",             label:"Tipo",        numeric:false, sortable:false,
      render:(v)=>badge(v,"#F1F3F2","#555"),
      textRender:(v)=>v||"" },
    { key:"stock",            label:"Stock",       numeric:true,  sortable:false, isMoney:false,
      color:(v,row)=>row.stockAlert && v<=row.stockAlert?"#C62828":"#1F1F1F",
      render:(v,row)=>(row.stockAlert && v<=row.stockAlert
        ? <span style={{color:"#C62828",fontWeight:800}}>{v} ⚠️</span> : v),
      textRender:(v)=>String(v) },
    { key:"cpp",              label:"CPP",         numeric:true,  sortable:false },
    { key:"precioVenta",      label:"Precio venta",numeric:true,  sortable:false },
    { key:"visibleEnPos",     label:"POS",         numeric:false, sortable:false, render:(v)=>siNo(v), textRender:(v)=>v?"Sí":"No" },
  ],
  clientes: [
    { key:"nombre",           label:"Nombre",      numeric:false, sortable:false },
    { key:"apellido",         label:"Apellido",    numeric:false, sortable:false },
    { key:"dni",              label:"DNI",         numeric:false, sortable:false },
    { key:"telefono",         label:"Teléfono",    numeric:false, sortable:false },
    { key:"numCompras",       label:"N° Compras",  numeric:true,  sortable:false, isMoney:false },
    { key:"totalComprado",    label:"Total comp.", numeric:true,  sortable:false },
    { key:"ultimaCompra",     label:"Última compra",numeric:false, sortable:false, render:(v)=>v?fmtFecha(v):"—" },
  ],
  proveedores: [
    { key:"empresa",          label:"Empresa",     numeric:false, sortable:false },
    { key:"ruc",              label:"RUC",         numeric:false, sortable:false },
    { key:"contacto",         label:"Contacto",    numeric:false, sortable:false },
    { key:"telefono",         label:"Teléfono",    numeric:false, sortable:false },
    { key:"numCompras",       label:"N° Compras",  numeric:true,  sortable:false, isMoney:false },
    { key:"totalComprado",    label:"Total comp.", numeric:true,  sortable:false },
    { key:"ultimaCompra",     label:"Última compra",numeric:false, sortable:false, render:(v)=>v?fmtFecha(v):"—" },
  ],
  cuentas: [
    { key:"nombre",           label:"Nombre",      numeric:false, sortable:false },
    { key:"tipo",             label:"Tipo",        numeric:false, sortable:false,
      render:(v)=>badge(v,v==="EFECTIVO"?"#E8F5E9":v==="DIGITAL"?"#E8F0FE":"#FFF3E0",
        v==="EFECTIVO"?"#2E7D32":v==="DIGITAL"?"#1A73E8":"#B84D00"),
      textRender:(v)=>v||"" },
    { key:"saldoActual",      label:"Saldo",       numeric:true,  sortable:false },
    { key:"activa",           label:"Activa",      numeric:false, sortable:false, render:(v)=>siNo(v), textRender:(v)=>v?"Sí":"No" },
  ],
  usuarios: [
    { key:"nombreCompleto",   label:"Nombre",      numeric:false, sortable:false },
    { key:"username",         label:"Usuario",     numeric:false, sortable:false },
    { key:"rol",              label:"Rol",         numeric:false, sortable:false,
      render:(v)=>badge(v,v==="ADMIN"?"#FFEBEE":"#E8F5E9",v==="ADMIN"?"#C62828":"#2E7D32"),
      textRender:(v)=>v||"" },
    { key:"activo",           label:"Activo",      numeric:false, sortable:false, render:(v)=>siNo(v), textRender:(v)=>v?"Sí":"No" },
    { key:"numVentas",        label:"N° Ventas",   numeric:true,  sortable:false, isMoney:false },
    { key:"totalVendido",     label:"Total vend.", numeric:true,  sortable:false },
  ],
  eventos: [
    { key:"fecha",            label:"Fecha",       numeric:false, sortable:true,  render:(v)=>fmtFecha(v) },
    { key:"tipoEvento",       label:"Tipo evento", numeric:false, sortable:false,
      render:(v)=>badge(v||"—","#F1F3F2","#555"),
      textRender:(v)=>v||"—" },
    { key:"entidad",          label:"Entidad",     numeric:false, sortable:false, render:(_,r)=>r.entidad?`${r.entidad} #${r.idEntidad||""}`:"—" },
    { key:"descripcion",      label:"Descripción", numeric:false, sortable:false },
  ],
};


const btnImprimirFila = {
  padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer",
  fontSize:12, fontWeight:700, background:"#E8F0FE", color:"#1A73E8",
  fontFamily:"inherit",
};



function TabVentas({ desde, hasta, esAdmin, filtros, onActualizarFiltro }) {
  const { usuario } = useAuth();
  const [data, setData] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [filasImpresion, setFilasImpresion] = useState(null);
  const totalPag = totalPaginas;

  const armarParams = useCallback((overrides = {}) => {
    const params = { desde, hasta, page:pagina, size:20, sort:sortBy, dir:sortDir, ...overrides };
    if (filtros.idCliente) params.idCliente = filtros.idCliente;
    if (esAdmin && filtros.idVendedor) params.idVendedor = filtros.idVendedor;
    if (filtros.estado) params.estado = filtros.estado;
    params.idUsuario = usuario?.idUsuario;
    params.rol = usuario?.rol;
    return params;
  }, [desde, hasta, pagina, sortBy, sortDir, filtros, esAdmin, usuario?.idUsuario, usuario?.rol]);

  const cargar = useCallback(() => {
    setLoading(true);
    api.getReporteVentas(armarParams())
      .then(r => { setData(r.data.content||[]); setTotales(r.data.totales||{}); setTotalPaginas(r.data.totalPages||0); })
      .catch(() => { setData([]); setTotales({}); })
      .finally(() => setLoading(false));
  }, [armarParams]);

  useEffect(() => { cargar(); }, [cargar]);

  
  const obtenerTodo = () => api.getReporteVentas(armarParams({ page:0, size:5000 }))
    .then(r => r.data.content || []);

  const handleSort = (key) => {
    if (sortBy === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortBy(key); setSortDir("asc"); }
    setPagina(0);
  };

  const renderExpandible = (row) => (
    <div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
          Productos vendidos
        </div>
        {row.detalles?.length > 0 ? row.detalles.map((d, j) => (
          <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:13, borderBottom: j < row.detalles.length-1 ? `1px solid ${C.border}` : "none" }}>
            <div>
              <span style={{ fontWeight:600, color:C.charcoal }}>{d.producto?.nombre||`Prod #${d.producto?.idProducto}`}</span>
              <span style={{ color:"#888", marginLeft:8, fontSize:12 }}>× {d.cantidad}</span>
              {esAdmin && d.costoHistorico > 0 && <span style={{ color:"#aaa", marginLeft:8, fontSize:11 }}>CPP: {money(d.costoHistorico)}</span>}
              {d.descuentoItem > 0 && <span style={{ color:"#6aad7e", marginLeft:6, fontSize:11 }}>(desc: {money(d.descuentoItem)})</span>}
            </div>
            <span style={{ fontWeight:700, color:C.emerald }}>{money(d.subtotal)}</span>
          </div>
        )) : <div style={{ fontSize:12, color:"#bbb" }}>Sin detalles</div>}
        {row.detallesServicio?.length > 0 && (
          <>
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginTop:12, marginBottom:8 }}>
              Servicios
            </div>
            {row.detallesServicio.map((s, j) => (
              <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:13, borderBottom: j < row.detallesServicio.length-1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontWeight:600, color:C.charcoal }}>{s.producto?.nombre||s.descripcion||"Servicio"}</span>
                <span style={{ fontWeight:700, color:C.emerald }}>{money(s.subtotal)}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
          Formas de pago
        </div>
        {row.pagos?.length > 0 ? row.pagos.map((p, j) => (
          <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:13, borderBottom: j < row.pagos.length-1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ color:"#666" }}>{p.medioPago}</span>
            <span style={{ fontWeight:700 }}>{money(p.monto)}</span>
          </div>
        )) : <div style={{ fontSize:12, color:"#bbb" }}>Sin pagos</div>}
        <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", marginBottom:3 }}>
            <span>Subtotal</span><span>{money(row.subtotal)}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#888", marginBottom:3 }}>
            <span>IGV (18%)</span><span>{money(row.igv)}</span>
          </div>
          {row.descuentoGlobal > 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6aad7e", marginBottom:3 }}>
              <span>Descuento</span><span>-{money(row.descuentoGlobal)}</span>
            </div>
          )}
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:800, color:C.emerald }}>
            <span>TOTAL</span><span>{money(row.total)}</span>
          </div>
        </div>
      </div>
    </div>
    <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"flex-end" }}>
      <button onClick={() => imprimirComprobanteVenta(row)} style={btnImprimirFila}>
        🖨️ Imprimir comprobante PDF
      </button>
    </div>
    </div>
  );

  const columnasVisibles = esAdmin ? COL.ventas : COL.ventas.filter(c => c.key !== "vendedor");

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <ExportButtons data={data} columnas={columnasVisibles} titulo="Ventas"
          onObtenerTodo={obtenerTodo} onPrepararImpresion={setFilasImpresion} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="ID Cliente" value={filtros.idCliente} onChange={e => onActualizarFiltro("ventas","idCliente",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:120 }} />
        {esAdmin && (
          <input placeholder="ID Vendedor" value={filtros.idVendedor} onChange={e => onActualizarFiltro("ventas","idVendedor",e.target.value)}
            style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:120 }} />
        )}
        <select value={filtros.estado} onChange={e => onActualizarFiltro("ventas","estado",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", background:"#fff" }}>
          <option value="">Todos</option>
          <option value="confirmado">Confirmado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>
      <div className="screen-only">
        <TablaReporte columnas={columnasVisibles} data={data} totales={totales} loading={loading}
          onSort={handleSort} sortBy={sortBy} sortDir={sortDir}
          pagina={pagina} totalPaginas={totalPag} onCambiarPagina={setPagina}
          renderExpandible={renderExpandible} mensajeVacio="Sin ventas en el rango" />
      </div>
      {filasImpresion && (
        <div className="print-only">
          <TablaReporte columnas={columnasVisibles} data={filasImpresion} totales={totales}
            mensajeVacio="Sin ventas en el rango" />
        </div>
      )}
    </div>
  );
}

function TabCompras({ desde, hasta, filtros, onActualizarFiltro }) {
  const [data, setData] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [filasImpresion, setFilasImpresion] = useState(null);

  const armarParams = useCallback((overrides = {}) => {
    const params = { desde, hasta, page:pagina, size:20, sort:sortBy, dir:sortDir, ...overrides };
    if (filtros.idProveedor) params.idProveedor = filtros.idProveedor;
    if (filtros.estado) params.estado = filtros.estado;
    return params;
  }, [desde, hasta, pagina, sortBy, sortDir, filtros]);

  const cargar = useCallback(() => {
    setLoading(true);
    api.getReporteCompras(armarParams())
      .then(r => { setData(r.data.content||[]); setTotales(r.data.totales||{}); setTotalPaginas(r.data.totalPages||0); })
      .catch(() => { setData([]); setTotales({}); })
      .finally(() => setLoading(false));
  }, [armarParams]);

  useEffect(() => { cargar(); }, [cargar]);

  const obtenerTodo = () => api.getReporteCompras(armarParams({ page:0, size:5000 }))
    .then(r => r.data.content || []);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
    setPagina(0);
  };

  const renderExpandible = (row) => (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8 }}>
        Productos
      </div>
      {row.detalles?.length > 0 ? row.detalles.map((d, j) => (
        <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:13, borderBottom: j < row.detalles.length-1 ? `1px solid ${C.border}` : "none" }}>
          <div>
            <span style={{ fontWeight:600, color:C.charcoal }}>{d.producto?.nombre||`Prod #${d.producto?.idProducto}`}</span>
            <span style={{ color:"#888", marginLeft:8, fontSize:12 }}>× {d.cantidad}</span>
            {d.vencimiento && <span style={{ color:"#aaa", marginLeft:8, fontSize:11 }}>Ven: {d.vencimiento}</span>}
          </div>
          <span style={{ fontWeight:700, color:C.emerald }}>{money(d.subtotal)}</span>
        </div>
      )) : <div style={{ fontSize:12, color:"#bbb" }}>Sin detalles</div>}
      <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"flex-end" }}>
        <button onClick={() => imprimirComprobanteCompra(row)} style={btnImprimirFila}>
          🖨️ Imprimir comprobante PDF
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <ExportButtons data={data} columnas={COL.compras} titulo="Compras"
          onObtenerTodo={obtenerTodo} onPrepararImpresion={setFilasImpresion} />
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="ID Proveedor" value={filtros.idProveedor} onChange={e => onActualizarFiltro("compras","idProveedor",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:120 }} />
        <select value={filtros.estado} onChange={e => onActualizarFiltro("compras","estado",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", background:"#fff" }}>
          <option value="">Todos</option>
          <option value="confirmado">Confirmado</option>
          <option value="anulado">Anulado</option>
        </select>
      </div>
      <div className="screen-only">
        <TablaReporte columnas={COL.compras} data={data} totales={totales} loading={loading}
          onSort={handleSort} sortBy={sortBy} sortDir={sortDir}
          pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina}
          renderExpandible={renderExpandible} mensajeVacio="Sin compras en el rango" />
      </div>
      {filasImpresion && (
        <div className="print-only">
          <TablaReporte columnas={COL.compras} data={filasImpresion} totales={totales}
            mensajeVacio="Sin compras en el rango" />
        </div>
      )}
    </div>
  );
}

function TabAjustesCompra({ desde, hasta, filtros, onActualizarFiltro }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = { desde, hasta };
    if (filtros.tipo) params.tipo = filtros.tipo;
    api.getAjustesCompra(params)
      .then(r => setData(Array.isArray(r.data.content) ? r.data.content : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [desde, hasta, filtros.tipo]);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.ajustes} titulo="Ajustes de Compra" />
      <div style={{ marginBottom:14 }}>
        <select value={filtros.tipo} onChange={e => onActualizarFiltro("ajustes","tipo",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", background:"#fff" }}>
          <option value="">Todos los tipos</option>
          <option value="COSTO">COSTO</option>
          <option value="CANTIDAD">CANTIDAD</option>
          <option value="DEVOLUCION">DEVOLUCION</option>
        </select>
      </div>
      <TablaReporte columnas={COL.ajustes} data={data} loading={loading} mensajeVacio="Sin ajustes en el rango" />
    </div>
  );
}

function TabMovimientos({ desde, hasta, filtros, onActualizarFiltro }) {
  const [data, setData] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [filasImpresion, setFilasImpresion] = useState(null);

  const armarParams = useCallback((overrides = {}) => {
    const params = { desde, hasta, page:pagina, size:20, sort:sortBy, dir:sortDir, ...overrides };
    if (filtros.tipoMov) params.tipoMov = filtros.tipoMov;
    if (filtros.idCuenta) params.idCuenta = filtros.idCuenta;
    return params;
  }, [desde, hasta, pagina, sortBy, sortDir, filtros]);

  const cargar = useCallback(() => {
    setLoading(true);
    api.getMovimientos(armarParams())
      .then(r => { setData(r.data.content||[]); setTotales(r.data.totales||{}); setTotalPaginas(r.data.totalPages||0); })
      .catch(() => { setData([]); setTotales({}); })
      .finally(() => setLoading(false));
  }, [armarParams]);

  useEffect(() => { cargar(); }, [cargar]);

  const obtenerTodo = () => api.getMovimientos(armarParams({ page:0, size:5000 }))
    .then(r => r.data.content || []);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
    setPagina(0);
  };

  return (
    <div>
      <ExportButtons data={data} columnas={COL.movimientos} titulo="Movimientos"
        onObtenerTodo={obtenerTodo} onPrepararImpresion={setFilasImpresion} />
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <select value={filtros.tipoMov} onChange={e => onActualizarFiltro("movimientos","tipoMov",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", background:"#fff" }}>
          <option value="">Todos los tipos</option>
          <option value="VENTA">VENTA</option>
          <option value="GASTO">GASTO</option>
          <option value="COMPRA">COMPRA</option>
          <option value="AJUSTE">AJUSTE</option>
          <option value="CAMBIO_DIGITAL">CAMBIO DIGITAL</option>
          <option value="TRANSFERENCIA">TRANSFERENCIA</option>
          <option value="RETIRO">RETIRO</option>
        </select>
        <input placeholder="ID Cuenta" value={filtros.idCuenta} onChange={e => onActualizarFiltro("movimientos","idCuenta",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:100 }} />
      </div>
      <div className="screen-only">
        <TablaReporte columnas={COL.movimientos} data={data} totales={totales} loading={loading}
          onSort={handleSort} sortBy={sortBy} sortDir={sortDir}
          pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina}
          mensajeVacio="Sin movimientos en el rango" />
      </div>
      {filasImpresion && (
        <div className="print-only">
          <TablaReporte columnas={COL.movimientos} data={filasImpresion} totales={totales}
            mensajeVacio="Sin movimientos en el rango" />
        </div>
      )}
    </div>
  );
}

function TabCierres({ desde, hasta, filtros, onActualizarFiltro }) {
  const [data, setData] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = { desde, hasta };
    if (filtros.idCuenta) params.idCuenta = filtros.idCuenta;
    api.getCierres(params)
      .then(r => { setData(Array.isArray(r.data.content) ? r.data.content : []); setTotales(r.data.totales||{}); })
      .catch(() => { setData([]); setTotales({}); })
      .finally(() => setLoading(false));
  }, [desde, hasta, filtros.idCuenta]);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.cierres} titulo="Cierres de Caja" />
      <TablaReporte columnas={COL.cierres} data={data} totales={totales} loading={loading} mensajeVacio="Sin cierres en el rango" />
    </div>
  );
}

function TabProductos({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (soloStockBajo) params.soloStockBajo = true;
    if (filtroCategoria) params.idCategoria = filtroCategoria;
    if (filtroTipo) params.tipo = filtroTipo;
    api.getReporteProductos(params)
      .then(r => setData(Array.isArray(r.data.content) ? r.data.content : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [soloStockBajo, filtroCategoria, filtroTipo]);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.productos} titulo="Inventario" />
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="ID Categoría" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:110 }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", background:"#fff" }}>
          <option value="">Todos</option>
          <option value="BIEN_FISICO">BIEN_FISICO</option>
          <option value="SERVICIO_PURO">SERVICIO_PURO</option>
          <option value="SERVICIO_COMIS">SERVICIO_COMIS</option>
          <option value="CONSUMIBLE">CONSUMIBLE</option>
        </select>
        <label style={{ fontSize:12, display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
          <input type="checkbox" checked={soloStockBajo} onChange={e => setSoloStockBajo(e.target.checked)} />
          Solo stock bajo
        </label>
      </div>
      <TablaReporte columnas={COL.productos} data={data} loading={loading} mensajeVacio="Sin productos" />
    </div>
  );
}

function TabClientes({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getReporteClientes({ desde, hasta })
      .then(r => setData(Array.isArray(r.data.content) ? r.data.content : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.clientes} titulo="Clientes" />
      <TablaReporte columnas={COL.clientes} data={data} loading={loading} mensajeVacio="Sin clientes" />
    </div>
  );
}

function TabProveedores({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getReporteProveedores({ desde, hasta })
      .then(r => setData(Array.isArray(r.data.content) ? r.data.content : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.proveedores} titulo="Proveedores" />
      <TablaReporte columnas={COL.proveedores} data={data} loading={loading} mensajeVacio="Sin proveedores" />
    </div>
  );
}

function TabCuentas({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getReporteCuentas()
      .then(r => setData(Array.isArray(r.data.content) ? r.data.content : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.cuentas} titulo="Cuentas Financieras" />
      <TablaReporte columnas={COL.cuentas} data={data} loading={loading} mensajeVacio="Sin cuentas" />
    </div>
  );
}

function TabUsuarios({ desde, hasta }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getReporteUsuarios({ desde, hasta })
      .then(r => setData(Array.isArray(r.data.content) ? r.data.content : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  return (
    <div>
      <ExportButtons data={data} columnas={COL.usuarios} titulo="Usuarios" />
      <TablaReporte columnas={COL.usuarios} data={data} loading={loading} mensajeVacio="Sin usuarios" />
    </div>
  );
}

function TabEventos({ desde, hasta, filtros, onActualizarFiltro }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [sortBy, setSortBy] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");
  const [filasImpresion, setFilasImpresion] = useState(null);

  const armarParams = useCallback((overrides = {}) => {
    const params = { page:pagina, size:20, sort:sortBy, dir:sortDir, ...overrides };
    if (desde && hasta) { params.desde = desde; params.hasta = hasta; }
    if (filtros.tipoEvento) params.tipoEvento = filtros.tipoEvento;
    if (filtros.entidad) params.entidad = filtros.entidad;
    return params;
  }, [desde, hasta, pagina, sortBy, sortDir, filtros]);

  const cargar = useCallback(() => {
    setLoading(true);
    api.getReporteEventos(armarParams())
      .then(r => { setData(r.data.content||[]); setTotalPaginas(r.data.totalPages||0); })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [armarParams]);

  useEffect(() => { cargar(); }, [cargar]);

  const obtenerTodo = () => api.getReporteEventos(armarParams({ page:0, size:5000 }))
    .then(r => r.data.content || []);

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
    setPagina(0);
  };

  return (
    <div>
      <ExportButtons data={data} columnas={COL.eventos} titulo="Eventos"
        onObtenerTodo={obtenerTodo} onPrepararImpresion={setFilasImpresion} />
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input placeholder="Tipo evento" value={filtros.tipoEvento} onChange={e => onActualizarFiltro("eventos","tipoEvento",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:140 }} />
        <input placeholder="Entidad" value={filtros.entidad} onChange={e => onActualizarFiltro("eventos","entidad",e.target.value)}
          style={{ padding:"7px 12px", borderRadius:8, border:`1.5px solid ${C.border}`, fontSize:12, outline:"none", width:120 }} />
      </div>
      <div className="screen-only">
        <TablaReporte columnas={COL.eventos} data={data} loading={loading}
          onSort={handleSort} sortBy={sortBy} sortDir={sortDir}
          pagina={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina}
          mensajeVacio="Sin eventos registrados" />
      </div>
      {filasImpresion && (
        <div className="print-only">
          <TablaReporte columnas={COL.eventos} data={filasImpresion}
            mensajeVacio="Sin eventos registrados" />
        </div>
      )}
    </div>
  );
}



const TABS = [
  { k:"ventas",     l:"🛒 Ventas" },
  { k:"compras",    l:"🚚 Compras" },
  { k:"ajustes",    l:"🔧 Ajustes" },
  { k:"movimientos",l:"💰 Mov. Tesorería" },
  { k:"cierres",    l:"🔒 Cierres" },
  { k:"productos",  l:"📦 Inventario" },
  { k:"clientes",   l:"👥 Clientes" },
  { k:"proveedores",l:"🏭 Proveedores" },
  { k:"cuentas",    l:"🏦 Cuentas" },
  { k:"usuarios",   l:"👤 Usuarios" },
  { k:"eventos",    l:"📝 Eventos" },
];

export default function Reportes() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === "ADMIN";

  const [nivel, setNivel] = useState("detallado"); 
  const [tabActual, setTabActual] = useState("ventas");
  const [desde, setDesde] = useState(() => hoy());
  const [hasta, setHasta] = useState(() => hoy());

  
  const [filtrosTab, setFiltrosTab] = useState({
    ventas:     { idCliente:"", idVendedor:"", estado:"" },
    compras:    { idProveedor:"", estado:"" },
    ajustes:    { tipo:"" },
    movimientos:{ tipoMov:"", idCuenta:"" },
    cierres:    { idCuenta:"" },
    eventos:    { tipoEvento:"", entidad:"" },
  });

  const actualizarFiltro = (tab, campo, valor) => {
    setFiltrosTab(prev => ({ ...prev, [tab]: { ...prev[tab], [campo]: valor } }));
  };

  const tabs = TABS.map(t => ({ ...t, disabled: !esAdmin && t.k !== "ventas" }));

  const inputStyle = {
    padding:"9px 16px", border:"none", borderRadius:"8px 8px 0 0",
    cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.15s",
    fontFamily:"'Inter','DM Sans','Segoe UI',sans-serif",
  };

  return (
    <div style={{ background:C.softGray }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        { }
        <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:800, color:C.charcoal }}>
          📊 Reportes
        </h1>
        <p style={{ margin:"0 0 18px", color:"#888", fontSize:13 }}>
          Análisis detallado de ventas, compras, tesorería e inventario
        </p>

        { }
        <div className="no-print" style={{ display:"flex", gap:4, marginBottom:20,
          background:"#fff", borderRadius:10, padding:4, width:"fit-content",
          boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
          {[{ k:"ejecutivo", l:"📈 Ejecutivo" }, { k:"detallado", l:"📋 Detallado" }].map(n => (
            <button key={n.k} onClick={() => setNivel(n.k)}
              style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor:"pointer",
                fontSize:13, fontWeight:800, fontFamily:"'Inter','DM Sans','Segoe UI',sans-serif",
                background: nivel === n.k ? C.emerald : "transparent",
                color:      nivel === n.k ? "#fff" : "#888",
                transition:"all 0.15s" }}>
              {n.l}
            </button>
          ))}
        </div>

        {nivel === "ejecutivo" && (
          <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`,
            padding:"60px 24px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📈</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.charcoal, marginBottom:6 }}>
              Resumen ejecutivo — próximamente
            </div>
            <div style={{ fontSize:13, color:"#888" }}>
              Acá van a vivir los KPIs principales del negocio de un vistazo.
            </div>
          </div>
        )}

        {nivel === "detallado" && (
          <>
            { }
            <FiltroFecha desde={desde} hasta={hasta} onChange={(d,h) => { setDesde(d); setHasta(h); }} />

            { }
            <div className="no-print" style={{ display:"flex", gap:4, marginBottom:20,
              borderBottom:`2px solid ${C.border}`, flexWrap:"wrap" }}>
              {tabs.map(t => (
                <button key={t.k}
                  onClick={() => !t.disabled && setTabActual(t.k)}
                  title={t.disabled ? "Solo ADMIN" : ""}
                  style={{ ...inputStyle,
                    background: tabActual === t.k ? "#fff" : "transparent",
                    color: t.disabled ? "#ccc" : tabActual === t.k ? C.emerald : "#888",
                    borderBottom: tabActual === t.k ? `2px solid ${C.emerald}` : "2px solid transparent",
                    marginBottom:-2,
                    cursor: t.disabled ? "not-allowed" : "pointer",
                  }}>
                  {t.l}
                </button>
              ))}
            </div>

            { }
            {tabActual === "ventas"      && <TabVentas desde={desde} hasta={hasta} esAdmin={esAdmin}
                                                filtros={filtrosTab.ventas} onActualizarFiltro={actualizarFiltro} />}
            {tabActual === "compras"     && <TabCompras desde={desde} hasta={hasta}
                                                filtros={filtrosTab.compras} onActualizarFiltro={actualizarFiltro} />}
            {tabActual === "ajustes"     && <TabAjustesCompra desde={desde} hasta={hasta}
                                                filtros={filtrosTab.ajustes} onActualizarFiltro={actualizarFiltro} />}
            {tabActual === "movimientos" && <TabMovimientos desde={desde} hasta={hasta}
                                                filtros={filtrosTab.movimientos} onActualizarFiltro={actualizarFiltro} />}
            {tabActual === "cierres"     && <TabCierres desde={desde} hasta={hasta}
                                                filtros={filtrosTab.cierres} onActualizarFiltro={actualizarFiltro} />}
            {tabActual === "productos"   && <TabProductos desde={desde} hasta={hasta} />}
            {tabActual === "clientes"    && <TabClientes desde={desde} hasta={hasta} />}
            {tabActual === "proveedores" && <TabProveedores desde={desde} hasta={hasta} />}
            {tabActual === "cuentas"     && <TabCuentas desde={desde} hasta={hasta} />}
            {tabActual === "usuarios"    && <TabUsuarios desde={desde} hasta={hasta} />}
            {tabActual === "eventos"     && <TabEventos desde={desde} hasta={hasta}
                                                filtros={filtrosTab.eventos} onActualizarFiltro={actualizarFiltro} />}
          </>
        )}

      </div>
    </div>
  );
}
