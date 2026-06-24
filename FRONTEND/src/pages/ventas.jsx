import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { T } from '../theme';
import api from '../api/axiosConfig';


let jsPDF = null;
import('jspdf').then(m => { jsPDF = m.jsPDF || m.default; }).catch(() => {});

const BACKEND_URL = 'http://192.168.18.28:8080';
const resolverImagen = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BACKEND_URL + url;
};

const COLORES_CAT = [
  T.gold, '#6aad7e', '#6a9ac4', '#9a7ec4',
  '#4aadad', '#b06060', '#ad8c4a', '#4a7cad',
];

const MEDIOS_PAGO = ['Efectivo', 'Plin', 'Yape', 'Tarjeta', 'Transferencia'];

// ── Genera PDF del comprobante ──────────────────────────────────────────
function generarPDF(ventaData, carrito, cabecera, totalFinal, descGlobal, pagos) {
  if (!jsPDF) { alert('Librería PDF no disponible. Ejecuta: npm install jspdf'); return; }
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
  const W = 80; let y = 8;

  const line = (txt, size = 8, bold = false, align = 'left') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const x = align === 'center' ? W / 2 : align === 'right' ? W - 4 : 4;
    doc.text(txt, x, y, { align });
    y += size * 0.4 + 1;
  };
  const hrule = () => { doc.setDrawColor(180); doc.line(4, y, W - 4, y); y += 2; };

  line('ADRITHSTORE', 12, true, 'center');
  line('Ica, Perú', 7, false, 'center');
  hrule();
  line(`${cabecera.tipoComprobante} ${cabecera.serieComprobante}`, 8, true, 'center');
  line(`Fecha: ${new Date().toLocaleString('es-PE')}`, 7, false, 'center');
  if (ventaData?.idVenta) line(`Venta #${ventaData.idVenta}`, 7, false, 'center');
  hrule();

  carrito.forEach(item => {
    const dsc = parseFloat(item.descuento || 0);
    const sub = (item.precio * item.cantidad) - dsc;
    line(`${item.nombre}`, 7, true);
    line(`  ${item.cantidad} x S/${item.precio.toFixed(2)}${dsc > 0 ? ` - S/${dsc.toFixed(2)}` : ''} = S/${sub.toFixed(2)}`, 7);
  });

  hrule();
  const totalBruto = carrito.reduce((a, i) => a + (i.precio * i.cantidad) - parseFloat(i.descuento || 0), 0);
  if (descGlobal > 0) {
    line(`Subtotal:  S/${totalBruto.toFixed(2)}`, 7, false, 'right');
    line(`Desc. global: -S/${descGlobal.toFixed(2)}`, 7, false, 'right');
  }
  const subtotalSinIgv = totalFinal / 1.18;
  const igv = totalFinal - subtotalSinIgv;
  line(`Subtotal s/IGV:  S/${subtotalSinIgv.toFixed(2)}`, 7, false, 'right');
  line(`IGV (18%):  S/${igv.toFixed(2)}`, 7, false, 'right');
  line(`TOTAL:  S/${totalFinal.toFixed(2)}`, 9, true, 'right');
  hrule();
  pagos.filter(p => parseFloat(p.monto) > 0).forEach(p => {
    line(`${p.medioPago}: S/${parseFloat(p.monto).toFixed(2)}`, 7, false, 'right');
  });
  hrule();
  line('¡Gracias por su compra!', 8, true, 'center');
  line('AdrithStore · Ica, Perú', 7, false, 'center');

  doc.save(`comprobante-${ventaData?.idVenta || 'nuevo'}.pdf`);
}

