import { useState, useEffect } from 'react';
import { T, cardStyle, inputStyle } from '../theme';
import api from '../api/axiosConfig';

const fmtFecha = (f) => f ? new Date(f).toLocaleString('es-PE', {
  day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
}) : '--';

const EVENTO_CFG = {
  VENTA_CREADA:     { color:'#0D5E4F', bg:'#0D5E4F15', bdr:'#0D5E4F40', icon:'bi-receipt',           label:'Venta creada'      },
  VENTA_ANULADA:    { color:'#d64545', bg:'#d6454515', bdr:'#d6454540', icon:'bi-receipt-cutoff',     label:'Venta anulada'     },
  COMPRA_CREADA:    { color:'#6a9ac4', bg:'#6a9ac415', bdr:'#6a9ac440', icon:'bi-cart-check',         label:'Compra registrada' },
  COMPRA_ANULADA:   { color:'#d64545', bg:'#d6454515', bdr:'#d6454540', icon:'bi-cart-x',             label:'Compra anulada'    },
  COMPRA_AJUSTE:    { color:'#E07A2F', bg:'#E07A2F15', bdr:'#E07A2F40', icon:'bi-pencil-square',      label:'Ajuste compra'     },
  PRODUCTO_EDITADO: { color:'#9a7ec4', bg:'#9a7ec415', bdr:'#9a7ec440', icon:'bi-box-seam',           label:'Producto editado'  },
  STOCK_AJUSTADO:   { color:'#4aadad', bg:'#4aadad15', bdr:'#4aadad40', icon:'bi-arrow-left-right',   label:'Stock ajustado'    },
  STOCK_NEGATIVO:   { color:'#b06060', bg:'#b0606015', bdr:'#b0606040', icon:'bi-exclamation-triangle',label:'Stock negativo'   },
};
const CFG_DEF = { color:'#888', bg:'#88888815', bdr:'#88888840', icon:'bi-clock-history', label:'Evento' };
const POR_PAGINA = 20;

