import { useState, useEffect } from 'react';
import { T, inputStyle, labelStyle, btnPrimary, cardStyle } from '../theme';
import api from '../api/axiosConfig';

const FORM_VACIO = { nombre:'', empresa:'', ruc:'', telefono:'', descripcion:'', emitePercepcion:false };
const PALETA = ['#0D5E4F','#6aad7e','#6a9ac4','#b06060','#9a7ec4','#4aadad'];
const colorAvatar = (id) => PALETA[id % PALETA.length];
const iniciales   = (p)  => (p.empresa ?? p.nombre ?? '?').charAt(0).toUpperCase();

export default function Proveedores() {
  const [proveedores,  setProveedores]  = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [busqueda,     setBusqueda]     = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => { cargarDatos(); }, []);
  const cargarDatos = () => { setCargando(true); api.get('/proveedores').then(r => setProveedores(r.data)).finally(() => setCargando(false)); };
  const handleBuscar = (e) => {
    const val = e.target.value; setBusqueda(val);
    if (val.trim() === '') cargarDatos();
    else api.get(`/proveedores/buscar?q=${val}`).then(r => setProveedores(r.data));
  };
  const abrirCrear  = () => { setEditando(null); setForm(FORM_VACIO); setError(''); setModalAbierto(true); };
  const abrirEditar = (p) => {
    setEditando(p.idProveedor);
    setForm({ nombre:p.contacto??'', empresa:p.empresa??'', ruc:p.ruc??'', telefono:p.telefono??'', descripcion:p.descripcion??'', emitePercepcion:p.emitePercepcion??false });
    setError(''); setModalAbierto(true);
  };
  const cerrarModal  = () => { setModalAbierto(false); setEditando(null); setForm(FORM_VACIO); setError(''); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleGuardar = async () => {
    if (!form.nombre.trim())  { setError('El nombre es obligatorio.'); return; }
    if (!form.empresa.trim()) { setError('La empresa es obligatoria.'); return; }
    setGuardando(true); setError('');
    try {
      const payload = { empresa:form.empresa, contacto:form.nombre, ruc:form.ruc, telefono:form.telefono, descripcion:form.descripcion, emitePercepcion:form.emitePercepcion };
      if (editando) await api.put('/proveedores/' + editando, payload);
      else          await api.post('/proveedores', payload);
      cargarDatos(); cerrarModal();
    } catch { setError('Error al guardar. Verifica que el RUC no esté repetido.'); }
    finally  { setGuardando(false); }
  };
  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar proveedor "${nombre}"?`)) return;
    try { await api.delete(`/proveedores/${id}`); cargarDatos(); }
    catch { alert('No se puede eliminar, tiene compras asociadas.'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="m-0 font-bold text-lg" style={{ color: T.textPrimary }}>Proveedores</h5>
          <small style={{ color: T.textMuted }}>
            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}
          </small>
        </div>
        <button onClick={abrirCrear} style={btnPrimary}>
          <i className="bi bi-truck" /> Nuevo proveedor
        </button>
      </div>

      {/* Búsqueda */}
      <div className="rounded-2xl px-5 py-3.5 mb-3" style={cardStyle}>
        <div className="relative max-w-sm">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: T.textMuted }} />
          <input type="text" placeholder="Buscar por nombre, empresa o RUC..."
            value={busqueda} onChange={handleBuscar}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl" style={cardStyle}>
        {cargando ? (
          <div className="flex justify-center p-12"><div className="spinner-border" style={{ color: T.gold }} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Empresa','Contacto','RUC','Teléfono','Percepción','Acciones'].map((h,i) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider"
                      style={{ color:T.textMuted, borderBottom:`1px solid ${T.border}`, background:T.bgCard,
                        textAlign: i>=4 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedores.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-12" style={{ color: T.textMuted }}>
                    <i className="bi bi-truck text-4xl block mb-2" /> No hay proveedores registrados
                  </td></tr>
                ) : proveedores.map(p => (
                  <tr key={p.idProveedor}
                    onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3" style={{ borderBottom:`1px solid ${T.border}`, color: T.textPrimary }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-[#0f0f0f] flex-shrink-0"
                          style={{ background: colorAvatar(p.idProveedor) }}>
                          {iniciales(p)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{p.empresa}</div>
                          {p.descripcion && <small style={{ color: T.textMuted }}>{p.descripcion}</small>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ borderBottom:`1px solid ${T.border}`, color: T.textSecond }}>
                      {p.contacto ? <><i className="bi bi-person me-1" style={{ color:T.textMuted }}/>{p.contacto}</> : <span style={{ color:T.textMuted }}>—</span>}
                    </td>
                    <td className="px-4 py-3" style={{ borderBottom:`1px solid ${T.border}` }}>
                      <span className="font-mono text-xs rounded px-2 py-0.5"
                        style={{ background:T.bgMuted, color:T.textSecond, border:`1px solid ${T.border}` }}>
                        {p.ruc ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ borderBottom:`1px solid ${T.border}`, color: T.textSecond }}>
                      {p.telefono ? <><i className="bi bi-telephone me-1" style={{ color:T.textMuted }}/>{p.telefono}</> : '—'}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ borderBottom:`1px solid ${T.border}` }}>
                      {p.emitePercepcion
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'#FFF3E0', color:'#E07A2F' }}>Sí</span>
                        : <span style={{ color:T.textMuted, fontSize:12 }}>No</span>}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ borderBottom:`1px solid ${T.border}` }}>
                      <button onClick={() => abrirEditar(p)} className="rounded-lg px-2.5 py-1.5 text-sm cursor-pointer mr-2"
                        style={{ background:T.goldBg, border:`1px solid ${T.goldBorder}`, color:T.gold }}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button onClick={() => handleEliminar(p.idProveedor, p.empresa)} className="rounded-lg px-2.5 py-1.5 text-sm cursor-pointer"
                        style={{ background:'#b0606018', border:'1px solid #b0606040', color:'#b06060' }}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[2000]" style={{ background:'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background:T.bgCard, border:`1px solid ${T.border}`, boxShadow:T.shadowModal }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background:T.bgHeader, borderBottom:`1px solid ${T.border}` }}>
              <h6 className="m-0 font-bold text-sm text-white">
                <i className={`bi ${editando?'bi-pencil':'bi-truck'} me-2`} style={{ color:'#F0924A' }} />
                {editando ? 'Editar proveedor' : 'Nuevo proveedor'}
              </h6>
              <button onClick={cerrarModal} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-base"
                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div className="p-6">
              {error && <div className="rounded-lg px-3.5 py-2.5 mb-4 text-sm" style={{ background:'#b0606018', color:'#c07070', border:'1px solid #b0606040' }}><i className="bi bi-exclamation-circle me-2" />{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Nombre contacto *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Carlos Mendoza" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Empresa *</label>
                  <input name="empresa" value={form.empresa} onChange={handleChange} placeholder="Distribuidora SAC" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>RUC</label>
                  <input name="ruc" value={form.ruc} onChange={handleChange} placeholder="20512345678" maxLength={11} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="956123456" style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label style={labelStyle}>Descripción</label>
                  <input name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Ej: Distribuidor de bebidas" style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.emitePercepcion}
                      onChange={e => setForm(f => ({ ...f, emitePercepcion: e.target.checked }))} />
                    <span className="text-sm" style={{ color: T.textSecond }}>Emite percepción (IGV adicional)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 px-6 py-3.5" style={{ borderTop:`1px solid ${T.border}`, background:T.bgMuted }}>
              <button onClick={cerrarModal} className="px-5 py-2 rounded-xl font-semibold text-sm cursor-pointer"
                style={{ border:`1px solid ${T.border}`, background:T.bgCard, color:T.textSecond }}>
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