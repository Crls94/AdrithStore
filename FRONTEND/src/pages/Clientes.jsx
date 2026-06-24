import { useState, useEffect } from 'react';
import { T, inputStyle, labelStyle, btnPrimary, cardStyle } from '../theme';
import api from '../api/axiosConfig';

const FORM_VACIO = { nombre: '', apellido: '', dni: '', telefono: '' };

export default function Clientes() {
  const [clientes,     setClientes]     = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [busqueda,     setBusqueda]     = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = () => {
    setCargando(true);
    api.get('/clientes').then(r => setClientes(r.data)).finally(() => setCargando(false));
  };

  const handleBuscar = (e) => {
    const val = e.target.value; setBusqueda(val);
    if (val.trim() === '') cargarDatos();
    else api.get(`/clientes/buscar?q=${val}`).then(r => setClientes(r.data));
  };

  const abrirCrear = () => { setEditando(null); setForm(FORM_VACIO); setError(''); setModalAbierto(true); };
  const abrirEditar = (c) => {
    setEditando(c.idCliente);
    setForm({ nombre: c.nombre ?? '', apellido: c.apellido ?? '', dni: c.dni ?? '', telefono: c.telefono ?? '' });
    setError(''); setModalAbierto(true);
  };
  const cerrarModal = () => { setModalAbierto(false); setEditando(null); setForm(FORM_VACIO); setError(''); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleGuardar = async () => {
    if (!form.nombre.trim())   { setError('El nombre es obligatorio.');  return; }
    if (!form.apellido.trim()) { setError('El apellido es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      if (editando) await api.put(`/clientes/${editando}`, form);
      else await api.post('/clientes', form);
      cargarDatos(); cerrarModal();
    } catch { setError('Error al guardar. Verifica los datos.'); }
    finally  { setGuardando(false); }
  };

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar a "${nombre}"?`)) return;
    try { await api.delete(`/clientes/${id}`); cargarDatos(); }
    catch { alert('No se puede eliminar, tiene ventas asociadas.'); }
  };

  const PALETA = ['#c9a84c','#6aad7e','#6a9ac4','#b06060','#9a7ec4','#4aadad'];
  const colorAvatar = (id) => PALETA[id % PALETA.length];
  const iniciales   = (c) => `${c.nombre?.charAt(0) ?? ''}${c.apellido?.charAt(0) ?? ''}`.toUpperCase();

  const thStyle = { padding: '10px 16px', color: T.textMuted, fontSize: '11px',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px',
    borderBottom: `1px solid ${T.border}`, background: T.bgCard };
  const tdStyle = { padding: '13px 16px', borderBottom: `1px solid ${T.border}`,
    color: T.textPrimary, fontSize: '13px', verticalAlign: 'middle' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h5 style={{ margin: 0, fontWeight: 700, color: T.textPrimary, fontSize: '18px' }}>Clientes</h5>
          <small style={{ color: T.textMuted }}>
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </small>
        </div>
        <button onClick={abrirCrear} style={{ ...btnPrimary }}
          onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`}
          onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg, ${T.gold}, ${T.goldDark})`}>
          <i className="bi bi-person-plus" /> Nuevo cliente
        </button>
      </div>

      <div style={{ ...cardStyle, padding: '14px 20px', marginBottom: '12px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <i className="bi bi-search" style={{ position: 'absolute', left: '12px',
            top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
          <input type="text" placeholder="Buscar por nombre, apellido o DNI..."
            value={busqueda} onChange={handleBuscar}
            style={{ ...inputStyle, paddingLeft: '36px' }} />
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner-border" style={{ color: T.gold }} />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Cliente','DNI','Teléfono','Acciones'].map((h, i) => (
                    <th key={h} style={{ ...thStyle, textAlign: i === 3 ? 'center' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: '48px', color: T.textMuted }}>
                    <i className="bi bi-people" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }} />
                    No hay clientes registrados
                  </td></tr>
                ) : clientes.map(c => (
                  <tr key={c.idCliente}
                    onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%',
                          background: colorAvatar(c.idCliente), flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#0f0f0f', fontWeight: 800, fontSize: '12px' }}>
                          {iniciales(c)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.nombre} {c.apellido}</div>
                          <small style={{ color: T.textMuted }}>ID #{c.idCliente}</small>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', background: T.bgMuted,
                        color: T.textSecond, padding: '3px 8px', borderRadius: '6px',
                        border: `1px solid ${T.border}` }}>
                        {c.dni ?? '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: T.textSecond }}>
                      {c.telefono ? <><i className="bi bi-telephone me-1" style={{ color: T.textMuted }} />{c.telefono}</> : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <button onClick={() => abrirEditar(c)} title="Editar"
                        style={{ background: T.goldBg, border: `1px solid ${T.goldBorder}`,
                          borderRadius: '8px', padding: '6px 10px', color: T.gold,
                          cursor: 'pointer', marginRight: '6px', fontSize: '14px' }}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button onClick={() => handleEliminar(c.idCliente, `${c.nombre} ${c.apellido}`)}
                        style={{ background: '#b0606018', border: '1px solid #b0606040',
                          borderRadius: '8px', padding: '6px 10px', color: '#b06060',
                          cursor: 'pointer', fontSize: '14px' }}>
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

      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: T.bgCard, borderRadius: '20px', width: '100%', maxWidth: '460px',
            border: `1px solid ${T.border}`, boxShadow: T.shadowModal, overflow: 'hidden' }}>
            <div style={{ background: T.bgHeader, padding: '18px 24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${T.border}` }}>
              <h6 style={{ margin: 0, color: T.textPrimary, fontWeight: 700 }}>
                <i className={`bi ${editando ? 'bi-pencil' : 'bi-person-plus'} me-2`} style={{ color: T.gold }} />
                {editando ? 'Editar cliente' : 'Nuevo cliente'}
              </h6>
              <button onClick={cerrarModal}
                style={{ background: T.bgMuted, border: `1px solid ${T.border}`, borderRadius: '8px',
                  color: T.textSecond, width: '32px', height: '32px', cursor: 'pointer',
                  fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-x" />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {error && (
                <div style={{ background: '#b0606018', color: '#c07070', borderRadius: '8px',
                  padding: '10px 14px', marginBottom: '16px', fontSize: '13px', border: '1px solid #b0606040' }}>
                  <i className="bi bi-exclamation-circle me-2" />{error}
                </div>
              )}
              <div className="row g-3">
                <div className="col-6">
                  <label style={labelStyle}>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange}
                    placeholder="Juan" style={inputStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Apellido *</label>
                  <input name="apellido" value={form.apellido} onChange={handleChange}
                    placeholder="Pérez López" style={inputStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>DNI</label>
                  <input name="dni" value={form.dni} onChange={handleChange}
                    placeholder="12345678" maxLength={15} style={inputStyle} />
                </div>
                <div className="col-6">
                  <label style={labelStyle}>Teléfono</label>
                  <input name="telefono" value={form.telefono} onChange={handleChange}
                    placeholder="987654321" style={inputStyle} />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '10px', background: T.bgHeader }}>
              <button onClick={cerrarModal}
                style={{ padding: '9px 20px', borderRadius: '10px', border: `1px solid ${T.border}`,
                  background: T.bgMuted, color: T.textSecond, fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleGuardar} disabled={guardando} style={{ ...btnPrimary, opacity: guardando ? 0.7 : 1 }}>
                {guardando
                  ? <><span className="spinner-border spinner-border-sm" /> Guardando...</>
                  : <><i className="bi bi-check-lg" /> {editando ? 'Actualizar' : 'Guardar'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}