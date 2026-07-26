import { useState, useEffect } from 'react';
import { T, inputStyle, labelStyle, btnPrimary, cardStyle } from '../theme';
import api from '../api/axiosConfig';
import { getProductos, buscarProductos, eliminarProducto, getCategorias } from '../api/productosApi';
import { useIsMobile } from '../hooks/useIsMobile';
import FormProducto from '../components/forms/FormProducto';

const ICONOS_CAT = {
  'Bebidas':'bi-cup-straw','Abarrotes':'bi-basket2','Lacteos':'bi-droplet-half',
  'Conservas':'bi-archive','Snacks':'bi-cookie','Higiene y limpieza':'bi-bucket',
  'Papel higienico':'bi-roll','Bazar':'bi-bag','Descartables':'bi-trash',
  'Farmacia':'bi-heart-pulse','Frescos':'bi-egg','Ferreteria y pinturas':'bi-tools',
  'Utiles de oficina':'bi-pen','Servicios':'bi-phone','SERVICIOS':'bi-gear','IMPRESIONES':'bi-printer','TRANSFERENCIA':'bi-phone','Varios':'bi-box',
};
const COLORES_CAT = ['#0d8c6e','#6aad7e','#6a9ac4','#9a7ec4','#4aadad','#b06060','#ad8c4a','#4a7cad','#7aad6a','#c47a6a','#6aadc4','#ad6a9a'];
const iconoCat  = (n) => ICONOS_CAT[n] ?? 'bi-box-seam';
const colorCat  = (id) => COLORES_CAT[(id ?? 0) % COLORES_CAT.length];



const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const resolverImagen = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BACKEND_URL + url;
};

export default function Productos() {
  const isMobile = useIsMobile();
  const [productos,    setProductos]    = useState([]);
  const [categorias,   setCategorias]   = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [busqueda,     setBusqueda]     = useState('');
  const [modalProductoAbierto, setModalProductoAbierto] = useState(false);
  const [productoEditando,     setProductoEditando]     = useState(null);
  const [error,        setError]        = useState('');
  const [tabActiva,    setTabActiva]    = useState('todos');
  const [modalStock,   setModalStock]   = useState(null);
  const [stockDelta,   setStockDelta]   = useState('');
  const [stockMotivo,  setStockMotivo]  = useState('');
  const [ajustandoSt,  setAjustandoSt] = useState(false);

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

  const abrirCrear  = () => { setProductoEditando(null); setModalProductoAbierto(true); };
  const abrirEditar = (p) => { setProductoEditando(p); setModalProductoAbierto(true); };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`Eliminar "${nombre}"?`)) return;
    try { await eliminarProducto(id); cargarDatos(); }
    catch { alert('No se puede eliminar: tiene ventas o compras asociadas.'); }
  };

  const deltaMili = (val) => Math.round((parseFloat(val) || 0) * 1000);

  const handleAjusteStock = async () => {
    if (!stockDelta || deltaMili(stockDelta) === 0) { setError('El delta no puede ser 0.'); return; }
    if (!stockMotivo.trim()) { setError('El motivo es obligatorio.'); return; }
    setAjustandoSt(true); setError('');
    try {
      await api.patch('/productos/' + modalStock.idProducto + '/ajuste-stock', { delta: parseFloat(stockDelta), motivo: stockMotivo.trim() });
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
      { }
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

      { }
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

      { }
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

      { }
      {prodsFiltradosFinal.length === 0 ? (
        <div style={{ ...cardStyle, textAlign:'center', padding:'48px', color:T.textMuted }}>
          <i className="bi bi-box-seam" style={{ fontSize:'32px', display:'block', marginBottom:'8px' }} />
          {tabActiva === 'negativo' ? 'Sin stock negativo' : tabActiva === 'bajo' ? 'Sin alertas de stock' : 'Sin productos'}
        </div>
      ) : (
        <div style={{ display:'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))',
          gap:'12px' }}>
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

                { }
                <div style={{ height:'130px', background: img ? 'transparent' : col+'22',
                  position:'relative', overflow:'hidden', flexShrink:0 }}>
                  {img ? (
                    <img src={img} alt={p.nombre} loading="lazy"
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                  ) : null}
                  { }
                  <div style={{ display: img ? 'none' : 'flex', position:'absolute', inset:0,
                    alignItems:'center', justifyContent:'center' }}>
                    <i className={`bi ${iconoCat(p.categoria?.nombre)}`} style={{ fontSize:'36px', color:col }} />
                  </div>
                  { }
                  <div style={{ position:'absolute', top:'8px', right:'8px',
                    background:st.bg, border:`1px solid ${st.borde}`,
                    borderRadius:'999px', padding:'2px 10px',
                    fontSize:'11px', fontWeight:800, color:st.color }}>
                    {p.stock < 0 ? '⊖' : ''}{p.stock}{p.unidadMedida==='KG' ? ' kg' : ''}
                  </div>
                  { }
                  <div style={{ position:'absolute', top:'8px', left:'8px',
                    background: col+'dd', borderRadius:'6px', padding:'2px 8px',
                    fontSize:'10px', fontWeight:700, color:'#fff', maxWidth:'100px',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {p.categoria?.nombre ?? '—'}
                  </div>
                </div>

                { }
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

                  { }
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

                  { }
                  <div style={{ fontSize:'11px', color:T.textMuted, marginBottom:'8px' }}>
                    CPP: S/ {(parseFloat(p.cpp) > 0 ? parseFloat(p.cpp) : parseFloat(p.precioCosto || 0)).toFixed(2)}
                    {p.stockAlert && p.stock <= p.stockAlert && p.stock >= 0 && (
                      <span style={{ marginLeft:'6px', color:'#d68c0d' }}>
                        <i className="bi bi-exclamation-triangle-fill" /> min {p.stockAlert}
                      </span>
                    )}
                  </div>

                  { }
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

      { }
      {modalProductoAbierto && (
        <FormProducto
          producto={productoEditando}
          categorias={categorias}
          onClose={() => setModalProductoAbierto(false)}
          onGuardado={cargarDatos}
        />
      )}

      { }
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
                  <input type="number" value={stockDelta} onChange={e => setStockDelta(e.target.value)}
                    step={modalStock.unidadMedida==='KG'?'0.001':'1'}
                    placeholder={modalStock.unidadMedida==='KG'?'Ej: +0.5 o -1.25':'Ej: +5 o -3'}
                    style={{ ...inputStyle, textAlign:'center', color: parseFloat(stockDelta)<0?'#b06060':parseFloat(stockDelta)>0?'#0d8c6e':T.textPrimary }} />
                  {stockDelta && deltaMili(stockDelta)!==0 && (
                    <div style={{ flexShrink:0, fontSize:'13px', fontWeight:700, color:'#0d8c6e',
                      background:'#0d8c6e15', padding:'6px 12px', borderRadius:'8px', whiteSpace:'nowrap' }}>
                      {modalStock.stock} &rarr; {(parseFloat(modalStock.stock)+(parseFloat(stockDelta)||0)).toFixed(modalStock.unidadMedida==='KG'?3:0)}
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
                disabled={ajustandoSt||!stockDelta||deltaMili(stockDelta)===0||!stockMotivo.trim()}
                style={{ ...btnPrimary, opacity:(ajustandoSt||!stockDelta||deltaMili(stockDelta)===0||!stockMotivo.trim())?0.6:1 }}>
                {ajustandoSt ? <><span className="spinner-border spinner-border-sm" /> Ajustando...</> : <><i className="bi bi-check-lg" /> Aplicar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}