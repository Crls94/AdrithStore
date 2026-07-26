import { useState, useEffect, useRef } from 'react';
import { T, inputStyle, labelStyle, btnPrimary } from '../../theme';
import api from '../../api/axiosConfig';
import { crearProducto, actualizarProducto } from '../../api/productosApi';

const FORM_VACIO = {
  nombre: '', sku: '', stock: 0, precioCosto: '', precioVenta: '',
  stockAlert: 5, descripcion: '', imagenUrl: '', tipo: '', unidadMedida: 'UNIDAD',
  categoria: { idCategoria: '' },
  porcentajeCosto: '', comisionBase: '', comisionCada: '',
  cpp: 0, permiteStockNegativo: true,
};

const CAT_SERVICIOS = new Set(['SERVICIOS', 'IMPRESIONES', 'TRANSFERENCIA']);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const resolverImagen = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return BACKEND_URL + url;
};

// Modal de alta/edición de producto, compartido entre Productos.jsx (Inventario) y ventas.jsx (POS).
export default function FormProducto({ producto, categorias, onClose, onGuardado }) {
  const editando = producto?.idProducto ?? null;
  const [form,        setForm]        = useState(FORM_VACIO);
  const [guardando,   setGuardando]   = useState(false);
  const [error,       setError]       = useState('');
  const [subiendoImg, setSubiendoImg] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (producto) {
      setForm({ nombre: producto.nombre ?? '', sku: producto.sku ?? '', stock: producto.stock ?? 0,
        precioCosto: producto.precioCosto ?? '', precioVenta: producto.precioVenta ?? '',
        stockAlert: producto.stockAlert ?? 5, descripcion: producto.descripcion ?? '',
        imagenUrl: producto.imagenUrl ?? '', tipo: producto.tipo ?? '', unidadMedida: producto.unidadMedida ?? 'UNIDAD',
        categoria: { idCategoria: producto.categoria?.idCategoria ?? '' },
        porcentajeCosto: producto.porcentajeCosto ?? '', comisionBase: producto.comisionBase ?? '', comisionCada: producto.comisionCada ?? '',
        cpp: producto.cpp ?? 0, permiteStockNegativo: producto.permiteStockNegativo ?? true });
    } else {
      setForm(FORM_VACIO);
    }
    setError('');
  }, [producto]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'idCategoria') setForm(f => ({ ...f, categoria: { idCategoria: parseInt(value) } }));
    else setForm(f => ({ ...f, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setSubiendoImg(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      if (editando) fd.append('idProducto', String(editando));
      const res = await api.post('/uploads/imagen', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrl = res.data.url;
      setForm(f => ({ ...f, imagenUrl: newUrl }));
      if (editando) await api.patch('/productos/' + editando + '/imagen', { imagenUrl: newUrl }).catch(() => {});
    } catch { setError('Error al subir imagen.'); }
    finally { setSubiendoImg(false); }
  };

  const handleUrlImagen = async () => {
    const url = prompt('Pega la URL de la imagen:'); if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setSubiendoImg(true); setError('');
      try {
        const res = await api.post('/uploads/imagen-url', { url, idProducto: editando ?? null });
        setForm(f => ({ ...f, imagenUrl: res.data.url }));
      } catch {
        setError('No se pudo descargar la imagen desde esa URL. Probá con otra o subí un archivo desde tu dispositivo.');
      }
      finally { setSubiendoImg(false); }
    } else { setError('URL no válida.'); }
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim())         { setError('El nombre es obligatorio.'); return; }
    if (!form.categoria.idCategoria) { setError('Selecciona una categoria.'); return; }
    if (!form.precioVenta)           { setError('El precio de venta es obligatorio.'); return; }
    const esKg = form.unidadMedida === 'KG';
    if (!esKg && (!Number.isInteger(parseFloat(form.stock)) || !Number.isInteger(parseFloat(form.stockAlert)))) {
      setError('Este producto se vende por unidad: el stock no puede tener decimales.'); return;
    }
    setGuardando(true); setError('');
    try {
      const payload = { ...form, stock: (esKg ? parseFloat(form.stock) : parseInt(form.stock))||0,
        stockAlert: (esKg ? parseFloat(form.stockAlert) : parseInt(form.stockAlert))||0,
        precioCosto: parseFloat(form.precioCosto)||0, precioVenta: parseFloat(form.precioVenta),
        porcentajeCosto: form.porcentajeCosto ? parseFloat(form.porcentajeCosto) : null,
        comisionBase: form.comisionBase ? parseFloat(form.comisionBase) : null,
        comisionCada: form.comisionCada ? parseFloat(form.comisionCada) : null,
        imagenUrl: form.imagenUrl || null };
      if (editando) await actualizarProducto(editando, payload);
      else          await crearProducto(payload);
      onGuardado?.();
      onClose();
    } catch (e) {
      const msg = e.response?.data;
      setError(typeof msg === 'string' ? msg : 'Error al guardar. Verifica los datos ingresados.');
    }
    finally { setGuardando(false); }
  };

  const catSel = categorias.find(c => c.idCategoria == form.categoria.idCategoria)?.nombre;
  const esServicio = catSel === 'SERVICIOS' || catSel === 'IMPRESIONES' || catSel === 'TRANSFERENCIA';
  const esBienFisico = !esServicio && catSel;

  return (
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
          <button onClick={onClose}
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

          <div style={{ marginBottom:'16px' }}>
            <label style={labelStyle}>Imagen del producto</label>
            <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <div style={{ width:'80px', height:'80px', borderRadius:'10px', overflow:'hidden',
                background:T.bgMuted, border:`1px solid ${T.border}`, flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                {form.imagenUrl ? (
                  <img src={resolverImagen(form.imagenUrl)} alt="preview" loading="lazy"
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                ) : null}
                <i className="bi bi-image" style={{ fontSize:'28px', color:T.textMuted,
                  display: form.imagenUrl ? 'none' : 'flex' }} />
              </div>
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
              <select name="idCategoria" value={form.categoria.idCategoria} onChange={handleChange} style={inputStyle}
                disabled={editando && esServicio}>
                <option value="">Seleccionar...</option>
                {categorias
                  .filter(c => {
                    if (editando && esServicio) return c.nombre === catSel;
                    if (editando && !esServicio) return !CAT_SERVICIOS.has(c.nombre);
                    return true;
                  })
                  .map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
              </select>
            </div>
            {esBienFisico && (
              <div className="col-4">
                <label style={labelStyle}>Stock actual</label>
                <input name="stock" type="number" min="0" step={form.unidadMedida==='KG'?'0.001':'1'}
                  value={form.stock} onChange={handleChange} style={inputStyle} />
              </div>
            )}
            {esBienFisico && (
              <div className="col-4">
                <label style={labelStyle}>Se vende por</label>
                <select name="unidadMedida" value={form.unidadMedida} onChange={handleChange} style={inputStyle}>
                  <option value="UNIDAD">Unidad</option>
                  <option value="KG">Kilogramo</option>
                </select>
              </div>
            )}
            {catSel === 'SERVICIOS' || esBienFisico ? (
              <div className="col-4">
                <label style={labelStyle}>Costo (S/)</label>
                <input name="precioCosto" type="number" step="0.01" min="0" value={form.precioCosto} onChange={handleChange} placeholder="0.00" style={inputStyle} />
              </div>
            ) : null}
            <div className={esBienFisico ? 'col-4' : catSel === 'TRANSFERENCIA' ? 'col-4' : 'col-4'}>
              <label style={labelStyle}>Precio venta (S/) *</label>
              <input name="precioVenta" type="number" step="0.01" min="0" value={form.precioVenta} onChange={handleChange} placeholder="0.00" style={inputStyle} />
            </div>
            {catSel === 'IMPRESIONES' && (
              <div className="col-4">
                <label style={labelStyle}>% Costo sobre monto</label>
                <input name="porcentajeCosto" type="number" step="0.01" min="0" max="100" value={form.porcentajeCosto} onChange={handleChange} placeholder="75.00" style={inputStyle} />
              </div>
            )}
            {catSel === 'TRANSFERENCIA' && (
              <>
                <div className="col-4">
                  <label style={labelStyle}>Comision base (S/)</label>
                  <input name="comisionBase" type="number" step="0.01" min="0" value={form.comisionBase} onChange={handleChange} placeholder="1.00" style={inputStyle} />
                </div>
                <div className="col-4">
                  <label style={labelStyle}>Cada S/</label>
                  <input name="comisionCada" type="number" step="0.01" min="0" value={form.comisionCada} onChange={handleChange} placeholder="100.00" style={inputStyle} />
                </div>
              </>
            )}
            {form.precioCosto && form.precioVenta && parseFloat(form.precioCosto) > 0 && !esServicio && (
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
            {esBienFisico && (
              <div className="col-12">
                <label style={labelStyle}>Stock minimo (alerta)</label>
                <input name="stockAlert" type="number" min="0" step={form.unidadMedida==='KG'?'0.001':'1'}
                  value={form.stockAlert} onChange={handleChange} style={inputStyle} />
              </div>
            )}
            <div className="col-12">
              <label style={labelStyle}>Descripcion</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} rows={2}
                placeholder="Descripcion opcional..." style={{ ...inputStyle, resize:'none' }} />
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`,
          display:'flex', justifyContent:'flex-end', gap:'10px', background:T.bgMuted }}>
          <button onClick={onClose}
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
  );
}
