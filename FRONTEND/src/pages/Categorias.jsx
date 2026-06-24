import { useState, useEffect } from 'react';
import { T, inputStyle, labelStyle, btnPrimary, cardStyle } from '../theme';
import { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria } from '../api/productosApi';

const FORM_VACIO = { nombre: '', descripcion: '' };

const ICONOS = {
  'Abarrotes':'bi-basket2','Bebidas':'bi-cup-straw','Lácteos':'bi-droplet-half',
  'Snacks':'bi-cookie','Limpieza':'bi-bucket','Carnes':'bi-egg-fried',
  'Panadería':'bi-shop','Higiene':'bi-heart-pulse','Frescos':'bi-egg',
  'Farmacia':'bi-heart-pulse','Conservas':'bi-archive','Bazar':'bi-bag',
  'Papel':'bi-roll','Descartables':'bi-trash','Ferretería':'bi-tools',
  'Útiles':'bi-pen','Servicios':'bi-phone','Varios':'bi-box',
};
const PALETA = ['#0D5E4F','#6aad7e','#6a9ac4','#9a7ec4','#4aadad','#b06060','#ad8c4a','#4a7cad'];
const iconoCat = (n) => ICONOS[n] ?? 'bi-tag';
const colorCat = (id) => PALETA[(id ?? 0) % PALETA.length];