export default function EventoLog() {
  const [eventos,    setEventos]    = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [expandido,  setExpandido]  = useState(null);
  const [pagina,     setPagina]     = useState(1);

  const cargar = () => {
    setCargando(true);
    api.get('/eventos').then(r => setEventos(r.data)).finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = eventos.filter(ev => {
    const okT = filtroTipo==='TODOS' || ev.tipoEvento===filtroTipo;
    const okB = !busqueda.trim() ||
      ev.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(ev.idEntidad??'').includes(busqueda) ||
      ev.tipoEvento?.toLowerCase().includes(busqueda.toLowerCase()) ||
      ev.entidad?.toLowerCase().includes(busqueda.toLowerCase());
    return okT && okB;
  });

  const totalPag  = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados = filtrados.slice((pagina-1)*POR_PAGINA, pagina*POR_PAGINA);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="m-0 font-bold text-lg" style={{ color: T.textPrimary }}>Log de Eventos</h5>
          <small style={{ color: T.textMuted }}>
            {filtrados.length} evento{filtrados.length!==1?'s':''} · Solo administradores
          </small>
        </div>
        <button onClick={cargar} className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-sm cursor-pointer"
          style={{ background:T.bgMuted, border:`1px solid ${T.border}`, color:T.textSecond }}>
          <i className="bi bi-arrow-clockwise" /> Actualizar
        </button>
      </div>

      {/* Resumen chips por tipo */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))' }}>
        {Object.entries(EVENTO_CFG).map(([tipo, cfg]) => {
          const count = eventos.filter(e => e.tipoEvento===tipo).length;
          if (!count) return null;
          const activo = filtroTipo===tipo;
          return (
            <button key={tipo}
              onClick={() => { setFiltroTipo(activo ? 'TODOS' : tipo); setPagina(1); }}
              className="rounded-xl px-3 py-2.5 text-left cursor-pointer transition-all"
              style={{ background: activo ? cfg.bg : T.bgCard, border:`1px solid ${activo ? cfg.bdr : T.border}` }}>
              <div className="flex items-center gap-2 mb-1">
                <i className={`bi ${cfg.icon} text-sm`} style={{ color: cfg.color }} />
                <span className="text-xs font-bold" style={{ color: cfg.color }}>{count}</span>
              </div>
              <div className="text-[11px] font-semibold" style={{ color: T.textMuted }}>{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Búsqueda + filtro activo */}
      <div className="rounded-2xl px-5 py-3.5 mb-3 flex gap-3 items-center flex-wrap" style={cardStyle}>
        <div className="relative flex-1 min-w-[200px]">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color:T.textMuted }} />
          <input type="text" placeholder="Buscar descripción, tipo, entidad..."
            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
            style={{ ...inputStyle, paddingLeft:36 }} />
        </div>
        {filtroTipo !== 'TODOS' && (
          <button onClick={() => setFiltroTipo('TODOS')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background:T.bgMuted, border:`1px solid ${T.border}`, color:T.textSecond }}>
            <i className="bi bi-x" /> Quitar filtro
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl" style={cardStyle}>
        {cargando ? (
          <div className="flex justify-center p-12"><div className="spinner-border" style={{ color:T.gold }} /></div>
        ) : paginados.length === 0 ? (
          <div className="text-center p-12" style={{ color:T.textMuted }}>
            <i className="bi bi-clock-history text-4xl block mb-2" />
            No hay eventos registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['#','Tipo','Entidad','Descripción','Fecha','Detalle'].map((h,i) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{ color:T.textMuted, borderBottom:`1px solid ${T.border}`, background:T.bgCard,
                        textAlign: i===5 ? 'center' : 'left', width: i===0?'40px':i===5?'70px':'auto' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginados.map(ev => {
                  const cfg = EVENTO_CFG[ev.tipoEvento] ?? CFG_DEF;
                  const exp = expandido === ev.idEvento;
                  return (
                    <>
                      <tr key={ev.idEvento}
                        onMouseEnter={e => e.currentTarget.style.background = T.bgCardHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-3 text-xs" style={{ borderBottom:`1px solid ${T.border}`, color:T.textMuted }}>#{ev.idEvento}</td>
                        <td className="px-4 py-3" style={{ borderBottom:`1px solid ${T.border}` }}>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bdr}` }}>
                            <i className={`bi ${cfg.icon}`} />{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ borderBottom:`1px solid ${T.border}` }}>
                          {ev.entidad && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background:T.bgMuted, color:T.textSecond }}>
                              {ev.entidad}{ev.idEntidad ? ` #${ev.idEntidad}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs" style={{ borderBottom:`1px solid ${T.border}` }}>
                          <div className="truncate text-xs" style={{ color:T.textSecond }}>{ev.descripcion ?? '--'}</div>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ borderBottom:`1px solid ${T.border}`, color:T.textMuted }}>{fmtFecha(ev.fecha)}</td>
                        <td className="px-4 py-3 text-center" style={{ borderBottom:`1px solid ${T.border}` }}>
                          {ev.datosJson ? (
                            <button onClick={() => setExpandido(exp ? null : ev.idEvento)}
                              className="rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer"
                              style={{ background:T.goldBg, border:`1px solid ${T.goldBorder}`, color:T.gold }}>
                              <i className={`bi bi-chevron-${exp?'up':'down'}`} />
                            </button>
                          ) : <span style={{ color:T.textMuted, fontSize:12 }}>--</span>}
                        </td>
                      </tr>
                      {exp && ev.datosJson && (
                        <tr key={`${ev.idEvento}-json`}>
                          <td colSpan={6} style={{ padding:'0 16px 12px', background:T.bgMuted, borderBottom:`1px solid ${T.border}` }}>
                            <div className="rounded-lg p-3 mt-2 overflow-x-auto" style={{ background:'#0A1A14' }}>
                              <pre className="m-0 text-xs whitespace-pre-wrap break-all font-mono" style={{ color:'#6aad7e' }}>
                                {(() => { try { return JSON.stringify(JSON.parse(ev.datosJson),null,2); } catch { return ev.datosJson; } })()}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPag > 1 && (
          <div className="flex justify-between items-center px-5 py-3.5" style={{ borderTop:`1px solid ${T.border}` }}>
            <small style={{ color:T.textMuted }}>
              Mostrando {(pagina-1)*POR_PAGINA+1}–{Math.min(pagina*POR_PAGINA,filtrados.length)} de {filtrados.length}
            </small>
            <div className="flex gap-1.5">
              <button onClick={() => setPagina(p => Math.max(1,p-1))} disabled={pagina===1}
                className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                style={{ border:`1px solid ${T.border}`, background:pagina===1?T.bgMuted:T.bgCard, color:pagina===1?T.textMuted:T.textPrimary }}>
                <i className="bi bi-chevron-left" />
              </button>
              {Array.from({ length: Math.min(5,totalPag) }, (_,i) => {
                const p = pagina<=3 ? i+1 : pagina-2+i;
                if (p<1||p>totalPag) return null;
                return (
                  <button key={p} onClick={() => setPagina(p)}
                    className="px-3 py-1.5 rounded-lg text-sm cursor-pointer font-semibold"
                    style={{ background:p===pagina?T.gold:T.bgCard, color:p===pagina?'#fff':T.textPrimary,
                      border: p===pagina ? 'none' : `1px solid ${T.border}` }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPagina(p => Math.min(totalPag,p+1))} disabled={pagina===totalPag}
                className="px-3 py-1.5 rounded-lg text-sm cursor-pointer"
                style={{ border:`1px solid ${T.border}`, background:pagina===totalPag?T.bgMuted:T.bgCard, color:pagina===totalPag?T.textMuted:T.textPrimary }}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}