import { useState, useEffect, useRef } from 'react';
import { T, inputStyle, labelStyle, btnPrimary, cardStyle } from '../theme';
import api from '../api/axiosConfig';
import { getProductos, buscarProductos, crearProducto, actualizarProducto, eliminarProducto, getCategorias } from '../api/productosApi';

const FORM_VACIO = {
  nombre: '', sku: '', stock: 0, precioCosto: '', precioVenta: '',
  stockAlert: 5, descripcion: '', imagenUrl: '', categoria: { idCategoria: '' },
};

const ICONOS_CAT = {
  'Bebidas':'bi-cup-straw','Abarrotes':'bi-basket2','Lacteos':'bi-droplet-half',
  'Conservas':'bi-archive','Snacks':'bi-cookie','Higiene y limpieza':'bi-bucket',
  'Papel higienico':'bi-roll','Bazar':'bi-bag','Descartables':'bi-trash',
  'Farmacia':'bi-heart-pulse','Frescos':'bi-egg','Ferreteria y pinturas':'bi-tools',
  'Utiles de oficina':'bi-pen','Servicios':'bi-phone','Varios':'bi-box',
};
const COLORES_CAT = ['#0d8c6e','#6aad7e','#6a9ac4','#9a7ec4','#4aadad','#b06060','#ad8c4a','#4a7cad','#7aad6a','#c47a6a','#6aadc4','#ad6a9a'];
const iconoCat  = (n) => ICONOS_CAT[n] ?? 'bi-box-seam';
const colorCat  = (id) => COLORES_CAT[(id ?? 0) % COLORES_CAT.length];

// Resolver URL de imagen: local o externa
// Configurar aquí la IP/host del backend
const BACKEND_URL = 'http://192.168.18.28:8080';

const resolverImagen = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BACKEND_URL + url;
};

