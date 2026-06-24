import { useLocation } from 'react-router-dom';
import { T } from '../../theme';

const TITLES = {
  '/':                'Dashboard',
  '/ventas':          'Nueva Venta',
  '/registro-ventas': 'Registro de Ventas',
  '/compras':         'Compras',
  '/productos':       'Productos',
  '/clientes':        'Clientes',
  '/proveedores':     'Proveedores',
  '/categorias':      'Categorías',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'AdrithStore';
  const now = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    
    <header style={{
      background: T.bgNavbar,
      borderBottom: `1px solid ${T.border}`,
      padding: '0 24px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 900,
      boxShadow: T.shadow,
    }}>
      <div>
        <h5 style={{ margin: 0, fontWeight: 700, color: T.textPrimary, fontSize: '17px' }}>
          {title}
        </h5>
        <small style={{ color: T.textMuted, fontSize: '11px', textTransform: 'capitalize' }}>
          {now}
        </small>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button title="Notificaciones" style={{
          background: T.bgMuted,
          border: `1px solid ${T.border}`,
          borderRadius: '50%', width: '36px', height: '36px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: T.textSecond, fontSize: '16px',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSecond; }}
        >
          <i className="bi bi-bell" />
        </button>

        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: `linear-gradient(135deg, #0d8c6e, #0a5f8a)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: '14px', cursor: 'pointer',
          boxShadow: T.shadow,
        }} title="Usuario">
          A
        </div>
      </div>
    </header>
  );
}