import { useState, useEffect } from 'react';
import { T, inputStyle, labelStyle, btnPrimary, cardStyle } from '../theme';
import api from '../api/axiosConfig';

const fmt      = (n) => 'S/ ' + parseFloat(n ?? 0).toFixed(2);
const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-PE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
}) : '--';

const FORM_VACIO       = { idProveedor: '', tipoComprobante: 'Factura', serieComprobante: 'F001', percepcion: '0', descuentoGlobal: '0', fechaIngreso: '' };
// Fecha vacía = hoy al confirmar (backend aplica now() si null)
const PROD_NUEVO_VACIO = { nombre: '', sku: '', idCategoria: '', precioVenta: '', descripcion: '', cantidadCompra: '', costoTotal: '' };

const inp = { width: '100%', padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: '8px', fontSize: '13px', outline: 'none', background: T.bgInput, color: T.textPrimary };
const lbl = { display: 'block', fontSize: '10px', fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' };

const ESTADO_CFG = {
  confirmado: { color: '#0d8c6e', bg: '#0d8c6e15', border: '#0d8c6e40', icon: 'bi-check-circle', label: 'Confirmado' },
  anulado:    { color: '#d64545', bg: '#d6454515', border: '#d6454540', icon: 'bi-x-circle',     label: 'Anulado'    },
  borrador:   { color: '#d68c0d', bg: '#d68c0d15', border: '#d68c0d40', icon: 'bi-pencil',       label: 'Borrador'   },
};

const AJUSTE_TIPOS = [
  { value: 'COSTO',     label: 'Correccion de costo',    icon: 'bi-currency-dollar', desc: 'El costo unitario fue registrado incorrectamente' },
  { value: 'CANTIDAD',  label: 'Ajuste de cantidad',     icon: 'bi-plus-minus',      desc: 'Diferencia entre lo facturado y lo recibido fisicamente' },
  { value: 'DEVOLUCION',label: 'Devolucion parcial',     icon: 'bi-arrow-return-left', desc: 'Productos devueltos al proveedor' },
];

export default function Compras() {
  const [compras,     setCompras]     = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [cargando,    setCargando]    = useState(true);

  const [vistaActiva,       setVistaActiva]       = useState('lista');
  const [expandida,         setExpandida]         = useState(null);
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [filtroEstado,      setFiltroEstado]      = useState('todos');
  const [guardando,         setGuardando]         = useState(false);
  const [error,             setError]             = useState('');
  const [exito,             setExito]             = useState('');

  // Form nueva compra
  const [form,           setForm]           = useState(FORM_VACIO);
  const [detalle,        setDetalle]        = useState([]);
  const [buscProd,       setBuscProd]       = useState('');
  const [prodsFiltrados, setProdsFiltrados] = useState([]);
  const [mostrarDrop,    setMostrarDrop]    = useState(false);
  const [modoAgregar,    setModoAgregar]    = useState(null);
  const [prodNuevoForm,  setProdNuevoForm]  = useState(PROD_NUEVO_VACIO);
  const [creandoProd,    setCreandoProd]    = useState(false);
  const [errorProd,      setErrorProd]      = useState('');

  // Busqueda de producto bonificado distinto por item
  const [buscBonifMap,  setBuscBonifMap]  = useState({}); // {idProducto: texto}

  // Modal editar producto desde compras
  const [modalEditProd,  setModalEditProd]  = useState(null);
  const [editProdForm,   setEditProdForm]   = useState({});
  const [guardandoProd,  setGuardandoProd]  = useState(false);
  const [errorEditProd,  setErrorEditProd]  = useState('');

  // Modal anulacion
  const [modalAnular,   setModalAnular]   = useState(null); // id compra
  const [motivoAnular,  setMotivoAnular]  = useState('');
  const [anulandoId,    setAnulandoId]    = useState(null);

  // Modal ajuste (Plan B)
  const [modalAjuste,       setModalAjuste]       = useState(null); // {compra, detalle}
  const [ajusteTipo,        setAjusteTipo]        = useState('COSTO');
  const [ajusteMotivo,      setAjusteMotivo]      = useState('');
  const [ajusteCostoNuevo,  setAjusteCostoNuevo]  = useState('');
  const [ajusteDelta,       setAjusteDelta]       = useState('');
  const [ajusteIdProducto,  setAjusteIdProducto]  = useState('');
  const [ajustes,           setAjustes]           = useState({}); // {idCompra: [ajustes]}
  const [guardandoAjuste,   setGuardandoAjuste]   = useState(false);
  const [errorAjuste,       setErrorAjuste]       = useState('');

  useEffect(() => {
    Promise.all([api.get('/compras'), api.get('/proveedores'), api.get('/productos'), api.get('/categorias')])
      .then(([c, p, pr, cat]) => {
        setCompras(c.data); setProveedores(p.data); setProductos(pr.data); setCategorias(cat.data);
      }).finally(() => setCargando(false));
  }, []);

  const recargarProductos = () => api.get('/productos').then(r => { setProductos(r.data); return r.data; });
  const recargarCompras   = () => api.get('/compras').then(r => { setCompras(r.data); return r.data; });

  const cargarAjustes = (idCompra) => {
    api.get(`/compras/${idCompra}/ajustes`).then(r => {
      setAjustes(prev => ({ ...prev, [idCompra]: r.data }));
    });
  };

  // ── Buscador de productos ─────────────────────────────────────
  const handleBuscProd = (e) => {
    const val = e.target.value; setBuscProd(val);
    if (val.trim().length < 1) { setProdsFiltrados([]); setMostrarDrop(false); return; }
    const fil = productos.filter(p =>
      p.nombre.toLowerCase().includes(val.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(val.toLowerCase())
    ).slice(0, 8);
    setProdsFiltrados(fil); setMostrarDrop(fil.length > 0);
  };

  const agregarProductoExistente = (prod) => {
    setBuscProd(''); setProdsFiltrados([]); setMostrarDrop(false); setModoAgregar(null);
    setDetalle(d => {
      if (d.find(i => i.idProducto === prod.idProducto)) return d;
      return [...d, { idProducto: prod.idProducto, nombre: prod.nombre, sku: prod.sku ?? '',
        precioVenta: parseFloat(prod.precioVenta ?? 0).toFixed(2),
        cantidad: 1, costoTotal: '', costoUnitario: '', descuentoPct: '0',
        unidadesBonif: '0', idProductoBonif: '', cantidadBonif: '0', esNuevo: false }];
    });
  };

  const handleCrearProdNuevo = async () => {
    if (!prodNuevoForm.nombre.trim())   { setErrorProd('El nombre es obligatorio.'); return; }
    if (!prodNuevoForm.idCategoria)     { setErrorProd('Selecciona una categoria.'); return; }
    if (!prodNuevoForm.precioVenta)     { setErrorProd('El precio de venta es obligatorio.'); return; }
    const cantidad   = parseInt(prodNuevoForm.cantidadCompra);
    const costoTotal = parseFloat(prodNuevoForm.costoTotal);
    if (!cantidad || cantidad < 1)      { setErrorProd('Ingresa la cantidad que compraste.'); return; }
    if (!costoTotal || costoTotal <= 0) { setErrorProd('Ingresa el costo total pagado.'); return; }
    const costoUnitario = (costoTotal / cantidad).toFixed(4);
    setCreandoProd(true); setErrorProd('');
    try {
      const res = await api.post('/productos', {
        nombre: prodNuevoForm.nombre.trim(), sku: prodNuevoForm.sku.trim() || null,
        descripcion: prodNuevoForm.descripcion.trim() || null,
        precioVenta: parseFloat(prodNuevoForm.precioVenta), precioCosto: parseFloat(costoUnitario),
        stock: 0, stockAlert: 5, categoria: { idCategoria: parseInt(prodNuevoForm.idCategoria) },
      });
      const creado = res.data;
      setDetalle(d => [...d, { idProducto: creado.idProducto, nombre: creado.nombre,
        sku: creado.sku ?? '', cantidad, costoTotal: String(parseFloat(prodNuevoForm.costoTotal)),
        costoUnitario, descuentoPct: '0', unidadesBonif: '0', idProductoBonif: '', cantidadBonif: '0', esNuevo: true }]);
      await recargarProductos();
      setProdNuevoForm(PROD_NUEVO_VACIO); setModoAgregar(null); setErrorProd('');
    } catch { setErrorProd('Error al crear. El SKU podria estar repetido.'); }
    finally  { setCreandoProd(false); }
  };

  // Abrir modal editar producto desde compras
  const abrirEditProd = (prod) => {
    setModalEditProd(prod);
    setEditProdForm({
      nombre:      prod.nombre      ?? '',
      sku:         prod.sku         ?? '',
      precioVenta: prod.precioVenta ?? '',
      precioCosto: prod.precioCosto ?? '',
      stockAlert:  prod.stockAlert  ?? 5,
      descripcion: prod.descripcion ?? '',
      idCategoria: prod.categoria?.idCategoria ?? '',
    });
    setErrorEditProd('');
  };

  const handleGuardarProd = async () => {
    if (!editProdForm.nombre.trim()) { setErrorEditProd('El nombre es obligatorio.'); return; }
    setGuardandoProd(true); setErrorEditProd('');
    try {
      const payload = {
        nombre:      editProdForm.nombre.trim(),
        sku:         editProdForm.sku.trim() || null,
        precioVenta: parseFloat(editProdForm.precioVenta) || 0,
        precioCosto: parseFloat(editProdForm.precioCosto) || 0,
        stockAlert:  parseInt(editProdForm.stockAlert) || 5,
        descripcion: editProdForm.descripcion.trim() || null,
        stock:       modalEditProd.stock,
        cpp:         modalEditProd.cpp,
        categoria:   { idCategoria: parseInt(editProdForm.idCategoria) || modalEditProd.categoria?.idCategoria },
      };
      await api.put('/productos/' + modalEditProd.idProducto, payload);
      // Actualizar en la lista local sin recargar todo
      setProductos(ps => ps.map(p =>
        p.idProducto === modalEditProd.idProducto ? { ...p, ...payload, categoria: p.categoria } : p
      ));
      // Actualizar en el detalle si ya está en carrito
      setDetalle(d => d.map(i =>
        i.idProducto === modalEditProd.idProducto
          ? { ...i, nombre: payload.nombre, precioVenta: String(payload.precioVenta) }
          : i
      ));
      setModalEditProd(null);
    } catch { setErrorEditProd('Error al guardar. Verifica los datos.'); }
    finally   { setGuardandoProd(false); }
  };

  const actualizarItem = (id, campo, valor) => setDetalle(d => d.map(i => i.idProducto === id ? { ...i, [campo]: valor } : i));
  const quitarItem     = (id) => setDetalle(d => d.filter(i => i.idProducto !== id));

  const subtotalCompra = detalle.reduce((a, i) => {
    const dsc  = parseFloat(i.descuentoPct) / 100 || 0;
    const cant = parseInt(i.cantidad) || 0;
    const usaTotal = i.costoTotal !== '' && i.costoTotal !== undefined;
    const costoBase = usaTotal
      ? (parseFloat(i.costoTotal) || 0)
      : (parseFloat(i.costoUnitario) || 0) * cant;
    return a + costoBase * (1 - dsc);
  }, 0);
  const percepcionNum  = parseFloat(form.percepcion) || 0;
  const descuentoNum   = parseFloat(form.descuentoGlobal) || 0;
  const totalCompra    = subtotalCompra + percepcionNum - descuentoNum;

  // ── Registrar compra ─────────────────────────────────────────
  const handleGuardar = async () => {
    if (!form.idProveedor)    { setError('Selecciona un proveedor.'); return; }
    if (detalle.length === 0) { setError('Agrega al menos un producto.'); return; }
    const invalido = detalle.find(i => {
      const cant = parseInt(i.cantidad);
      const tieneTotal = i.costoTotal !== '' && i.costoTotal !== undefined;
      const costoOk = tieneTotal ? parseFloat(i.costoTotal) > 0 : parseFloat(i.costoUnitario) > 0;
      return !cant || !costoOk;
    });
    if (invalido) { setError('Verifica cantidad y costo total de "' + invalido.nombre + '".'); return; }
    setGuardando(true); setError('');
    try {
      await api.post('/compras', {
        idProveedor: parseInt(form.idProveedor), tipoComprobante: form.tipoComprobante,
        serieComprobante: form.serieComprobante, percepcion: percepcionNum,
        descuentoGlobal: parseFloat(form.descuentoGlobal) || 0,
        fechaIngreso: form.fechaIngreso ? new Date(form.fechaIngreso).toISOString().replace('Z', '') : null,
        detalles: detalle.map(i => {
          const cant = parseInt(i.cantidad) || 1;
          // Si el usuario ingresó costoTotal, calcular costoUnitario
          const costoUnit = (i.costoTotal !== '' && i.costoTotal !== undefined)
            ? parseFloat(i.costoTotal) / cant
            : parseFloat(i.costoUnitario) || 0;
          return {
            idProducto:            i.idProducto,
            cantidad:              cant,
            costoUnitario:         parseFloat(costoUnit.toFixed(4)),
            descuentoPct:          parseFloat(i.descuentoPct) || 0,
            precioVenta:           i.precioVenta ? parseFloat(i.precioVenta) : null,
            unidadesBonificacion:  parseInt(i.unidadesBonif) || 0,
            idProductoBonif:       i.idProductoBonif ? parseInt(i.idProductoBonif) : null,
            cantidadBonif:         i.idProductoBonif ? parseInt(i.cantidadBonif) || 0 : null,
            // Costo del producto bonificado: costoBonifTotal ingresado o CPP existente * cantidad
            costoBonifTotal:       i.idProductoBonif && i.costoBonifTotal ? parseFloat(i.costoBonifTotal) : null,
          };
        }),
      });
      // Actualizar precio de venta de productos que el usuario modificó en esta compra
      const actualizaciones = detalle
        .filter(i => i.precioVenta !== undefined && i.precioVenta !== '' && !i.esNuevo)
        .map(i => api.put('/productos/' + i.idProducto, {
          idProducto: i.idProducto, precioVenta: parseFloat(i.precioVenta),
        }).catch(() => {})); // silenciar errores individuales
      if (actualizaciones.length > 0) await Promise.all(actualizaciones);
      setExito('Compra registrada. Stock, CPP y precios de venta actualizados.');
      setForm(FORM_VACIO); setDetalle([]); recargarCompras(); recargarProductos(); setVistaActiva('lista');
    } catch { setError('Error al registrar la compra.'); }
    finally  { setGuardando(false); }
  };

  // ── Anular compra ─────────────────────────────────────────────
  const handleAnular = async () => {
    if (!motivoAnular.trim()) { return; }
    setAnulandoId(modalAnular);
    try {
      await api.patch(`/compras/${modalAnular}/anular`, { motivo: motivoAnular });
      setExito('Compra anulada. Stock y CPP revertidos automaticamente.');
      setModalAnular(null); setMotivoAnular('');
      recargarCompras(); recargarProductos();
    } catch (e) {
      alert(e.response?.data ?? 'Error al anular la compra.');
    } finally { setAnulandoId(null); }
  };

  // ── Nota de ajuste Plan B ─────────────────────────────────────
  const abrirAjuste = (compra) => {
    setModalAjuste(compra);
    setAjusteTipo('COSTO'); setAjusteMotivo(''); setAjusteCostoNuevo('');
    setAjusteDelta(''); setErrorAjuste('');
    if (compra.detalles && compra.detalles.length > 0)
      setAjusteIdProducto(String(compra.detalles[0].producto?.idProducto ?? ''));
    cargarAjustes(compra.idCompra);
  };

  const handleGuardarAjuste = async () => {
    if (!ajusteMotivo.trim())    { setErrorAjuste('El motivo es obligatorio.'); return; }
    if (!ajusteIdProducto)       { setErrorAjuste('Selecciona el producto.'); return; }
    if (ajusteTipo === 'COSTO' && !ajusteCostoNuevo) { setErrorAjuste('Ingresa el costo correcto.'); return; }
    if ((ajusteTipo === 'CANTIDAD' || ajusteTipo === 'DEVOLUCION') && !ajusteDelta) {
      setErrorAjuste('Ingresa la cantidad a ajustar.'); return;
    }
    setGuardandoAjuste(true); setErrorAjuste('');

    // Buscar la cantidad original de ese producto en la compra
    const detItem = modalAjuste.detalles?.find(d => String(d.producto?.idProducto) === ajusteIdProducto);

    try {
      await api.post(`/compras/${modalAjuste.idCompra}/ajuste`, {
        idProducto:       parseInt(ajusteIdProducto),
        tipo:             ajusteTipo,
        motivo:           ajusteMotivo,
        costoNuevo:       ajusteTipo === 'COSTO' ? parseFloat(ajusteCostoNuevo) : null,
        deltaCantidad:    (ajusteTipo !== 'COSTO') ? parseInt(ajusteDelta) : null,
        cantidadOriginal: detItem?.cantidad ?? null,
      });
      setExito(`Ajuste aplicado correctamente. CPP actualizado.`);
      cargarAjustes(modalAjuste.idCompra);
      setModalAjuste(null);
      recargarProductos();
    } catch (e) {
      setErrorAjuste(e.response?.data ?? 'Error al aplicar el ajuste.');
    } finally { setGuardandoAjuste(false); }
  };

  // ── Filtrado historial ────────────────────────────────────────
  const comprasFiltradas = compras.filter(c => {
    const matchTxt = busquedaHistorial.trim() === '' ||
      String(c.idCompra).includes(busquedaHistorial) ||
      c.proveedor?.empresa?.toLowerCase().includes(busquedaHistorial.toLowerCase());
    const matchEst = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchTxt && matchEst;
  });

  const costoUnitarioPreview = prodNuevoForm.cantidadCompra && prodNuevoForm.costoTotal &&
    parseInt(prodNuevoForm.cantidadCompra) > 0 && parseFloat(prodNuevoForm.costoTotal) > 0
    ? (parseFloat(prodNuevoForm.costoTotal) / parseInt(prodNuevoForm.cantidadCompra)).toFixed(2) : null;

  if (cargando) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
      <div className="spinner-border" style={{ color: T.gold }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 700, color: T.textPrimary, fontSize: '18px' }}>Compras</h5>
          <small style={{ color: T.textMuted }}>
            {vistaActiva === 'lista'
              ? `${compras.filter(c => c.estado === 'confirmado').length} confirmadas · ${compras.filter(c => c.estado === 'anulado').length} anuladas`
              : 'Nueva orden de compra'}
          </small>
        </div>
        {vistaActiva === 'lista' ? (
          <button onClick={() => { setVistaActiva('nueva'); setError(''); setExito(''); }} style={{ ...btnPrimary }}
            onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`}
            onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`}>
            <i className="bi bi-cart-plus" /> Nueva compra
          </button>
        ) : (
          <button onClick={() => { setVistaActiva('lista'); setError(''); setDetalle([]); setForm(FORM_VACIO); setModoAgregar(null); }}
            style={{ padding: '9px 18px', borderRadius: '10px', border: `1px solid ${T.border}`, background: T.bgMuted, color: T.textSecond, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
            <i className="bi bi-arrow-left me-1" /> Volver
          </button>
        )}
      </div>

      {exito && (
        <div style={{ background: '#0d8c6e18', border: '1px solid #0d8c6e40', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '16px', color: '#0d8c6e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><i className="bi bi-check-circle me-2" />{exito}</span>
          <button onClick={() => setExito('')} style={{ background: 'none', border: 'none', color: '#0d8c6e', cursor: 'pointer', fontSize: '18px' }}><i className="bi bi-x" /></button>
        </div>
      )}

      {/* ══ VISTA NUEVA COMPRA ══ */}
      {vistaActiva === 'nueva' && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div style={{ ...cardStyle, padding: '20px' }}>
              <h6 style={{ margin: '0 0 16px', fontWeight: 700, color: T.textPrimary, fontSize: '14px' }}>
                <i className="bi bi-file-earmark-text me-2" style={{ color: T.gold }} />Datos de la orden
              </h6>
              <div className="row g-3">
                <div className="col-12">
                  <label style={lbl}>Proveedor *</label>
                  <select value={form.idProveedor} onChange={e => setForm(f => ({ ...f, idProveedor: e.target.value }))} style={inp}>
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => <option key={p.idProveedor} value={p.idProveedor}>{p.empresa}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label style={lbl}>Tipo comprobante</label>
                  <select value={form.tipoComprobante} onChange={e => setForm(f => ({ ...f, tipoComprobante: e.target.value }))} style={inp}>
                    <option>Factura</option><option>Boleta</option><option>Ticket</option><option>Sin comprobante</option>
                  </select>
                </div>
                <div className="col-6">
                  <label style={lbl}>Serie / N</label>
                  <input value={form.serieComprobante} onChange={e => setForm(f => ({ ...f, serieComprobante: e.target.value }))} placeholder="F001-00123" style={inp} />
                </div>
                <div className="col-6">
                  <label style={lbl}>Percepcion (S/)</label>
                  <input type="number" step="0.01" min="0" value={form.percepcion} onChange={e => setForm(f => ({ ...f, percepcion: e.target.value }))} placeholder="0.00" style={inp} />
                </div>
                <div className="col-12">
                  <label style={lbl}>Fecha de ingreso al almacen</label>
                  <input type="datetime-local" value={form.fechaIngreso}
                    onChange={e => setForm(f => ({ ...f, fechaIngreso: e.target.value }))} style={inp} />
                  <small style={{ color: T.textMuted, fontSize: '10px', marginTop: '3px', display: 'block' }}>
                    Dejar vacio = hoy. Completar solo si la mercaderia llego antes.
                  </small>
                </div>
                <div className="col-6">
                  <label style={lbl}>Descuento global (S/)</label>
                  <input type="number" step="0.01" min="0" value={form.descuentoGlobal} onChange={e => setForm(f => ({ ...f, descuentoGlobal: e.target.value }))} placeholder="0.00" style={inp} />
                  <small style={{ color: T.textMuted, fontSize: '10px', marginTop: '3px', display: 'block' }}>Redondeo o dscto del proveedor</small>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h6 style={{ margin: 0, fontWeight: 700, color: T.textPrimary, fontSize: '14px' }}>
                  <i className="bi bi-box-seam me-2" style={{ color: T.gold }} />Agregar productos
                </h6>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setModoAgregar(modoAgregar === 'buscar' ? null : 'buscar'); setBuscProd(''); setProdsFiltrados([]); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${T.goldBorder}`, background: modoAgregar === 'buscar' ? T.gold : T.goldBg, color: modoAgregar === 'buscar' ? '#fff' : T.gold }}>
                    <i className="bi bi-search me-1" />Existente
                  </button>
                  <button onClick={() => { setModoAgregar(modoAgregar === 'nuevo' ? null : 'nuevo'); setErrorProd(''); setProdNuevoForm(PROD_NUEVO_VACIO); }}
                    style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: '1px solid #6aad7e40', background: modoAgregar === 'nuevo' ? '#6aad7e' : '#6aad7e18', color: modoAgregar === 'nuevo' ? '#fff' : '#6aad7e' }}>
                    <i className="bi bi-plus-circle me-1" />Nuevo producto
                  </button>
                </div>
              </div>

              {modoAgregar === 'buscar' && (
                <div style={{ position: 'relative', marginBottom: '4px' }}>
                  <i className="bi bi-search" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                  <input type="text" placeholder="Nombre o SKU..." value={buscProd} onChange={handleBuscProd} autoFocus
                    onBlur={() => setTimeout(() => setMostrarDrop(false), 180)}
                    onFocus={() => buscProd && setMostrarDrop(prodsFiltrados.length > 0)}
                    style={{ ...inp, paddingLeft: '34px' }} />
                  {mostrarDrop && prodsFiltrados.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: '10px',
                      boxShadow: T.shadowModal, marginTop: '4px', overflow: 'hidden' }}>
                      {prodsFiltrados.map(p => (
                        <div key={p.idProducto} onMouseDown={() => agregarProductoExistente(p)}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <div style={{ fontWeight: 600, color: T.textPrimary, fontSize: '13px' }}>{p.nombre}</div>
                            <small style={{ color: T.textMuted }}>{p.sku ?? '--'} · Stock: {p.stock} · CPP: {fmt(p.cpp ?? p.precioCosto)}</small>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                            <span style={{ color: T.gold, fontSize: '12px', fontWeight: 700 }}>
                              {fmt(p.precioCosto)}
                            </span>
                            <button
                              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); abrirEditProd(p); }}
                              style={{ background: T.goldBg, border: '1px solid ' + T.goldBorder,
                                borderRadius: '6px', padding: '2px 8px', cursor: 'pointer',
                                fontSize: '11px', color: T.gold, fontWeight: 600 }}>
                              <i className="bi bi-pencil me-1" />Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {buscProd && prodsFiltrados.length === 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: T.textMuted }}>
                      No encontrado.{' '}
                      <button onClick={() => { setModoAgregar('nuevo'); setBuscProd(''); setProdNuevoForm({ ...PROD_NUEVO_VACIO, nombre: buscProd }); setErrorProd(''); }}
                        style={{ background: 'none', border: 'none', color: '#6aad7e', cursor: 'pointer', fontWeight: 700, fontSize: '12px', padding: 0 }}>
                        Crear como nuevo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {modoAgregar === 'nuevo' && (
                <div style={{ background: '#6aad7e0e', border: '1px solid #6aad7e30', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#4a8a5e' }}>
                      <i className="bi bi-plus-circle me-1" />Nuevo producto
                    </span>
                    <button onClick={() => { setModoAgregar(null); setProdNuevoForm(PROD_NUEVO_VACIO); setErrorProd(''); }}
                      style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: '18px' }}>
                      <i className="bi bi-x" />
                    </button>
                  </div>
                  {errorProd && (
                    <div style={{ background: '#b0606018', color: '#c07070', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', border: '1px solid #b0606040' }}>
                      <i className="bi bi-exclamation-circle me-1" />{errorProd}
                    </div>
                  )}
                  <div className="row g-2">
                    <div className="col-8">
                      <label style={lbl}>Nombre *</label>
                      <input value={prodNuevoForm.nombre} autoFocus onChange={e => setProdNuevoForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Arroz Extra 5kg" style={inp} />
                    </div>
                    <div className="col-4">
                      <label style={lbl}>SKU</label>
                      <input value={prodNuevoForm.sku} onChange={e => setProdNuevoForm(f => ({ ...f, sku: e.target.value }))} placeholder="ABR-099" style={inp} />
                    </div>
                    <div className="col-6">
                      <label style={lbl}>Categoria *</label>
                      <select value={prodNuevoForm.idCategoria} onChange={e => setProdNuevoForm(f => ({ ...f, idCategoria: e.target.value }))} style={inp}>
                        <option value="">Seleccionar...</option>
                        {categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label style={lbl}>Precio venta al cliente (S/) *</label>
                      <input type="number" step="0.01" min="0" value={prodNuevoForm.precioVenta} onChange={e => setProdNuevoForm(f => ({ ...f, precioVenta: e.target.value }))} placeholder="0.00" style={inp} />
                    </div>
                    <div className="col-12">
                      <label style={lbl}>Descripcion</label>
                      <input value={prodNuevoForm.descripcion} onChange={e => setProdNuevoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional" style={inp} />
                    </div>
                    <div className="col-12">
                      <div style={{ borderTop: '1px dashed #6aad7e50', margin: '6px 0', paddingTop: '10px' }}>
                        <small style={{ fontWeight: 700, color: '#4a8a5e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          Datos de esta compra
                        </small>
                      </div>
                    </div>
                    <div className="col-5">
                      <label style={lbl}>Cantidad comprada *</label>
                      <input type="number" min="1" value={prodNuevoForm.cantidadCompra} onChange={e => setProdNuevoForm(f => ({ ...f, cantidadCompra: e.target.value }))} placeholder="12" style={{ ...inp, textAlign: 'center' }} />
                    </div>
                    <div className="col-7">
                      <label style={lbl}>Costo total pagado (S/) *</label>
                      <input type="number" step="0.01" min="0" value={prodNuevoForm.costoTotal} onChange={e => setProdNuevoForm(f => ({ ...f, costoTotal: e.target.value }))} placeholder="12.00" style={inp} />
                    </div>
                    {costoUnitarioPreview && (
                      <div className="col-12">
                        <div style={{ background: '#6aad7e18', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#4a8a5e', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Costo unitario calculado:</span>
                          <span style={{ fontSize: '14px', fontWeight: 800 }}>S/ {costoUnitarioPreview} / und.</span>
                        </div>
                      </div>
                    )}
                    <div className="col-12">
                      <button onClick={handleCrearProdNuevo} disabled={creandoProd}
                        style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#6aad7e', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: creandoProd ? 0.7 : 1 }}>
                        {creandoProd ? <><span className="spinner-border spinner-border-sm" /> Creando...</> : <><i className="bi bi-check-lg" /> Crear y agregar</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detalle.length === 0 && modoAgregar === null && (
                <div style={{ textAlign: 'center', padding: '24px', color: T.textMuted, background: T.bgMuted, borderRadius: '10px', border: `1px dashed ${T.border}` }}>
                  <i className="bi bi-cart" style={{ fontSize: '24px', display: 'block', marginBottom: '6px' }} />
                  Usa los botones para agregar productos
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: '#b0606018', border: '1px solid #b0606040', borderRadius: '10px', padding: '10px 14px', color: '#c07070', fontSize: '13px' }}>
                <i className="bi bi-exclamation-circle me-2" />{error}
              </div>
            )}
          </div>

          {/* Derecha: detalle + totales */}
          <div style={{ flex: '0 0 360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: T.textPrimary, fontSize: '14px' }}>
                  <i className="bi bi-list-check me-2" style={{ color: T.gold }} />Detalle ({detalle.length})
                </span>
                {detalle.length > 0 && (
                  <button onClick={() => setDetalle([])} style={{ background: '#b0606018', border: '1px solid #b0606040', borderRadius: '6px', color: '#b06060', padding: '3px 10px', cursor: 'pointer', fontSize: '12px' }}>
                    <i className="bi bi-trash me-1" />Limpiar
                  </button>
                )}
              </div>
              {detalle.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: T.textMuted }}>
                  <i className="bi bi-box" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />Sin productos aun
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {detalle.map(item => {
                    const subtotalItem = (parseFloat(item.costoUnitario) || 0) * (parseInt(item.cantidad) || 0);
                    return (
                      <div key={item.idProducto} style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ flex: 1, paddingRight: '6px', minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.esNuevo && <span style={{ background: '#6aad7e22', color: '#6aad7e', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', marginRight: '6px' }}>NUEVO</span>}
                              {item.nombre}
                            </div>
                            {item.sku && <small style={{ fontFamily: 'monospace', color: T.textMuted, fontSize: '11px' }}>{item.sku}</small>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                            {/* Editar producto */}
                            <button
                              onClick={() => {
                                const prod = productos.find(p => p.idProducto === item.idProducto);
                                if (prod) abrirEditProd(prod);
                              }}
                              title="Editar datos del producto"
                              style={{ background: T.goldBg, border: '1px solid ' + T.goldBorder,
                                borderRadius: '6px', padding: '3px 7px', cursor: 'pointer',
                                fontSize: '12px', color: T.gold }}>
                              <i className="bi bi-pencil" />
                            </button>
                            {/* Quitar del detalle */}
                            <button onClick={() => quitarItem(item.idProducto)}
                              style={{ background: 'none', border: 'none', color: '#b06060',
                                cursor: 'pointer', fontSize: '17px', padding: 0 }}>
                              <i className="bi bi-x" />
                            </button>
                          </div>
                        </div>
                        {(() => {
                          const cant     = parseInt(item.cantidad) || 0;
                          const dsc      = parseFloat(item.descuentoPct) / 100 || 0;
                          const usaTotal = item.costoTotal !== '' && item.costoTotal !== undefined;
                          const costoT   = usaTotal ? parseFloat(item.costoTotal) || 0 : (parseFloat(item.costoUnitario) || 0) * cant;
                          const costoU   = cant > 0 ? costoT / cant : 0;
                          const subItem  = costoT * (1 - dsc);
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {/* Fila 1: cantidad + costo total + dscto */}
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                <div style={{ flex: '0 0 72px' }}>
                                  <label style={{ ...lbl, marginBottom: '2px' }}>Cantidad</label>
                                  <input type="number" min="1" value={item.cantidad}
                                    onChange={e => actualizarItem(item.idProducto, 'cantidad', e.target.value)}
                                    style={{ ...inp, textAlign: 'center' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ ...lbl, marginBottom: '2px' }}>Costo total pagado (S/)</label>
                                  <input type="number" step="0.01" min="0"
                                    value={usaTotal ? item.costoTotal : (parseFloat(item.costoUnitario) * cant || '')}
                                    onChange={e => actualizarItem(item.idProducto, 'costoTotal', e.target.value)}
                                    placeholder={'Cuanto pagaste por ' + (cant || '?') + ' unidades'}
                                    style={inp} />
                                </div>
                                <div style={{ flex: '0 0 64px' }}>
                                  <label style={{ ...lbl, marginBottom: '2px' }}>Dscto %</label>
                                  <input type="number" step="0.5" min="0" max="100"
                                    value={item.descuentoPct ?? '0'}
                                    onChange={e => actualizarItem(item.idProducto, 'descuentoPct', e.target.value)}
                                    style={{ ...inp, textAlign: 'center', color: parseFloat(item.descuentoPct) > 0 ? '#d68c0d' : T.textPrimary }} />
                                </div>
                              </div>
                              {/* Fila 2: preview costo unitario + precio venta + subtotal */}
                              {costoT > 0 && cant > 0 && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <div style={{ background: '#6a9ac415', border: '1px solid #6a9ac440',
                                    borderRadius: '8px', padding: '5px 10px', fontSize: '11px',
                                    color: '#6a9ac4', fontWeight: 600, flex: 1 }}>
                                    Costo unit. calculado: <strong>S/ {costoU.toFixed(4)}</strong>
                                  </div>
                                  {parseFloat(item.descuentoPct) > 0 && (
                                    <div style={{ fontSize: '10px', color: T.textMuted, textDecoration: 'line-through' }}>
                                      {fmt(costoT)}
                                    </div>
                                  )}
                                  <div style={{ fontWeight: 800, color: T.gold, fontSize: '15px', flexShrink: 0 }}>
                                    {fmt(subItem)}
                                  </div>
                                </div>
                              )}
                              {/* Fila 3: precio venta editable */}
                              {!item.esNuevo && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label style={{ ...lbl, marginBottom: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    Precio venta (S/):
                                  </label>
                                  <input type="number" step="0.01" min="0"
                                    value={item.precioVenta ?? ''}
                                    onChange={e => actualizarItem(item.idProducto, 'precioVenta', e.target.value)}
                                    placeholder="Precio al cliente"
                                    style={{ ...inp, flex: 1 }} />
                                  {item.precioVenta && costoU > 0 && (
                                    <span style={{ fontSize: '11px', fontWeight: 700, flexShrink: 0,
                                      color: ((parseFloat(item.precioVenta) - costoU) / parseFloat(item.precioVenta) * 100) >= 20
                                        ? T.gold : '#d68c0d' }}>
                                      {(((parseFloat(item.precioVenta) - costoU) / parseFloat(item.precioVenta)) * 100).toFixed(0)}% margen
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Fila 4: Bonificaciones */}
                              <div style={{ borderTop: '1px dashed ' + T.border, paddingTop: '8px', marginTop: '4px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: T.textMuted,
                                  textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                                  Bonificacion (opcional)
                                </div>
                                {/* Mismo producto: unidades extra gratis */}
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginBottom: '6px' }}>
                                  <div style={{ flex: 1 }}>
                                    <label style={{ ...lbl, marginBottom: '2px', color: '#6aad7e' }}>
                                      Unidades bonif. (mismo producto)
                                    </label>
                                    <input type="number" min="0" value={item.unidadesBonif ?? '0'}
                                      onChange={e => actualizarItem(item.idProducto, 'unidadesBonif', e.target.value)}
                                      style={{ ...inp, textAlign: 'center' }} />
                                  </div>
                                  {parseInt(item.unidadesBonif) > 0 && costoT > 0 && (
                                    <div style={{ flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#6aad7e',
                                      background: '#6aad7e15', padding: '5px 10px', borderRadius: '8px',
                                      whiteSpace: 'nowrap', paddingBottom: '7px' }}>
                                      Costo real: S/ {(costoT / (cant + parseInt(item.unidadesBonif))).toFixed(4)}/und
                                    </div>
                                  )}
                                </div>
                                {/* Producto distinto: regalo de otro producto — con buscador */}
                                <div>
                                  <label style={{ ...lbl, marginBottom: '4px', color: '#9a7ec4' }}>
                                    Producto bonificado distinto
                                  </label>
                                  {/* Buscador con filtro */}
                                  {!item.idProductoBonif && (
                                    <div style={{ position: 'relative' }}>
                                      <i className="bi bi-search" style={{ position: 'absolute', left: '10px',
                                        top: '50%', transform: 'translateY(-50%)', color: T.textMuted, fontSize: '13px' }} />
                                      <input type="text"
                                        placeholder="Buscar producto regalado..."
                                        value={buscBonifMap[item.idProducto] ?? ''}
                                        onChange={e => setBuscBonifMap(m => ({ ...m, [item.idProducto]: e.target.value }))}
                                        style={{ ...inp, paddingLeft: '30px', fontSize: '12px' }} />
                                    </div>
                                  )}
                                  {/* Lista filtrada */}
                                  {!item.idProductoBonif && (buscBonifMap[item.idProducto] ?? '').length > 0 && (
                                    <div style={{ maxHeight: '140px', overflowY: 'auto', background: T.bgCard,
                                      border: '1px solid ' + T.border, borderRadius: '8px', marginTop: '4px' }}>
                                      {productos
                                        .filter(pr => pr.idProducto !== item.idProducto &&
                                          (pr.nombre.toLowerCase().includes((buscBonifMap[item.idProducto]??'').toLowerCase()) ||
                                           (pr.sku ?? '').toLowerCase().includes((buscBonifMap[item.idProducto]??'').toLowerCase())))
                                        .slice(0, 8)
                                        .map(pr => (
                                          <div key={pr.idProducto}
                                            onClick={() => {
                                              actualizarItem(item.idProducto, 'idProductoBonif', String(pr.idProducto));
                                              actualizarItem(item.idProducto, 'cantidadBonif', '1');
                                              actualizarItem(item.idProducto, 'costoBonifTotal', '');
                                              setBuscBonifMap(m => ({ ...m, [item.idProducto]: '' }));
                                            }}
                                            style={{ padding: '7px 10px', cursor: 'pointer', fontSize: '12px',
                                              borderBottom: '1px solid ' + T.border, display: 'flex',
                                              justifyContent: 'space-between', alignItems: 'center' }}
                                            onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <div>
                                              <div style={{ fontWeight: 600, color: T.textPrimary }}>{pr.nombre}</div>
                                              <small style={{ color: T.textMuted }}>{pr.sku ?? '--'}</small>
                                            </div>
                                            <span style={{ color: '#9a7ec4', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginLeft: '6px' }}>
                                              CPP: {parseFloat(pr.cpp ?? pr.precioCosto ?? 0).toFixed(2)}
                                            </span>
                                          </div>
                                        ))}
                                      {productos.filter(pr => pr.idProducto !== item.idProducto &&
                                        pr.nombre.toLowerCase().includes((buscBonifMap[item.idProducto]??'').toLowerCase())).length === 0 && (
                                        <div style={{ padding: '10px', textAlign: 'center', color: T.textMuted, fontSize: '12px' }}>
                                          Sin resultados
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* Producto seleccionado — mostrar controles */}
                                  {item.idProductoBonif && (() => {
                                    const prodB = productos.find(pr => String(pr.idProducto) === String(item.idProductoBonif));
                                    if (!prodB) return null;
                                    const cppBActual = parseFloat(prodB.cpp ?? prodB.precioCosto ?? 0);
                                    const sinCpp = cppBActual <= 0;
                                    const costoBonifTotalNum = parseFloat(item.costoBonifTotal || 0);
                                    const cantBonif = parseInt(item.cantidadBonif || 1);
                                    const costoUnitBonif = cantBonif > 0 && costoBonifTotalNum > 0
                                      ? costoBonifTotalNum / cantBonif : cppBActual;
                                    return (
                                      <div style={{ background: '#9a7ec415', border: '1px solid #9a7ec440',
                                        borderRadius: '10px', padding: '10px 12px', marginTop: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#9a7ec4' }}>
                                            <i className="bi bi-gift me-1" />{prodB.nombre}
                                          </span>
                                          <button onClick={() => {
                                            actualizarItem(item.idProducto, 'idProductoBonif', '');
                                            actualizarItem(item.idProducto, 'cantidadBonif', '0');
                                            actualizarItem(item.idProducto, 'costoBonifTotal', '');
                                          }}
                                            style={{ background: 'none', border: 'none', color: '#b06060', cursor: 'pointer', fontSize: '14px' }}>
                                            <i className="bi bi-x" />
                                          </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                          <div style={{ flex: 1 }}>
                                            <label style={{ ...lbl, marginBottom: '2px' }}>Cant. regalada</label>
                                            <input type="number" min="1" value={item.cantidadBonif ?? '1'}
                                              onChange={e => actualizarItem(item.idProducto, 'cantidadBonif', e.target.value)}
                                              style={{ ...inp, textAlign: 'center' }} />
                                          </div>
                                          <div style={{ flex: 2 }}>
                                            <label style={{ ...lbl, marginBottom: '2px', color: sinCpp ? '#d64545' : '#9a7ec4' }}>
                                              {sinCpp ? 'Costo total a distribuir (S/) *' : 'Costo total (o dejar en blanco = CPP)'}
                                            </label>
                                            <input type="number" step="0.01" min="0"
                                              value={item.costoBonifTotal ?? ''}
                                              onChange={e => actualizarItem(item.idProducto, 'costoBonifTotal', e.target.value)}
                                              placeholder={sinCpp ? 'Obligatorio: sin CPP previo' : 'Default: ' + (cppBActual * cantBonif).toFixed(2)}
                                              style={{ ...inp, borderColor: sinCpp && !item.costoBonifTotal ? '#d64545' : T.border }} />
                                          </div>
                                        </div>
                                        {/* Preview distribución */}
                                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#9a7ec4', fontWeight: 600 }}>
                                          Se distribuye S/ {(costoUnitBonif * cantBonif).toFixed(2)} al regalo
                                          ({cantBonif} und × S/ {costoUnitBonif.toFixed(4)}/und).
                                          Costo del producto pagado se reduce en ese monto.
                                        </div>
                                        {sinCpp && !item.costoBonifTotal && (
                                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#d64545', fontWeight: 600 }}>
                                            Producto sin CPP — debes ingresar el costo total del regalo.
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: T.textMuted, marginBottom: '6px' }}>
                <span>Subtotal ({detalle.length} items)</span><span>{fmt(subtotalCompra)}</span>
              </div>
              {percepcionNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: T.textMuted, marginBottom: '6px' }}>
                  <span>Percepcion</span><span>+{fmt(percepcionNum)}</span>
                </div>
              )}
              {descuentoNum > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d68c0d', marginBottom: '6px' }}>
                  <span><i className="bi bi-tag me-1" />Descuento global</span><span>-{fmt(descuentoNum)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '20px', color: T.textPrimary, borderTop: `1px solid ${T.border}`, paddingTop: '12px', marginBottom: '16px' }}>
                <span>TOTAL</span><span style={{ color: T.gold }}>{fmt(totalCompra)}</span>
              </div>
              <button onClick={handleGuardar} disabled={guardando || detalle.length === 0}
                style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none',
                  background: detalle.length === 0 ? T.bgMuted : `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`,
                  color: detalle.length === 0 ? T.textMuted : '#fff', fontWeight: 700, fontSize: '15px',
                  cursor: detalle.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {guardando ? <><span className="spinner-border spinner-border-sm" /> Registrando...</> : <><i className="bi bi-check-circle" /> Registrar compra</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VISTA HISTORIAL ══ */}
      {vistaActiva === 'lista' && (
        <>
          {/* Busqueda + filtro estado */}
          <div style={{ ...cardStyle, padding: '14px 20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '200px' }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                <input type="text" placeholder="Buscar por proveedor o N compra..."
                  value={busquedaHistorial} onChange={e => setBusquedaHistorial(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '36px' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {['todos', 'confirmado', 'anulado'].map(est => (
                  <button key={est} onClick={() => setFiltroEstado(est)}
                    style={{ padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                      border: filtroEstado === est ? 'none' : `1px solid ${T.border}`,
                      background: filtroEstado === est
                        ? (est === 'anulado' ? '#d64545' : est === 'confirmado' ? T.gold : T.textSecond)
                        : T.bgMuted,
                      color: filtroEstado === est ? '#fff' : T.textSecond }}>
                    {est === 'todos' ? 'Todas' : est.charAt(0).toUpperCase() + est.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            {comprasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: T.textMuted }}>
                <i className="bi bi-cart-x" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                No hay compras {filtroEstado !== 'todos' ? filtroEstado + 's' : 'registradas'}
              </div>
            ) : comprasFiltradas.map(c => {
              const ecfg = ESTADO_CFG[c.estado] ?? ESTADO_CFG.confirmado;
              const ajustesDeEsta = ajustes[c.idCompra] ?? [];
              return (
                <div key={c.idCompra}>
                  <div onClick={() => {
                      setExpandida(expandida === c.idCompra ? null : c.idCompra);
                      if (expandida !== c.idCompra) cargarAjustes(c.idCompra);
                    }}
                    style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
                      background: expandida === c.idCompra ? T.bgCardHover : 'transparent',
                      display: 'flex', alignItems: 'center', gap: '14px', transition: 'background 0.15s',
                      opacity: c.estado === 'anulado' ? 0.7 : 1 }}
                    onMouseEnter={e => { if (expandida !== c.idCompra) e.currentTarget.style.background = T.bgCardHover; }}
                    onMouseLeave={e => { if (expandida !== c.idCompra) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px',
                      background: ecfg.bg, border: `1px solid ${ecfg.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`bi ${ecfg.icon}`} style={{ color: ecfg.color, fontSize: '18px' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: T.textPrimary, fontSize: '14px' }}>
                        {c.proveedor?.empresa ?? '--'}
                        {c.estado === 'anulado' && (
                          <span style={{ marginLeft: '8px', background: '#d6454515', color: '#d64545',
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                            border: '1px solid #d6454530' }}>ANULADA</span>
                        )}
                      </div>
                      <small style={{ color: T.textMuted }}>
                        <i className="bi bi-calendar3 me-1" />{fmtFecha(c.fecha)}
                        {c.tipoComprobante && ` · ${c.tipoComprobante} ${c.serieComprobante ?? ''}`}
                        {ajustesDeEsta.length > 0 && (
                          <span style={{ marginLeft: '8px', color: '#d68c0d', fontWeight: 600 }}>
                            <i className="bi bi-pencil-square me-1" />{ajustesDeEsta.length} ajuste{ajustesDeEsta.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </small>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: T.textPrimary,
                        textDecoration: c.estado === 'anulado' ? 'line-through' : 'none' }}>
                        {fmt(c.total)}
                      </div>
                      <small style={{ color: T.textMuted }}>{c.detalles?.length ?? 0} productos</small>
                    </div>
                    <i className={`bi bi-chevron-${expandida === c.idCompra ? 'up' : 'down'}`}
                      style={{ color: T.textMuted, fontSize: '14px', flexShrink: 0 }} />
                  </div>

                  {/* Panel expandible */}
                  {expandida === c.idCompra && (
                    <div style={{ background: T.bgMuted, padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>

                      {/* Motivo anulacion si aplica */}
                      {c.estado === 'anulado' && c.motivo && (
                        <div style={{ background: '#d6454512', border: '1px solid #d6454530', borderRadius: '10px',
                          padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#d64545' }}>
                          <i className="bi bi-x-circle me-2" />
                          <strong>Motivo de anulacion:</strong> {c.motivo}
                        </div>
                      )}

                      {/* Tabla de detalle */}
                      <div style={{ background: T.bgCard, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${T.border}`, marginBottom: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: T.bgMuted }}>
                              {['Producto', 'SKU', 'Cantidad', 'Costo unit.', 'CPP anterior', 'Subtotal'].map((h, i) => (
                                <th key={h} style={{ padding: '9px 14px', color: T.textMuted, fontSize: '11px', fontWeight: 700,
                                  textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: `1px solid ${T.border}`,
                                  textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(!c.detalles || c.detalles.length === 0) ? (
                              <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: T.textMuted }}>Sin detalle</td></tr>
                            ) : c.detalles.map((d, i) => (
                              <tr key={i} onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: T.textPrimary, borderBottom: `1px solid ${T.border}` }}>{d.producto?.nombre}</td>
                                <td style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
                                  <span style={{ fontFamily: 'monospace', fontSize: '11px', background: T.bgMuted, color: T.textSecond, padding: '2px 6px', borderRadius: '4px' }}>{d.producto?.sku ?? '--'}</span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: `1px solid ${T.border}` }}>
                                  <span style={{ background: T.goldBg, color: T.gold, borderRadius: '6px', padding: '2px 10px', fontWeight: 700, fontSize: '12px' }}>{d.cantidad}</span>
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', color: T.textSecond, borderBottom: `1px solid ${T.border}` }}>{fmt(d.costoUnitario)}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', borderBottom: `1px solid ${T.border}` }}>
                                  {d.costoAnterior
                                    ? <span style={{ fontFamily: 'monospace', fontSize: '11px', color: T.textMuted }}>{fmt(d.costoAnterior)}</span>
                                    : <span style={{ color: T.textMuted }}>--</span>}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: T.textPrimary, borderBottom: `1px solid ${T.border}` }}>{fmt(d.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: T.bgMuted }}>
                              <td colSpan={5} style={{ padding: '10px 14px', fontWeight: 700, color: T.textSecond, textAlign: 'right' }}>TOTAL</td>
                              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: T.gold, fontSize: '15px' }}>{fmt(c.total)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Ajustes aplicados */}
                      {ajustesDeEsta.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#d68c0d',
                            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                            <i className="bi bi-pencil-square me-1" />Notas de ajuste aplicadas
                          </div>
                          {ajustesDeEsta.map(aj => (
                            <div key={aj.idAjuste} style={{ background: '#d68c0d0e', border: '1px solid #d68c0d30',
                              borderRadius: '8px', padding: '10px 14px', marginBottom: '6px', fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <span style={{ fontWeight: 700, color: '#d68c0d' }}>{aj.tipo}</span>
                                  <span style={{ color: T.textMuted, marginLeft: '8px' }}>{aj.producto?.nombre}</span>
                                </div>
                                <small style={{ color: T.textMuted }}>{fmtFecha(aj.fecha)}</small>
                              </div>
                              <div style={{ color: T.textSecond, marginTop: '4px' }}>{aj.motivo}</div>
                              {aj.costoAnterior && aj.cppResultante && (
                                <div style={{ color: T.textMuted, fontSize: '11px', marginTop: '4px' }}>
                                  CPP: {fmt(aj.costoAnterior)} → <strong style={{ color: '#d68c0d' }}>{fmt(aj.cppResultante)}</strong>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botones de accion */}
                      {c.estado === 'confirmado' && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => abrirAjuste(c)}
                            style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                              background: '#d68c0d15', border: '1px solid #d68c0d40', color: '#d68c0d',
                              display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="bi bi-pencil-square" /> Nota de ajuste (Plan B)
                          </button>
                          <button onClick={() => { setModalAnular(c.idCompra); setMotivoAnular(''); }}
                            style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                              background: '#d6454515', border: '1px solid #d6454540', color: '#d64545',
                              display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="bi bi-x-circle" /> Anular compra
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══ MODAL ANULAR ══ */}
      {modalAnular && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: T.bgCard, borderRadius: '20px', width: '100%', maxWidth: '440px',
            border: `1px solid ${T.border}`, boxShadow: T.shadowModal, overflow: 'hidden' }}>
            <div style={{ background: '#d6454518', padding: '18px 24px', borderBottom: `1px solid #d6454530`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h6 style={{ margin: 0, color: '#d64545', fontWeight: 700, fontSize: '15px' }}>
                <i className="bi bi-x-circle me-2" />Anular compra #{modalAnular}
              </h6>
              <button onClick={() => setModalAnular(null)}
                style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: '20px' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ background: '#d68c0d15', border: '1px solid #d68c0d30', borderRadius: '10px',
                padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#d68c0d' }}>
                <i className="bi bi-exclamation-triangle me-2" />
                <strong>Atencion:</strong> Al anular, el stock de todos los productos se reducira automaticamente y el CPP se revertira al valor anterior.
              </div>
              <label style={{ ...lbl, marginBottom: '8px' }}>Motivo de anulacion *</label>
              <textarea value={motivoAnular} onChange={e => setMotivoAnular(e.target.value)}
                rows={3} placeholder="Describe la razon de la anulacion..."
                style={{ ...inp, resize: 'none' }} />
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '10px', background: T.bgMuted }}>
              <button onClick={() => setModalAnular(null)}
                style={{ padding: '9px 20px', borderRadius: '10px', border: `1px solid ${T.border}`,
                  background: T.bgCard, color: T.textSecond, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAnular} disabled={!motivoAnular.trim() || anulandoId === modalAnular}
                style={{ padding: '9px 20px', borderRadius: '10px', border: 'none',
                  background: motivoAnular.trim() ? '#d64545' : T.bgMuted,
                  color: motivoAnular.trim() ? '#fff' : T.textMuted,
                  fontWeight: 700, fontSize: '14px',
                  cursor: motivoAnular.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px' }}>
                {anulandoId === modalAnular
                  ? <><span className="spinner-border spinner-border-sm" /> Anulando...</>
                  : <><i className="bi bi-x-circle" /> Confirmar anulacion</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL AJUSTE PLAN B ══ */}
      {modalAjuste && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: T.bgCard, borderRadius: '20px', width: '100%', maxWidth: '520px',
            border: `1px solid ${T.border}`, boxShadow: T.shadowModal, overflow: 'hidden',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#d68c0d15', padding: '18px 24px', borderBottom: `1px solid #d68c0d30`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <h6 style={{ margin: 0, color: '#d68c0d', fontWeight: 700, fontSize: '15px' }}>
                <i className="bi bi-pencil-square me-2" />Nota de ajuste — Compra #{modalAjuste.idCompra}
              </h6>
              <button onClick={() => setModalAjuste(null)}
                style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: '20px' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              {/* Info Plan B */}
              <div style={{ background: '#6a9ac415', border: '1px solid #6a9ac440', borderRadius: '10px',
                padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: '#6a9ac4' }}>
                <i className="bi bi-info-circle me-2" />
                <strong>Plan B:</strong> Esta nota NO modifica la compra original. Registra la correccion y actualiza el CPP del producto sobre el stock actual, preservando el historial de ventas pasadas.
              </div>

              {/* Tipo de ajuste */}
              <label style={lbl}>Tipo de ajuste</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {AJUSTE_TIPOS.map(t => (
                  <button key={t.value} onClick={() => setAjusteTipo(t.value)}
                    style={{ flex: '1 1 140px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                      border: ajusteTipo === t.value ? 'none' : `1px solid ${T.border}`,
                      background: ajusteTipo === t.value ? '#d68c0d' : T.bgMuted,
                      color: ajusteTipo === t.value ? '#fff' : T.textSecond,
                      fontWeight: 600, fontSize: '12px', textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span><i className={`bi ${t.icon} me-1`} />{t.label}</span>
                    <small style={{ fontSize: '10px', opacity: 0.8, fontWeight: 400 }}>{t.desc}</small>
                  </button>
                ))}
              </div>

              {/* Producto afectado */}
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Producto afectado</label>
                <select value={ajusteIdProducto} onChange={e => setAjusteIdProducto(e.target.value)} style={inp}>
                  <option value="">Seleccionar producto...</option>
                  {(modalAjuste.detalles ?? []).map(d => (
                    <option key={d.producto?.idProducto} value={d.producto?.idProducto}>
                      {d.producto?.nombre} — compraste {d.cantidad} und. a {fmt(d.costoUnitario)} c/u
                    </option>
                  ))}
                </select>
              </div>

              {/* Campos segun tipo */}
              {ajusteTipo === 'COSTO' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>Costo unitario correcto (S/)</label>
                  <input type="number" step="0.0001" min="0" value={ajusteCostoNuevo}
                    onChange={e => setAjusteCostoNuevo(e.target.value)}
                    placeholder="Ingresa el costo real por unidad"
                    style={inp} />
                  <small style={{ color: T.textMuted, fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    El CPP se recalculara ponderando el costo correcto contra el stock actual.
                  </small>
                </div>
              )}

              {(ajusteTipo === 'CANTIDAD' || ajusteTipo === 'DEVOLUCION') && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>
                    {ajusteTipo === 'DEVOLUCION' ? 'Unidades devueltas (negativo)' : 'Diferencia de unidades (+/-)'}
                  </label>
                  <input type="number" value={ajusteDelta} onChange={e => setAjusteDelta(e.target.value)}
                    placeholder={ajusteTipo === 'DEVOLUCION' ? 'Ej: -5' : 'Ej: -2 o +3'}
                    style={inp} />
                  <small style={{ color: T.textMuted, fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    {ajusteTipo === 'DEVOLUCION'
                      ? 'Ingresa un numero negativo. Ej: -5 si devolviste 5 unidades.'
                      : 'Diferencia entre factura y recepcion fisica. Negativo si recibisite menos.'}
                  </small>
                </div>
              )}

              {/* Motivo */}
              <div style={{ marginBottom: '4px' }}>
                <label style={lbl}>Motivo / descripcion *</label>
                <textarea value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)}
                  rows={3} placeholder="Describe con detalle la razon del ajuste..."
                  style={{ ...inp, resize: 'none' }} />
              </div>

              {errorAjuste && (
                <div style={{ background: '#b0606018', color: '#c07070', borderRadius: '8px',
                  padding: '8px 12px', marginTop: '10px', fontSize: '12px', border: '1px solid #b0606040' }}>
                  <i className="bi bi-exclamation-circle me-1" />{errorAjuste}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '10px',
              background: T.bgMuted, flexShrink: 0 }}>
              <button onClick={() => setModalAjuste(null)}
                style={{ padding: '9px 20px', borderRadius: '10px', border: `1px solid ${T.border}`,
                  background: T.bgCard, color: T.textSecond, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleGuardarAjuste} disabled={guardandoAjuste || !ajusteMotivo.trim()}
                style={{ padding: '9px 20px', borderRadius: '10px', border: 'none',
                  background: ajusteMotivo.trim() ? '#d68c0d' : T.bgMuted,
                  color: ajusteMotivo.trim() ? '#fff' : T.textMuted,
                  fontWeight: 700, fontSize: '14px',
                  cursor: ajusteMotivo.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px' }}>
                {guardandoAjuste
                  ? <><span className="spinner-border spinner-border-sm" /> Aplicando...</>
                  : <><i className="bi bi-check-lg" /> Aplicar ajuste</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══ Modal editar producto desde compras ══ */}
      {modalEditProd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: T.bgCard, borderRadius: '20px', width: '100%', maxWidth: '520px',
            border: '1px solid ' + T.border, boxShadow: T.shadowModal, overflow: 'hidden' }}>
            <div style={{ background: T.bgHeader, padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid ' + T.border }}>
              <h6 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                <i className="bi bi-pencil me-2" style={{ color: T.goldLight }} />
                Editar producto
              </h6>
              <button onClick={() => setModalEditProd(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px', color: '#fff', width: '32px', height: '32px',
                  cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {errorEditProd && (
                <div style={{ background: '#b0606018', color: '#c07070', borderRadius: '8px',
                  padding: '10px 14px', marginBottom: '16px', fontSize: '13px', border: '1px solid #b0606040' }}>
                  <i className="bi bi-exclamation-circle me-2" />{errorEditProd}
                </div>
              )}
              <div className="row g-3">
                <div className="col-8">
                  <label style={lbl}>Nombre *</label>
                  <input value={editProdForm.nombre ?? ''}
                    onChange={e => setEditProdForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Nombre del producto" style={inp} autoFocus />
                </div>
                <div className="col-4">
                  <label style={lbl}>SKU</label>
                  <input value={editProdForm.sku ?? ''}
                    onChange={e => setEditProdForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="ABR-001" style={inp} />
                </div>
                <div className="col-12">
                  <label style={lbl}>Categoria</label>
                  <select value={editProdForm.idCategoria ?? ''}
                    onChange={e => setEditProdForm(f => ({ ...f, idCategoria: e.target.value }))}
                    style={inp}>
                    <option value="">Sin cambiar</option>
                    {categorias.map(cat => (
                      <option key={cat.idCategoria} value={cat.idCategoria}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label style={lbl}>Precio venta al cliente (S/)</label>
                  <input type="number" step="0.01" min="0" value={editProdForm.precioVenta ?? ''}
                    onChange={e => setEditProdForm(f => ({ ...f, precioVenta: e.target.value }))}
                    placeholder="0.00" style={inp} />
                </div>
                <div className="col-6">
                  <label style={lbl}>Stock minimo (alerta)</label>
                  <input type="number" min="0" value={editProdForm.stockAlert ?? 5}
                    onChange={e => setEditProdForm(f => ({ ...f, stockAlert: e.target.value }))}
                    style={inp} />
                </div>
                <div className="col-12">
                  <label style={lbl}>Descripcion</label>
                  <textarea value={editProdForm.descripcion ?? ''}
                    onChange={e => setEditProdForm(f => ({ ...f, descripcion: e.target.value }))}
                    rows={2} placeholder="Descripcion opcional..."
                    style={{ ...inp, resize: 'none' }} />
                </div>
                {/* Info del CPP actual */}
                <div className="col-12">
                  <div style={{ background: T.bgMuted, borderRadius: '8px', padding: '10px 14px',
                    fontSize: '12px', color: T.textMuted, border: '1px solid ' + T.border }}>
                    <i className="bi bi-info-circle me-1" />
                    Stock actual: <strong style={{ color: T.textPrimary }}>{modalEditProd.stock}</strong>
                    {' '}· CPP vigente: <strong style={{ color: T.gold }}>{fmt(modalEditProd.cpp ?? modalEditProd.precioCosto)}</strong>
                    {' '}· El CPP se actualiza solo al registrar compras.
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid ' + T.border,
              display: 'flex', justifyContent: 'flex-end', gap: '10px', background: T.bgMuted }}>
              <button onClick={() => setModalEditProd(null)}
                style={{ padding: '9px 20px', borderRadius: '10px', border: '1px solid ' + T.border,
                  background: T.bgCard, color: T.textSecond, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleGuardarProd} disabled={guardandoProd}
                style={{ ...btnPrimary, opacity: guardandoProd ? 0.7 : 1 }}>
                {guardandoProd
                  ? <><span className="spinner-border spinner-border-sm" /> Guardando...</>
                  : <><i className="bi bi-check-lg" /> Guardar cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}