export default function Categorias() {
  const [cats,         setCats]         = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => { cargarDatos(); }, []);
  const cargarDatos  = () => { setCargando(true); getCategorias().then(r => setCats(r.data)).finally(() => setCargando(false)); };
  const abrirCrear   = () => { setEditando(null); setForm(FORM_VACIO); setError(''); setModalAbierto(true); };
  const abrirEditar  = (c) => { setEditando(c.idCategoria); setForm({ nombre:c.nombre??'', descripcion:c.descripcion??'' }); setError(''); setModalAbierto(true); };
  const cerrarModal  = () => { setModalAbierto(false); setEditando(null); setForm(FORM_VACIO); setError(''); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      if (editando) await actualizarCategoria(editando, form);
      else          await crearCategoria(form);
      cargarDatos(); cerrarModal();
    } catch { setError('Error al guardar. El nombre podría estar repetido.'); }
    finally  { setGuardando(false); }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?\nLos productos asociados quedarán sin categoría.`)) return;
    try { await eliminarCategoria(id); cargarDatos(); }
    catch { alert('No se puede eliminar: tiene productos asociados.'); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="m-0 font-bold text-lg" style={{ color: T.textPrimary }}>Categorías</h5>
          <small style={{ color: T.textMuted }}>
            {cats.length} categoría{cats.length !== 1 ? 's' : ''} registrada{cats.length !== 1 ? 's' : ''}
          </small>
        </div>
        <button onClick={abrirCrear} style={btnPrimary}>
          <i className="bi bi-plus-lg" /> Nueva categoría
        </button>
      </div>

      {cargando ? (
        <div className="flex justify-center p-16">
          <div className="spinner-border" style={{ color: T.gold }} />
        </div>
      ) : (
        <>
          {/* Grid de tarjetas */}
          <div className="grid gap-3 mb-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
            {cats.length === 0 ? (
              <div className="col-span-full text-center p-12 rounded-2xl"
                style={{ background: T.bgCard, border: `1px solid ${T.border}`, color: T.textMuted }}>
                <i className="bi bi-tags text-4xl block mb-2" />
                No hay categorías. Crea la primera.
              </div>
            ) : cats.map(c => {
              const color = colorCat(c.idCategoria);
              return (
                <div key={c.idCategoria} className="overflow-hidden transition-shadow duration-200 hover:shadow-brand-sm rounded-2xl"
                  style={{ background: T.bgCard, border: `1px solid ${T.border}` }}>
                  {/* Banda de color superior */}
                  <div style={{ height: 5, background: color }} />
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: color + '22' }}>
                        <i className={`bi ${iconoCat(c.nombre)} text-xl`} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: T.textPrimary }}>{c.nombre}</div>
                        <small style={{ color: T.textMuted }}>ID #{c.idCategoria}</small>
                      </div>
                    </div>
                    {c.descripcion && (
                      <p className="text-xs mb-3 leading-relaxed line-clamp-2" style={{ color: T.textSecond }}>{c.descripcion}</p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => abrirEditar(c)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        style={{ background: T.goldBg, border: `1px solid ${T.goldBorder}`, color: T.gold }}>
                        <i className="bi bi-pencil me-1" />Editar
                      </button>
                      <button onClick={() => handleEliminar(c.idCategoria, c.nombre)}
                        className="px-2.5 rounded-lg cursor-pointer text-sm"
                        style={{ background:'#b0606018', border:'1px solid #b0606040', color:'#b06060' }}>
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabla resumen */}
          {cats.length > 0 && (
            <div className="overflow-hidden rounded-2xl" style={cardStyle}>
              <div className="px-5 py-3.5 font-bold text-sm" style={{ borderBottom:`1px solid ${T.border}`, color: T.textPrimary }}>
                <i className="bi bi-list-ul me-2" style={{ color: T.gold }} />Resumen
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Categoría','Descripción','Acciones'].map((h,i) => (
                        <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-left"
                          style={{ color: T.textMuted, borderBottom:`1px solid ${T.border}`, background: T.bgCard,
                            textAlign: i===2 ? 'center' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map(c => (
                      <tr key={c.idCategoria}
                        onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3 text-sm" style={{ borderBottom:`1px solid ${T.border}`, color: T.textPrimary }}>
                          <div className="flex items-center gap-2.5">
                            <i className={`bi ${iconoCat(c.nombre)} text-base`} style={{ color: colorCat(c.idCategoria) }} />
                            <span className="font-semibold">{c.nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ borderBottom:`1px solid ${T.border}`, color: T.textSecond }}>{c.descripcion ?? '—'}</td>
                        <td className="px-4 py-3 text-center" style={{ borderBottom:`1px solid ${T.border}` }}>
                          <button onClick={() => abrirEditar(c)} className="rounded-lg px-2.5 py-1.5 text-sm cursor-pointer mr-2"
                            style={{ background: T.goldBg, border: `1px solid ${T.goldBorder}`, color: T.gold }}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button onClick={() => handleEliminar(c.idCategoria, c.nombre)} className="rounded-lg px-2.5 py-1.5 text-sm cursor-pointer"
                            style={{ background:'#b0606018', border:'1px solid #b0606040', color:'#b06060' }}>
                            <i className="bi bi-trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[2000]"
          style={{ background:'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: T.bgCard, border:`1px solid ${T.border}`, boxShadow: T.shadowModal }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: T.bgHeader, borderBottom:`1px solid ${T.border}` }}>
              <h6 className="m-0 font-bold text-white text-sm">
                <i className={`bi ${editando ? 'bi-pencil' : 'bi-plus-circle'} me-2`} style={{ color:'#F0924A' }} />
                {editando ? 'Editar categoría' : 'Nueva categoría'}
              </h6>
              <button onClick={cerrarModal} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-base"
                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="rounded-lg px-3.5 py-2.5 mb-4 text-sm" style={{ background:'#b0606018', color:'#c07070', border:'1px solid #b0606040' }}>
                  <i className="bi bi-exclamation-circle me-2" />{error}
                </div>
              )}
              <div className="flex flex-col gap-3">
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Ej: Abarrotes" style={inputStyle} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Descripción</label>
                  <textarea name="descripcion" value={form.descripcion} onChange={handleChange}
                    rows={3} placeholder="Descripción de la categoría..."
                    style={{ ...inputStyle, resize:'none' }} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 px-6 py-3.5"
              style={{ borderTop:`1px solid ${T.border}`, background: T.bgMuted }}>
              <button onClick={cerrarModal} className="px-5 py-2 rounded-xl font-semibold text-sm cursor-pointer"
                style={{ border:`1px solid ${T.border}`, background: T.bgCard, color: T.textSecond }}>
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={guardando} style={{ ...btnPrimary, opacity:guardando?0.7:1 }}>
                {guardando ? <><span className="spinner-border spinner-border-sm" /> Guardando...</> : <><i className="bi bi-check-lg" /> {editando?'Actualizar':'Guardar'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}