export default function Ventas() {
  const navigate  = useNavigate();
  const { usuario } = useAuth();

  const [productos,  setProductos]  = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [clientes,   setClientes]   = useState([]);
  const [carrito,    setCarrito]    = useState([]);
  const [busqueda,   setBusqueda]   = useState('');
  const [busqCliente,setBusqCliente]= useState('');
  const [catActiva,  setCatActiva]  = useState(null);
  const [cargando,   setCargando]   = useState(true);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState('');
  const [exito,      setExito]      = useState('');
  const [ultimaVenta,setUltimaVenta]= useState(null); // datos para PDF
  const busqRef = useRef(null);

  // Multi-pago
  const [pagos, setPagos] = useState([{ medioPago: 'Efectivo', monto: '' }]);

  // Descuento global (monto numérico final deseado — ej: 20 sobre total 20.10)
  const [descGlobalInput, setDescGlobalInput] = useState('');

  const [cabecera, setCabecera] = useState({
    idCliente: '',
    tipoComprobante: 'Boleta',
    serieComprobante: 'B001',
  });

  useEffect(() => {
    Promise.all([
      api.get('/productos'),
      api.get('/categorias'),
      api.get('/clientes'),
    ]).then(([pr, ca, cl]) => {
      setProductos(pr.data);
      setCategorias(ca.data);
      setClientes(cl.data);
      const general = cl.data.find(c =>
        c.nombre?.toLowerCase().includes('general') || c.dni === '00000001'
      );
      if (general) setCabecera(f => ({ ...f, idCliente: general.idCliente }));
    }).catch(() => setError('Error al cargar datos del servidor.'))
      .finally(() => setCargando(false));
  }, []);

  // Helpers carrito 
  const cantidadEnCarrito = (id) =>
    carrito.find(i => i.idProducto === id)?.cantidad || 0;

  const agregarAlCarrito = (prod) => {
    if (prod.stock <= 0 && !prod.permiteStockNegativo) {
      setError('Sin stock: ' + prod.nombre); return;
    }
    setError('');
    setCarrito(c => {
      const existe = c.find(i => i.idProducto === prod.idProducto);
      if (existe) {
        if (!prod.permiteStockNegativo && existe.cantidad >= prod.stock) {
          setError('Stock máximo: ' + prod.stock); return c;
        }
        return c.map(i => i.idProducto === prod.idProducto
          ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...c, {
        idProducto: prod.idProducto,
        nombre:     prod.nombre,
        sku:        prod.sku,
        precio:     parseFloat(prod.precioVenta),
        stockDisp:  prod.stock,
        permiteNeg: prod.permiteStockNegativo,
        cantidad:   1,
        descuento:  0, // descuento por ítem en S/
      }];
    });
  };

  const cambiarCantidad = (id, val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setCarrito(c => c.map(i => {
      if (i.idProducto !== id) return i;
      if (!i.permiteNeg && n > i.stockDisp) {
        setError('Máx ' + i.stockDisp + ' und.'); return i;
      }
      return { ...i, cantidad: n };
    }));
  };

  // Descuento por ítem — no puede superar precio × cantidad
  const cambiarDescuento = (id, val) => {
    setCarrito(c => c.map(i => {
      if (i.idProducto !== id) return i;
      const max = i.precio * i.cantidad;
      const dsc = Math.min(Math.max(0, parseFloat(val) || 0), max);
      return { ...i, descuento: dsc };
    }));
  };

  const quitarItem     = (id) => setCarrito(c => c.filter(i => i.idProducto !== id));
  const limpiarCarrito = ()   => {
    setCarrito([]); setError(''); setDescGlobalInput('');
    setPagos([{ medioPago: 'Efectivo', monto: '' }]);
  };

  // ── Cálculos ──────────────────────────────────────────────────────────
  // Total bruto = suma (precio × cantidad - descuento_item)
  const totalItemsBruto = carrito.reduce(
    (a, i) => a + i.precio * i.cantidad - (parseFloat(i.descuento) || 0), 0
  );

  // Descuento global: el usuario ingresa el monto final que quiere cobrar
  // Si ingresa 20 y el total es 20.10 → descuento = 0.10
  const totalDeseado   = parseFloat(descGlobalInput) || 0;
  const descGlobal     = descGlobalInput !== ''
    ? Math.max(0, Math.min(totalItemsBruto - totalDeseado, totalItemsBruto))
    : 0;
  const pctDescGlobal  = totalItemsBruto > 0
    ? ((descGlobal / totalItemsBruto) * 100).toFixed(2)
    : '0.00';
  const totalFinal     = descGlobalInput !== ''
    ? Math.max(0, totalDeseado)
    : totalItemsBruto;
  const igv            = totalFinal * 0.18 / 1.18; // IGV incluido en el total
  const subtotalSinIgv = totalFinal - igv;

  // Multi-pago
  const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0);
  const faltante    = Math.max(0, totalFinal - totalPagado);
  const vuelto      = pagos.length === 1 && pagos[0].medioPago === 'Efectivo'
    ? Math.max(0, totalPagado - totalFinal) : 0;

  const actualizarPago   = (idx, campo, valor) =>
    setPagos(ps => ps.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  const agregarMedioPago = () =>
    setPagos(ps => [...ps, { medioPago: 'Efectivo', monto: '' }]);
  const quitarMedioPago  = (idx) => {
    if (pagos.length === 1) return;
    setPagos(ps => ps.filter((_, i) => i !== idx));
  };
  const completarFaltante = (idx) => {
    if (faltante > 0.005) actualizarPago(idx, 'monto', faltante.toFixed(2));
  };

  // ── Clientes filtrados (búsqueda por nombre o DNI) ─────────────────────
  const clientesFiltrados = clientes.filter(c => {
    if (!busqCliente.trim()) return true;
    const q = busqCliente.toLowerCase();
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.apellido?.toLowerCase().includes(q) ||
      (c.dni || '').includes(q)
    );
  });

  // ── Confirmar venta ────────────────────────────────────────────────────
  const confirmarVenta = async () => {
    if (!cabecera.idCliente)  { setError('Selecciona un cliente.'); return; }
    if (carrito.length === 0) { setError('Agrega productos al carrito.'); return; }
    if (totalPagado < totalFinal - 0.01) {
      setError(`Falta pagar S/ ${faltante.toFixed(2)}`); return;
    }
    if (!usuario?.idUsuario) { setError('Error de sesión. Vuelve a iniciar sesión.'); return; }

    setGuardando(true); setError('');
    try {
      const pagosValidos = pagos
        .filter(p => parseFloat(p.monto) > 0)
        .map(p => ({ medioPago: p.medioPago, monto: parseFloat(p.monto) }));

      const res = await api.post('/ventas', {
        idCliente:        parseInt(cabecera.idCliente),
        idUsuario:        usuario.idUsuario,
        tipoComprobante:  cabecera.tipoComprobante,
        serieComprobante: cabecera.serieComprobante,
        descuentoGlobal:  parseFloat(descGlobal.toFixed(2)),
        pagos:            pagosValidos,
        detalles: carrito.map(i => ({
          idProducto:    i.idProducto,
          cantidad:      i.cantidad,
          descuentoItem: parseFloat((i.descuento || 0).toFixed(2)),
        })),
      });

      setUltimaVenta(res.data);
      const msj = vuelto > 0
        ? `✅ Venta #${res.data.idVenta} — Vuelto: S/ ${vuelto.toFixed(2)}`
        : `✅ Venta #${res.data.idVenta} registrada`;
      setExito(msj);
      limpiarCarrito();
      api.get('/productos').then(r => setProductos(r.data));
    } catch (e) {
      const msg = e.response?.data;
      setError(typeof msg === 'string' ? msg : 'Error al registrar la venta.');
    } finally {
      setGuardando(false);
    }
  };

  const handleImprimir = () => {
    if (!ultimaVenta) { alert('Confirma una venta primero.'); return; }
    // Reconstruimos carrito desde la última venta para el PDF
    generarPDF(ultimaVenta, carrito.length > 0 ? carrito : [], cabecera, totalFinal, descGlobal, pagos);
  };

  const colorCat = (id) => COLORES_CAT[(id ?? 0) % COLORES_CAT.length];

  const prodFiltrados = productos.filter(p => {
    const matchB = busqueda.trim() === '' ||
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(busqueda.toLowerCase());
    const matchC = catActiva === null || p.categoria?.idCategoria === catActiva;
    return matchB && matchC && p.visibleEnPos !== false;
  });

  if (cargando) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'400px' }}>
      <div className="spinner-border" style={{ color: T.gold }} />
    </div>
  );

  const lbl = {
    display:'block', fontSize:'10px', fontWeight:700,
    color: T.textMuted, textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'4px',
  };
  const inp = {
    width:'100%', padding:'7px 10px',
    border:`1px solid ${T.border}`, borderRadius:'8px',
    fontSize:'13px', outline:'none',
    background: T.bgInput, color: T.textPrimary,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 56px)', overflow:'hidden' }}>

      

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:'16px', flex:1, overflow:'hidden', padding:'12px 16px' }}>

        {/* ── IZQUIERDA: Catálogo ─────────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Cabecera de venta */}
          <div style={{ background: T.bgCard, borderRadius:'14px',
            border:`1px solid ${T.border}`, padding:'12px 16px',
            marginBottom:'10px', flexShrink:0 }}>
            <div className="row g-2 align-items-end">
              {/* Cliente con búsqueda por nombre o DNI */}
              <div className="col-md-5">
                <label style={lbl}>Cliente</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o DNI..."
                  value={busqCliente}
                  onChange={e => setBusqCliente(e.target.value)}
                  style={{ ...inp, marginBottom: busqCliente ? 4 : 0 }}
                />
                {busqCliente.trim() !== '' && (
                  <div style={{ border:`1px solid ${T.border}`, borderRadius:'8px',
                    background: T.bgCard, maxHeight:140, overflowY:'auto',
                    boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
                    {clientesFiltrados.length === 0
                      ? <div style={{ padding:'8px 12px', fontSize:12, color: T.textMuted }}>
                          Sin resultados
                        </div>
                      : clientesFiltrados.slice(0, 8).map(c => (
                          <button key={c.idCliente}
                            onClick={() => {
                              setCabecera(f => ({ ...f, idCliente: c.idCliente }));
                              setBusqCliente('');
                            }}
                            style={{ width:'100%', textAlign:'left', padding:'7px 12px',
                              background:'none', border:'none', cursor:'pointer',
                              fontSize:12, color: T.textPrimary, borderBottom:`1px solid ${T.border}` }}>
                            {c.nombre} {c.apellido}
                            {c.dni && <span style={{ color: T.textMuted, marginLeft:6 }}>DNI: {c.dni}</span>}
                          </button>
                        ))
                    }
                  </div>
                )}
                {cabecera.idCliente && busqCliente === '' && (
                  <div style={{ fontSize:11, color: T.gold, marginTop:2 }}>
                    ✓ {clientes.find(c => c.idCliente == cabecera.idCliente)?.nombre || 'Cliente seleccionado'}
                    {' '}<button onClick={() => setCabecera(f => ({ ...f, idCliente:'' }))}
                      style={{ background:'none', border:'none', cursor:'pointer',
                        color:'#b06060', fontSize:11 }}>×</button>
                  </div>
                )}
              </div>
              <div className="col-md-3">
                <label style={lbl}>Comprobante</label>
                <select value={cabecera.tipoComprobante}
                  onChange={e => setCabecera(f => ({ ...f, tipoComprobante: e.target.value }))}
                  style={inp}>
                  <option>Boleta</option><option>Factura</option><option>Ticket</option>
                </select>
              </div>
              <div className="col-md-2">
                <label style={lbl}>Serie</label>
                <input value={cabecera.serieComprobante} maxLength={4}
                  onChange={e => setCabecera(f => ({ ...f, serieComprobante: e.target.value }))}
                  style={inp} />
              </div>
              <div className="col-md-2">
                <label style={lbl}>Fecha</label>
                <input value={new Date().toLocaleDateString('es-PE')} readOnly
                  style={{ ...inp, background: T.bgMuted, color: T.textMuted }} />
              </div>
            </div>
          </div>

          {/* Búsqueda */}
          <div style={{ position:'relative', marginBottom:'10px', flexShrink:0 }}>
            <i className="bi bi-search" style={{ position:'absolute', left:'14px', top:'50%',
              transform:'translateY(-50%)', color: T.textMuted, fontSize:'14px' }} />
            <input ref={busqRef} type="text"
              placeholder="Buscar producto por nombre o SKU..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              style={{ width:'100%', padding:'11px 16px 11px 42px',
                border:`1px solid ${T.border}`, borderRadius:'12px', fontSize:'14px',
                outline:'none', background: T.bgCard, color: T.textPrimary,
                boxShadow: T.shadow }} />
            {busqueda && (
              <button onClick={() => setBusqueda('')}
                style={{ position:'absolute', right:'12px', top:'50%',
                  transform:'translateY(-50%)', background:'none', border:'none',
                  color: T.textMuted, cursor:'pointer', fontSize:'18px' }}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>

          {/* Filtro categorías */}
          <div style={{ display:'flex', gap:'6px', overflowX:'auto',
            marginBottom:'10px', flexShrink:0, paddingBottom:'4px' }}>
            <button onClick={() => setCatActiva(null)}
              style={{ padding:'5px 14px', borderRadius:'20px', border:'none',
                cursor:'pointer', fontSize:'12px', fontWeight:600, whiteSpace:'nowrap',
                background: catActiva === null ? T.gold : T.bgMuted,
                color:       catActiva === null ? '#0f0f0f' : T.textMuted }}>
              Todos ({productos.filter(p => p.visibleEnPos !== false).length})
            </button>
            {categorias.map(cat => {
              const conteo = productos.filter(p =>
                p.categoria?.idCategoria === cat.idCategoria && p.visibleEnPos !== false
              ).length;
              if (conteo === 0) return null;
              return (
                <button key={cat.idCategoria} onClick={() => setCatActiva(cat.idCategoria)}
                  style={{ padding:'5px 14px', borderRadius:'20px', border:'none',
                    cursor:'pointer', fontSize:'12px', fontWeight:600, whiteSpace:'nowrap',
                    background: catActiva === cat.idCategoria ? colorCat(cat.idCategoria) : T.bgMuted,
                    color:       catActiva === cat.idCategoria ? '#fff' : T.textMuted }}>
                  {cat.nombre} ({conteo})
                </button>
              );
            })}
          </div>

          {/* ── Grid de productos ── */}
          <div style={{ flex:1, overflowY:'auto' }}>
            {prodFiltrados.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color: T.textMuted }}>
                No se encontraron productos
              </div>
            ) : (
              <div style={{ display:'grid',
                gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:'10px' }}>
                {prodFiltrados.map(prod => {
                  const sinStock  = prod.stock <= 0 && !prod.permiteStockNegativo;
                  const enCarrito = cantidadEnCarrito(prod.idProducto);
                  const img       = resolverImagen(prod.imagenUrl);
                  const stockBajo = prod.tipo === 'BIEN_FISICO'
                    && prod.stock <= prod.stockAlert && prod.stock > 0;

                  return (
                    <button key={prod.idProducto}
                      onClick={() => agregarAlCarrito(prod)}
                      disabled={sinStock}
                      title={sinStock ? 'Sin stock disponible' : prod.nombre}
                      style={{ background: T.bgCard,
                        border: enCarrito > 0 ? `2px solid ${T.gold}` : `1px solid ${T.border}`,
                        borderRadius:'12px', padding:'10px 8px',
                        cursor: sinStock ? 'not-allowed' : 'pointer',
                        textAlign:'center', transition:'all 0.15s',
                        opacity: sinStock ? 0.45 : 1, position:'relative' }}>

                      {enCarrito > 0 && (
                        <div style={{ position:'absolute', top:'6px', right:'6px',
                          background: T.gold, color:'#0f0f0f',
                          borderRadius:'50%', width:'20px', height:'20px',
                          fontSize:'11px', fontWeight:800,
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {enCarrito}
                        </div>
                      )}

                      {img
                        ? <img src={img} alt="" style={{ width:52, height:52, objectFit:'contain',
                            borderRadius:6, marginBottom:6 }} />
                        : <div style={{ width:52, height:52, borderRadius:8, margin:'0 auto 6px',
                            background: sinStock ? '#555' : colorCat(prod.categoria?.idCategoria),
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:22, color:'#fff' }}>
                            <i className="bi bi-box-seam" />
                          </div>
                      }

                      <div style={{ fontSize:'11px', fontWeight:600, color: T.textPrimary,
                        lineHeight:1.2, marginBottom:3, wordBreak:'break-word',
                        display:'-webkit-box', WebkitLineClamp:2,
                        WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {prod.nombre}
                      </div>
                      {prod.sku && (
                        <div style={{ fontSize:'9px', color: T.textMuted, marginBottom:2 }}>
                          {prod.sku}
                        </div>
                      )}
                      <div style={{ fontSize:'14px', fontWeight:800, color: T.gold }}>
                        S/ {parseFloat(prod.precioVenta).toFixed(2)}
                      </div>
                      {prod.tipo === 'BIEN_FISICO' && (
                        <div style={{ fontSize:'10px',
                          color: sinStock ? '#b06060' : stockBajo ? '#e6950a' : T.textMuted,
                          fontWeight: (sinStock || stockBajo) ? 700 : 400 }}>
                          {sinStock ? '✗ Sin stock' : `${prod.stock} und`}
                          {stockBajo && !sinStock ? ' ⚠' : ''}
                        </div>
                      )}
                      {prod.tipo !== 'BIEN_FISICO' && (
                        <div style={{ fontSize:'10px', color: T.textMuted }}>Servicio</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── DERECHA: Carrito ──────────────────────────────────────────── */}
        <div style={{ width:'320px', background: T.bgCard,
          border:`1px solid ${T.border}`, borderRadius:'16px',
          display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>

          {/* Header carrito */}
          <div style={{ padding:'12px 14px', borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, color: T.textPrimary, fontSize:'14px' }}>
                <i className="bi bi-cart me-2" />
                Carrito ({carrito.length} ítem{carrito.length !== 1 ? 's' : ''})
              </span>
              {carrito.length > 0 && (
                <button onClick={limpiarCarrito}
                  style={{ background:'none', border:'none', color: T.textMuted,
                    cursor:'pointer', fontSize:'12px' }}>
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Mensajes */}
          {error && (
            <div style={{ padding:'8px 14px', background:'#b0606018',
              borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
              <span style={{ fontSize:'12px', color:'#b06060' }}>⚠️ {error}</span>
            </div>
          )}
          {exito && (
            <div style={{ padding:'8px 14px', background:'#4a7c5918',
              borderBottom:`1px solid ${T.border}`, flexShrink:0,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:'12px', color:'#6aad7e' }}>{exito}</span>
              <button onClick={() => setExito('')}
                style={{ background:'none', border:'none', color:'#6aad7e', cursor:'pointer' }}>
                <i className="bi bi-x" />
              </button>
            </div>
          )}

          {/* Items del carrito */}
          <div style={{ flex:1, overflowY:'auto', padding:'10px' }}>
            {carrito.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color: T.textMuted }}>
                <i className="bi bi-cart" style={{ fontSize:'40px', display:'block',
                  marginBottom:'10px', opacity:0.3 }} />
                <div style={{ fontSize:'13px' }}>Haz clic en un producto para agregarlo</div>
              </div>
            ) : carrito.map(item => (
              <div key={item.idProducto} style={{ background: T.bgMuted,
                border:`1px solid ${T.border}`, borderRadius:'10px',
                padding:'9px 11px', marginBottom:'7px' }}>
                {/* Nombre + quitar */}
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:'6px' }}>
                  <div style={{ fontSize:'12px', fontWeight:600, color: T.textPrimary,
                    flex:1, paddingRight:'6px', lineHeight:'1.3' }}>
                    {item.nombre}
                    {item.sku && (
                      <span style={{ fontSize:'9px', color: T.textMuted,
                        display:'block', fontWeight:400 }}>
                        {item.sku}
                      </span>
                    )}
                  </div>
                  <button onClick={() => quitarItem(item.idProducto)}
                    style={{ background:'none', border:'none', color:'#b06060',
                      cursor:'pointer', fontSize:'15px', padding:0, lineHeight:1 }}>
                    <i className="bi bi-x" />
                  </button>
                </div>

                {/* Cantidad + precio */}
                <div style={{ display:'flex', alignItems:'center',
                  justifyContent:'space-between', marginBottom:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    {['-', '+'].map((btn, idx) => (
                      <button key={btn}
                        onClick={() => cambiarCantidad(item.idProducto,
                          idx === 0 ? item.cantidad - 1 : item.cantidad + 1)}
                        style={{ width:'24px', height:'24px', border:`1px solid ${T.border}`,
                          borderRadius:'6px', background: T.bgCard, cursor:'pointer',
                          fontSize:'14px', color: T.textPrimary,
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {btn}
                      </button>
                    ))}
                    <input type="number" value={item.cantidad} min="1"
                      onChange={e => cambiarCantidad(item.idProducto, e.target.value)}
                      style={{ width:'38px', textAlign:'center', border:`1px solid ${T.border}`,
                        borderRadius:'6px', padding:'2px', fontSize:'12px', outline:'none',
                        background: T.bgCard, color: T.textPrimary }} />
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'10px', color: T.textMuted }}>
                      S/ {item.precio.toFixed(2)} c/u
                    </div>
                    <div style={{ fontSize:'13px', fontWeight:700, color: T.gold }}>
                      S/ {(item.precio * item.cantidad).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Descuento por ítem */}
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <label style={{ fontSize:'10px', color: T.textMuted, whiteSpace:'nowrap' }}>
                    Desc. S/:
                  </label>
                  <input type="number" min="0" step="0.01"
                    value={item.descuento || ''}
                    placeholder="0.00"
                    onChange={e => cambiarDescuento(item.idProducto, e.target.value)}
                    style={{ flex:1, padding:'3px 6px', border:`1px solid ${T.border}`,
                      borderRadius:'6px', fontSize:'11px', outline:'none',
                      background: T.bgCard, color: T.textPrimary }} />
                  {item.descuento > 0 && (
                    <div style={{ fontSize:'10px', color:'#6aad7e', whiteSpace:'nowrap' }}>
                      = {((item.descuento / (item.precio * item.cantidad)) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                {/* Subtotal ítem con descuento */}
                {item.descuento > 0 && (
                  <div style={{ fontSize:'11px', color: T.gold, textAlign:'right',
                    marginTop:3, fontWeight:700 }}>
                    Neto: S/ {(item.precio * item.cantidad - item.descuento).toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totales y pago */}
          <div style={{ borderTop:`1px solid ${T.border}`, padding:'14px', flexShrink:0 }}>
            {carrito.length > 0 && (
              <>
                {/* Desglose */}
                {carrito.some(i => i.descuento > 0) && (
                  <div style={{ fontSize:'11px', color: T.textMuted,
                    display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                    <span>Desc. en ítems</span>
                    <span style={{ color:'#6aad7e' }}>
                      -S/ {carrito.reduce((a,i) => a+(i.descuento||0), 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div style={{ fontSize:'11px', color: T.textMuted,
                  display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                  <span>Subtotal (sin IGV)</span>
                  <span>S/ {subtotalSinIgv.toFixed(2)}</span>
                </div>
                <div style={{ fontSize:'11px', color: T.textMuted,
                  display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                  <span>IGV (18%)</span>
                  <span>S/ {igv.toFixed(2)}</span>
                </div>

                {/* Descuento global — input monto final deseado */}
                <div style={{ background:'rgba(13,94,79,0.05)', borderRadius:'8px',
                  padding:'8px 10px', marginBottom:'8px' }}>
                  <div style={{ fontSize:'10px', color: T.textMuted, fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4 }}>
                    Redondeo / desc. global
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span style={{ fontSize:'11px', color: T.textMuted }}>Total final S/:</span>
                    <input type="number" min="0" step="0.10"
                      value={descGlobalInput}
                      placeholder={totalItemsBruto.toFixed(2)}
                      onChange={e => setDescGlobalInput(e.target.value)}
                      style={{ flex:1, padding:'4px 8px', border:`1px solid ${T.border}`,
                        borderRadius:'6px', fontSize:'12px', outline:'none',
                        background: T.bgCard, color: T.textPrimary }} />
                    {descGlobalInput && (
                      <button onClick={() => setDescGlobalInput('')}
                        style={{ background:'none', border:'none', cursor:'pointer',
                          color: T.textMuted, fontSize:14 }}>×</button>
                    )}
                  </div>
                  {descGlobal > 0 && (
                    <div style={{ fontSize:'10px', color:'#6aad7e', marginTop:3 }}>
                      Desc. aplicado: S/{descGlobal.toFixed(2)} ({pctDescGlobal}%)
                    </div>
                  )}
                </div>

                <div style={{ fontSize:'18px', fontWeight:800, color: T.gold,
                  display:'flex', justifyContent:'space-between',
                  borderTop:`1px solid ${T.border}`,
                  paddingTop:'8px', marginBottom:'10px' }}>
                  <span style={{ color: T.textPrimary }}>TOTAL</span>
                  <span>S/ {totalFinal.toFixed(2)}</span>
                </div>

                {/* ── Formas de pago ── */}
                <div style={{ marginBottom:'10px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', marginBottom:'5px' }}>
                    <label style={{ fontSize:'10px', fontWeight:700, color: T.textMuted,
                      textTransform:'uppercase', letterSpacing:'0.8px' }}>
                      Formas de pago
                    </label>
                    {pagos.length < 3 && (
                      <button onClick={agregarMedioPago}
                        style={{ fontSize:'11px', color: T.gold, background:'none',
                          border:'none', cursor:'pointer', fontWeight:600 }}>
                        + Dividir
                      </button>
                    )}
                  </div>

                  {pagos.map((pago, idx) => (
                    <div key={idx} style={{ display:'flex', gap:'5px',
                      marginBottom:'5px', alignItems:'center' }}>
                      <select value={pago.medioPago}
                        onChange={e => actualizarPago(idx, 'medioPago', e.target.value)}
                        style={{ flex:'0 0 auto', width:'90px', padding:'6px',
                          border:`1px solid ${T.border}`, borderRadius:'7px',
                          fontSize:'11px', outline:'none',
                          background: T.bgInput, color: T.textPrimary }}>
                        {MEDIOS_PAGO.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <input type="number" min="0" step="0.50"
                        placeholder="S/ 0.00"
                        value={pago.monto}
                        onChange={e => actualizarPago(idx, 'monto', e.target.value)}
                        onFocus={() => completarFaltante(idx)}
                        style={{ flex:1, padding:'6px 8px',
                          border:`1px solid ${faltante > 0.01 ? '#b06060' : T.border}`,
                          borderRadius:'7px', fontSize:'12px', outline:'none',
                          background: T.bgInput, color: T.textPrimary }} />
                      {pagos.length > 1 && (
                        <button onClick={() => quitarMedioPago(idx)}
                          style={{ background:'none', border:'none',
                            color:'#b06060', cursor:'pointer', fontSize:'15px', padding:'0 2px' }}>
                          <i className="bi bi-x" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Estado del pago */}
                  <div style={{ fontSize:'11px', marginTop:'3px' }}>
                    {faltante > 0.01 ? (
                      <span style={{ color:'#b06060', fontWeight:600 }}>
                        ⚠ Falta: S/ {faltante.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color:'#6aad7e', fontWeight:600 }}>
                        ✓ Pago completo
                        {vuelto > 0.005 && ` — Vuelto: S/ ${vuelto.toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Botones */}
            <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
              <button onClick={confirmarVenta}
                disabled={guardando || carrito.length === 0}
                style={{ padding:'11px', borderRadius:'10px', border:'none',
                  background: carrito.length === 0
                    ? T.bgMuted
                    : `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                  color: carrito.length === 0 ? T.textMuted : '#0f0f0f',
                  fontWeight:700, fontSize:'14px',
                  cursor: carrito.length === 0 ? 'not-allowed' : 'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                {guardando
                  ? <><span className="spinner-border spinner-border-sm" />Procesando...</>
                  : <><i className="bi bi-check-circle" />Confirmar venta</>}
              </button>
              <div style={{ display:'flex', gap:'7px' }}>
                <button onClick={limpiarCarrito} disabled={carrito.length === 0 && !ultimaVenta}
                  style={{ flex:1, padding:'8px', borderRadius:'10px',
                    border:`1px solid ${T.border}`, background: T.bgMuted,
                    color: T.textSecond, fontWeight:600, fontSize:'12px',
                    cursor: 'pointer' }}>
                  <i className="bi bi-x-circle me-1" />Cancelar
                </button>
                <button onClick={handleImprimir}
                  disabled={!ultimaVenta}
                  title={!ultimaVenta ? 'Confirma una venta primero' : 'Imprimir comprobante PDF'}
                  style={{ flex:1, padding:'8px', borderRadius:'10px',
                    border:`1px solid ${T.border}`,
                    background: ultimaVenta ? T.bgCard : T.bgMuted,
                    color: ultimaVenta ? T.textPrimary : T.textMuted,
                    fontWeight:600, fontSize:'12px',
                    cursor: ultimaVenta ? 'pointer' : 'not-allowed' }}>
                  <i className="bi bi-printer me-1" />Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}