export default function Productos() {
  const [productos,    setProductos]    = useState([]);
  const [categorias,   setCategorias]   = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [busqueda,     setBusqueda]     = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');
  const [tabActiva,    setTabActiva]    = useState('todos');
  const [modalStock,   setModalStock]   = useState(null);
  const [stockDelta,   setStockDelta]   = useState('');
  const [stockMotivo,  setStockMotivo]  = useState('');
  const [ajustandoSt,  setAjustandoSt] = useState(false);
  const [subiendoImg,  setSubiendoImg]  = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { cargarDatos(); getCategorias().then(r => setCategorias(r.data)); }, []);

  const cargarDatos = () => {
    setCargando(true);
    getProductos().then(r => setProductos(r.data)).finally(() => setCargando(false));
  };

  const handleBuscar = (e) => {
    const val = e.target.value; setBusqueda(val);
    if (val.trim() === '') cargarDatos();
    else buscarProductos(val).then(r => setProductos(r.data));
  };

  const abrirCrear = () => { setEditando(null); setForm(FORM_VACIO); setError(''); setModalAbierto(true); };
  const abrirEditar = (p) => {
    setEditando(p.idProducto);
    setForm({ nombre: p.nombre ?? '', sku: p.sku ?? '', stock: p.stock ?? 0,
      precioCosto: p.precioCosto ?? '', precioVenta: p.precioVenta ?? '',
      stockAlert: p.stockAlert ?? 5, descripcion: p.descripcion ?? '',
      imagenUrl: p.imagenUrl ?? '', categoria: { idCategoria: p.categoria?.idCategoria ?? '' } });
    setError(''); setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); setEditando(null); setForm(FORM_VACIO); setError(''); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'idCategoria') setForm(f => ({ ...f, categoria: { idCategoria: parseInt(value) } }));
    else setForm(f => ({ ...f, [name]: value }));
  };

  // ── Upload de imagen ──────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setSubiendoImg(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      if (editando) fd.append('idProducto', String(editando));
      const res = await api.post('/uploads/imagen', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = res.data.url;
      setForm(f => ({ ...f, imagenUrl: newUrl }));
      // Si ya estamos editando un producto existente, actualizar imagen en BD inmediatamente
      if (editando) {
        await api.patch('/productos/' + editando + '/imagen', { imagenUrl: newUrl }).catch(() => {});
        setProductos(ps => ps.map(pr => pr.idProducto === editando ? { ...pr, imagenUrl: newUrl } : pr));
      }
    } catch { setError('Error al subir imagen.'); }
    finally { setSubiendoImg(false); }
  };

  const handleUrlImagen = async () => {
    const url = prompt('Pega la URL de la imagen:'); if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setSubiendoImg(true);
      try {
        const res = await api.post('/uploads/imagen-url', { url, idProducto: editando ?? null });
        setForm(f => ({ ...f, imagenUrl: res.data.url }));
      } catch { setForm(f => ({ ...f, imagenUrl: url })); } // fallback: usar URL directa
      finally { setSubiendoImg(false); }
    } else { setError('URL no válida.'); }
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim())         { setError('El nombre es obligatorio.'); return; }
    if (!form.categoria.idCategoria) { setError('Selecciona una categoria.'); return; }
    if (!form.precioVenta)           { setError('El precio de venta es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const payload = { ...form, stock: parseInt(form.stock)||0,
        stockAlert: parseInt(form.stockAlert)||0,
        precioCosto: parseFloat(form.precioCosto)||0, precioVenta: parseFloat(form.precioVenta),
        imagenUrl: form.imagenUrl || null };
      if (editando) await actualizarProducto(editando, payload);
      else          await crearProducto(payload);
      cargarDatos(); cerrarModal();
    } catch { setError('Error al guardar. Verifica que el SKU no este repetido.'); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`Eliminar "${nombre}"?`)) return;
    try { await eliminarProducto(id); cargarDatos(); }
    catch { alert('No se puede eliminar: tiene ventas o compras asociadas.'); }
  };

  const handleAjusteStock = async () => {
    if (!stockDelta || parseInt(stockDelta) === 0) { setError('El delta no puede ser 0.'); return; }
    if (!stockMotivo.trim()) { setError('El motivo es obligatorio.'); return; }
    setAjustandoSt(true); setError('');
    try {
      await api.patch('/productos/' + modalStock.idProducto + '/ajuste-stock', { delta: parseInt(stockDelta), motivo: stockMotivo.trim() });
      cargarDatos(); setModalStock(null); setStockDelta(''); setStockMotivo('');
    } catch (e) { setError(e.response?.data ?? 'Error al ajustar stock.'); }
    finally { setAjustandoSt(false); }
  };

  const stockEstado = (p) => {
    if (p.stock < 0)  return { color: '#b02020', bg: '#b0202015', borde: '#b0202040' };
    if (p.stock === 0) return { color: '#b06060', bg: '#b0606022', borde: '#b0606040' };
    if (p.stockAlert && p.stock <= p.stockAlert) return { color: '#d68c0d', bg: '#d68c0d22', borde: '#d68c0d40' };
    return { color: '#0d8c6e', bg: '#0d8c6e22', borde: '#0d8c6e30' };
  };

  const margen = (p) => {
    const c = parseFloat(p.precioCosto||0), v = parseFloat(p.precioVenta||0);
    if (c<=0||v<=0) return null;
    return (((v-c)/v)*100).toFixed(0);
  };

  const prodsFiltradosFinal = (() => {
    let list = productos;
    if (tabActiva === 'bajo')     list = list.filter(p => p.stockAlert && p.stock >= 0 && p.stock <= p.stockAlert);
    if (tabActiva === 'negativo') list = list.filter(p => p.stock < 0);
    if (busqueda.trim())          list = list.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(busqueda.toLowerCase()));
    return list;
  })();

  const cntBajo     = productos.filter(p => p.stockAlert && p.stock >= 0 && p.stock <= p.stockAlert).length;
  const cntNegativo = productos.filter(p => p.stock < 0).length;

  if (cargando) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'300px' }}>
      <div className="spinner-border" style={{ color: T.gold }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h5 className="m-0 font-bold text-lg" style={{ color:T.textPrimary }}>Inventario</h5>
          <small style={{ color:T.textMuted }}>{productos.length} productos</small>
        </div>
        <button onClick={abrirCrear} style={{ ...btnPrimary }}
          onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`}
          onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`}>
          <i className="bi bi-plus-lg" /> Nuevo producto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { key:'todos',    label:'Todos',          count: productos.length, col: T.gold },
          { key:'bajo',     label:'Stock bajo',     count: cntBajo,          col: '#d68c0d' },
          { key:'negativo', label:'Stock negativo', count: cntNegativo,      col: '#b02020' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setTabActiva(tab.key)}
            style={{ padding:'6px 16px', borderRadius:'999px', fontSize:'12px', fontWeight:600,
              cursor:'pointer', border:'none',
              background: tabActiva===tab.key ? tab.col : T.bgMuted,
              color: tabActiva===tab.key ? '#fff' : T.textSecond }}>
            {tab.label}
            <span style={{ marginLeft:'6px', background: tabActiva===tab.key ? 'rgba(255,255,255,0.25)' : T.border,
              padding:'1px 7px', borderRadius:'999px', fontSize:'11px' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Busqueda */}
      <div className="rounded-2xl px-5 py-3.5 mb-3" style={cardStyle}>
        <div className="relative max-w-sm">
          <i className="bi bi-search" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:T.textMuted }} />
          <input type="text" placeholder="Buscar por nombre o SKU..."
            value={busqueda} onChange={handleBuscar} style={{ ...inputStyle, paddingLeft:'36px' }} />
          {busqueda && (
            <button onClick={() => { setBusqueda(''); cargarDatos(); }}
              style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:'18px' }}>
              <i className="bi bi-x" />
            </button>
          )}
        </div>
      </div>

      {/* GRID de tarjetas */}
      {prodsFiltradosFinal.length === 0 ? (
        <div style={{ ...cardStyle, textAlign:'center', padding:'48px', color:T.textMuted }}>
          <i className="bi bi-box-seam" style={{ fontSize:'32px', display:'block', marginBottom:'8px' }} />
          {tabActiva === 'negativo' ? 'Sin stock negativo' : tabActiva === 'bajo' ? 'Sin alertas de stock' : 'Sin productos'}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' }}>
          {prodsFiltradosFinal.map(p => {
            const st   = stockEstado(p);
            const mg   = margen(p);
            const col  = colorCat(p.categoria?.idCategoria);
            const img  = resolverImagen(p.imagenUrl);
            return (
              <div key={p.idProducto} style={{ background:T.bgCard, borderRadius:T.radiusLg,
                border:`1px solid ${T.border}`, boxShadow:T.shadow, overflow:'hidden',
                display:'flex', flexDirection:'column', transition:'box-shadow 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = T.shadowHover}
                onMouseLeave={e => e.currentTarget.style.boxShadow = T.shadow}>

                {/* Imagen / placeholder */}
                <div style={{ height:'130px', background: img ? 'transparent' : col+'22',
                  position:'relative', overflow:'hidden', flexShrink:0 }}>
                  {img ? (
                    <img src={img} alt={p.nombre} loading="lazy"
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                  ) : null}
                  {/* Fallback icono */}
                  <div style={{ display: img ? 'none' : 'flex', position:'absolute', inset:0,
                    alignItems:'center', justifyContent:'center' }}>
                    <i className={`bi ${iconoCat(p.categoria?.nombre)}`} style={{ fontSize:'36px', color:col }} />
                  </div>
                  {/* Badge stock */}
                  <div style={{ position:'absolute', top:'8px', right:'8px',
                    background:st.bg, border:`1px solid ${st.borde}`,
                    borderRadius:'999px', padding:'2px 10px',
                    fontSize:'11px', fontWeight:800, color:st.color }}>
                    {p.stock < 0 ? '⊖' : ''}{p.stock}
                  </div>
                  {/* Badge categoria */}
                  <div style={{ position:'absolute', top:'8px', left:'8px',
                    background: col+'dd', borderRadius:'6px', padding:'2px 8px',
                    fontSize:'10px', fontWeight:700, color:'#fff', maxWidth:'100px',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {p.categoria?.nombre ?? '—'}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding:'10px 12px', flex:1, display:'flex', flexDirection:'column' }}>
                  {p.sku && (
                    <span style={{ fontFamily:'monospace', fontSize:'10px', color:T.textMuted,
                      marginBottom:'3px', display:'block' }}>{p.sku}</span>
                  )}
                  <div style={{ fontWeight:700, fontSize:'13px', color:T.textPrimary,
                    lineHeight:'1.3', marginBottom:'6px',
                    display:'-webkit-box', WebkitLineClamp:2,
                    WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {p.nombre}
                  </div>

                  {/* Precio + margen */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                    <span style={{ fontSize:'16px', fontWeight:800, color:col }}>
                      S/ {parseFloat(p.precioVenta??0).toFixed(2)}
                    </span>
                    {mg !== null && (
                      <span style={{ fontSize:'11px', fontWeight:700,
                        background: parseInt(mg)>=20 ? '#0d8c6e18' : '#d68c0d18',
                        color:       parseInt(mg)>=20 ? '#0d8c6e'   : '#d68c0d',
                        padding:'2px 7px', borderRadius:'999px' }}>
                        {mg}% mg
                      </span>
                    )}
                  </div>

                  {/* Costo CPP */}
                  <div style={{ fontSize:'11px', color:T.textMuted, marginBottom:'8px' }}>
                    CPP: S/ {parseFloat(p.cpp ?? p.precioCosto ?? 0).toFixed(2)}
                    {p.stockAlert && p.stock <= p.stockAlert && p.stock >= 0 && (
                      <span style={{ marginLeft:'6px', color:'#d68c0d' }}>
                        <i className="bi bi-exclamation-triangle-fill" /> min {p.stockAlert}
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:'flex', gap:'6px', marginTop:'auto' }}>
                    <button onClick={() => abrirEditar(p)} title="Editar"
                      style={{ flex:1, padding:'6px', borderRadius:'8px', border:`1px solid ${T.goldBorder}`,
                        background:T.goldBg, color:T.gold, cursor:'pointer', fontSize:'13px', fontWeight:600 }}>
                      <i className="bi bi-pencil me-1" />Editar
                    </button>
                    <button onClick={e => { e.stopPropagation(); setModalStock(p); setStockDelta(''); setStockMotivo(''); setError(''); }}
                      title="Ajustar stock"
                      style={{ padding:'6px 9px', borderRadius:'8px', border:`1px solid ${T.border}`,
                        background:T.bgMuted, color:T.textSecond, cursor:'pointer', fontSize:'13px' }}>
                      <i className="bi bi-arrow-left-right" />
                    </button>
                    <button onClick={() => handleEliminar(p.idProducto, p.nombre)} title="Eliminar"
                      style={{ padding:'6px 9px', borderRadius:'8px', border:'1px solid #b0606040',
                        background:'#b0606018', color:'#b06060', cursor:'pointer', fontSize:'13px' }}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalAbierto && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:2000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:T.bgCard, borderRadius:'20px', width:'100%', maxWidth:'560px',
            border:`1px solid ${T.border}`, boxShadow:T.shadowModal, overflow:'hidden' }}>
            <div style={{ background:T.bgHeader, padding:'18px 24px',
              display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${T.border}` }}>
              <h6 style={{ margin:0, color:'#fff', fontWeight:700, fontSize:'15px' }}>
                <i className={`bi ${editando ? 'bi-pencil' : 'bi-plus-circle'} me-2`} style={{ color:T.goldLight }} />
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h6>
              <button onClick={cerrarModal}
                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
                  borderRadius:'8px', color:'#fff', width:'32px', height:'32px', cursor:'pointer',
                  fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ padding:'24px', maxHeight:'75vh', overflowY:'auto' }}>
              {error && (
                <div style={{ background:'#b0606018', color:'#c07070', borderRadius:'8px',
                  padding:'10px 14px', marginBottom:'16px', fontSize:'13px', border:'1px solid #b0606040' }}>
                  <i className="bi bi-exclamation-circle me-2" />{error}
                </div>
              )}

              {/* Imagen del producto */}
              <div style={{ marginBottom:'16px' }}>
                <label style={labelStyle}>Imagen del producto</label>
                <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                  {/* Preview */}
                  <div style={{ width:'80px', height:'80px', borderRadius:'10px', overflow:'hidden',
                    background:T.bgMuted, border:`1px solid ${T.border}`, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {form.imagenUrl ? (
                      <img src={resolverImagen(form.imagenUrl)} alt="preview" loading="lazy"
                        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      <i className="bi bi-image" style={{ fontSize:'28px', color:T.textMuted }} />
                    )}
                  </div>
                  {/* Botones de carga */}
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'6px' }}>
                    <input type="file" accept="image/*" ref={fileRef} style={{ display:'none' }}
                      onChange={handleFileChange} />
                    <button onClick={() => fileRef.current.click()} disabled={subiendoImg}
                      style={{ padding:'7px 12px', borderRadius:'8px', border:`1px solid ${T.border}`,
                        background:T.bgMuted, color:T.textSecond, cursor:'pointer', fontSize:'12px',
                        fontWeight:600, display:'flex', alignItems:'center', gap:'6px' }}>
                      {subiendoImg
                        ? <><span className="spinner-border spinner-border-sm" /> Procesando...</>
                        : <><i className="bi bi-upload" /> Subir desde dispositivo</>}
                    </button>
                    <button onClick={handleUrlImagen} disabled={subiendoImg}
                      style={{ padding:'7px 12px', borderRadius:'8px', border:`1px solid ${T.border}`,
                        background:T.bgMuted, color:T.textSecond, cursor:'pointer', fontSize:'12px',
                        fontWeight:600, display:'flex', alignItems:'center', gap:'6px' }}>
                      <i className="bi bi-link-45deg" /> Pegar URL de imagen
                    </button>
                    {form.imagenUrl && (
                      <button onClick={() => setForm(f => ({ ...f, imagenUrl: '' }))}
                        style={{ padding:'4px', background:'none', border:'none',
                          color:'#b06060', cursor:'pointer', fontSize:'12px' }}>
                        <i className="bi bi-trash me-1" />Quitar imagen
                      </button>
                    )}
                    <small style={{ color:T.textMuted, fontSize:'10px' }}>
                      Se optimiza automaticamente a HD (max 300 KB)
                    </small>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-8">
                  <label style={labelStyle}>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Ej: Arroz Costeno 5kg" style={inputStyle} autoFocus />
                </div>
                <div className="col-4">
                  <label style={labelStyle}>SKU</label>
                  <input name="sku" value={form.sku} onChange={handleChange} placeholder="ABR-001" style={inputStyle} />
                </div>
                <div className="col-12">
                  <label style={labelStyle}>Categoria *</label>
                  <select name="idCategoria" value={form.categoria.idCategoria} onChange={handleChange} style={inputStyle}>
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="col-4">
                  <label style={labelStyle}>Stock actual</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} style={inputStyle} />
                </div>
                <div className="col-4">
                  <label style={labelStyle}>Costo (S/)</label>
                  <input name="precioCosto" type="number" step="0.01" min="0" value={form.precioCosto} onChange={handleChange} placeholder="0.00" style={inputStyle} />
                </div>
                <div className="col-4">
                  <label style={labelStyle}>Precio venta (S/) *</label>
                  <input name="precioVenta" type="number" step="0.01" min="0" value={form.precioVenta} onChange={handleChange} placeholder="0.00" style={inputStyle} />
                </div>
                {form.precioCosto && form.precioVenta && parseFloat(form.precioCosto) > 0 && (
                  <div className="col-12">
                    <div style={{ background:T.bgMuted, borderRadius:'10px', padding:'10px 14px',
                      border:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:'12px', color:T.textMuted }}>Margen estimado:</span>
                      <span style={{ fontWeight:700, fontSize:'14px',
                        color: (((parseFloat(form.precioVenta)-parseFloat(form.precioCosto))/parseFloat(form.precioVenta))*100) >= 20 ? T.gold : '#d68c0d' }}>
                        {((( parseFloat(form.precioVenta)-parseFloat(form.precioCosto))/parseFloat(form.precioVenta))*100).toFixed(1)}%
                        · S/ {(parseFloat(form.precioVenta)-parseFloat(form.precioCosto)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="col-12">
                  <label style={labelStyle}>Stock minimo (alerta)</label>
                  <input name="stockAlert" type="number" min="0" value={form.stockAlert} onChange={handleChange} style={inputStyle} />
                </div>
                <div className="col-12">
                  <label style={labelStyle}>Descripcion</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                    placeholder="Descripcion opcional..." style={{ ...inputStyle, resize:'none' }} />
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`,
              display:'flex', justifyContent:'flex-end', gap:'10px', background:T.bgMuted }}>
              <button onClick={cerrarModal}
                style={{ padding:'9px 20px', borderRadius:'10px', border:`1px solid ${T.border}`,
                  background:T.bgCard, color:T.textSecond, fontWeight:600, fontSize:'14px', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={guardando} style={{ ...btnPrimary, opacity:guardando?0.7:1 }}>
                {guardando ? <><span className="spinner-border spinner-border-sm" /> Guardando...</> : <><i className="bi bi-check-lg" /> {editando?'Actualizar':'Guardar'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajuste stock */}
      {modalStock && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:2000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:T.bgCard, borderRadius:'20px', width:'100%', maxWidth:'420px',
            border:`1px solid ${T.border}`, boxShadow:T.shadowModal, overflow:'hidden' }}>
            <div style={{ background:T.bgHeader, padding:'18px 24px',
              display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${T.border}` }}>
              <h6 style={{ margin:0, color:'#fff', fontWeight:700, fontSize:'15px' }}>
                <i className="bi bi-arrow-left-right me-2" style={{ color:T.goldLight }} />
                Ajuste manual de stock
              </h6>
              <button onClick={() => { setModalStock(null); setError(''); }}
                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
                  borderRadius:'8px', color:'#fff', width:'32px', height:'32px', cursor:'pointer',
                  fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ padding:'24px' }}>
              <div style={{ background:T.bgMuted, borderRadius:'10px', padding:'12px 14px', marginBottom:'16px' }}>
                <div style={{ fontWeight:700, color:T.textPrimary }}>{modalStock.nombre}</div>
                <div style={{ fontSize:'12px', color:T.textMuted, marginTop:'3px' }}>
                  Stock actual: <strong style={{ color:modalStock.stock<0?'#b02020':T.textPrimary }}>{modalStock.stock}</strong>
                  {modalStock.stockAlert && <span style={{ marginLeft:'8px' }}>· Alerta: {modalStock.stockAlert}</span>}
                </div>
              </div>
              {error && (
                <div style={{ background:'#b0606018', color:'#c07070', borderRadius:'8px',
                  padding:'8px 12px', marginBottom:'12px', fontSize:'13px', border:'1px solid #b0606040' }}>
                  <i className="bi bi-exclamation-circle me-1" />{error}
                </div>
              )}
              <div style={{ marginBottom:'14px' }}>
                <label style={labelStyle}>Cantidad a ajustar (+/-)</label>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <input type="number" value={stockDelta} onChange={e => setStockDelta(e.target.value)} placeholder="Ej: +5 o -3"
                    style={{ ...inputStyle, textAlign:'center', color: parseInt(stockDelta)<0?'#b06060':parseInt(stockDelta)>0?'#0d8c6e':T.textPrimary }} />
                  {stockDelta && parseInt(stockDelta)!==0 && (
                    <div style={{ flexShrink:0, fontSize:'13px', fontWeight:700, color:'#0d8c6e',
                      background:'#0d8c6e15', padding:'6px 12px', borderRadius:'8px', whiteSpace:'nowrap' }}>
                      {modalStock.stock} &rarr; {modalStock.stock+(parseInt(stockDelta)||0)}
                    </div>
                  )}
                </div>
                <small style={{ color:T.textMuted, fontSize:'11px', marginTop:'4px', display:'block' }}>
                  Positivo para sumar, negativo para restar. Registrado en log de eventos.
                </small>
              </div>
              <div>
                <label style={labelStyle}>Motivo *</label>
                <textarea value={stockMotivo} onChange={e => setStockMotivo(e.target.value)} rows={3}
                  placeholder="Ej: Conteo fisico, merma, robo..." style={{ ...inputStyle, resize:'none' }} />
              </div>
            </div>
            <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`,
              display:'flex', justifyContent:'flex-end', gap:'10px', background:T.bgMuted }}>
              <button onClick={() => { setModalStock(null); setError(''); }}
                style={{ padding:'9px 20px', borderRadius:'10px', border:`1px solid ${T.border}`,
                  background:T.bgCard, color:T.textSecond, fontWeight:600, fontSize:'14px', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAjusteStock}
                disabled={ajustandoSt||!stockDelta||parseInt(stockDelta)===0||!stockMotivo.trim()}
                style={{ ...btnPrimary, opacity:(ajustandoSt||!stockDelta||parseInt(stockDelta)===0||!stockMotivo.trim())?0.6:1 }}>
                {ajustandoSt ? <><span className="spinner-border spinner-border-sm" /> Ajustando...</> : <><i className="bi bi-check-lg" /> Aplicar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}