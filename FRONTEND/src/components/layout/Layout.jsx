import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import clsx from 'clsx';

const C = {
  emerald: "#0D5E4F",
  border:  "rgba(13,94,79,0.12)",
};

const TITULOS = {
  '/ventas':          '🛒 Nueva Venta',
  '/registro-ventas': '📋 Registro de Ventas',
  '/productos':       '📦 Productos',
  '/categorias':      '🏷️ Categorías',
  '/compras':         '🚚 Compras',
  '/proveedores':     '🏭 Proveedores',
  '/clientes':        '👥 Clientes',
  '/perfil':          '👤 Mi Perfil',
  '/usuarios':        '👥 Usuarios',
  '/admin-sistema':   '⚙️ Sistema',
  '/eventos':         '📝 Log de Eventos',
  '/tesoreria':       '💰 Tesorería',
};

const ACCESOS_NAV = [
  { label: 'Nueva Venta', ruta: '/ventas',          icon: 'bi-cart-plus' },
  { label: 'Reg. Ventas', ruta: '/registro-ventas', icon: 'bi-list-ul' },
  { label: 'Productos',   ruta: '/productos',        icon: 'bi-box-seam' },
  { label: 'Categorías',  ruta: '/categorias',       icon: 'bi-tags' },
  { label: 'Compras',     ruta: '/compras',          icon: 'bi-truck' },
  { label: 'Proveedores', ruta: '/proveedores',      icon: 'bi-people' },
  { label: 'Clientes',    ruta: '/clientes',         icon: 'bi-person-vcard' },
];

export default function Layout() {
  const { usuario, esAdmin, logout, estado } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { dark, toggle } = useDarkMode();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  const titulo = TITULOS[location.pathname] ?? 'AdrithStore';

  // Cerrar dropdown al click afuera
  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const menuItems = [
    { label: 'Mi Perfil',   icon: '👤', ruta: '/perfil',        admin: false },
    { label: 'Usuarios',    icon: '👥', ruta: '/usuarios',      admin: true  },
    { label: 'Tesorería',   icon: '💰', ruta: '/tesoreria',     admin: true  },
    { label: 'Sistema',     icon: '⚙️', ruta: '/admin-sistema', admin: true  },
    { label: 'Log Eventos', icon: '📝', ruta: '/eventos',       admin: true  },
  ].filter(m => !m.admin || esAdmin());

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0D1210] font-sans flex flex-col transition-colors duration-200">

    {/* ── HEADER  */}
      <header className="sticky top-0 z-[60] flex flex-col
        bg-canvas/92 dark:bg-[#0A1A14]/95 
        border-b border-brand/10 dark:border-brand/20 flex-shrink-0 transition-colors duration-200">

        {/* FILA 1: título página + dark toggle + avatar */}
        <div className="h-[52px] flex items-center justify-between px-5 lg:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand/15
                text-brand dark:text-brand font-semibold text-xs cursor-pointer
                bg-transparent hover:bg-brand hover:text-white hover:border-brand
                transition-all duration-150">
              Dashboard
            </button>
            <span className="text-sm font-bold text-ink dark:text-[#E8F0EC]">{titulo}</span>
          </div>

          {/* Dark toggle + avatar */}
          <div className="flex items-center gap-2" ref={menuRef}>
            <button onClick={toggle} title={dark ? 'Modo claro' : 'Modo oscuro'}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer
                border border-brand/15 dark:border-brand/25
                bg-transparent hover:bg-surface dark:hover:bg-[#1A2820] transition-colors">
              <span className="text-base">{dark ? '☀️' : '🌙'}</span>
            </button>
            <div className="relative">
              <button onClick={() => setMenu(v => !v)}
                className="flex items-center gap-2 bg-transparent border border-brand/20
                  dark:border-brand/30 rounded-full pl-1 pr-3 py-1 cursor-pointer
                  hover:border-brand/50 transition-colors">
                <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center
                  text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0D5E4F,#E07A2F)' }}>
                  {(usuario?.nombres?.[0] || 'A').toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-ink dark:text-[#E8F0EC]">
                  {usuario?.nombres?.split(' ')[0] || 'Usuario'}
                </span>
                <span className="text-[9px] text-gray-400">▾</span>
              </button>
              {menu && (
                <div className="absolute right-0 top-11 w-48
                  bg-white dark:bg-[#162018] rounded-2xl shadow-brand-md
                  border border-brand/10 dark:border-brand/20 overflow-hidden z-[70]">
                  {menuItems.map(m => (
                    <button key={m.ruta}
                      onClick={() => { setMenu(false); navigate(m.ruta); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                        text-ink dark:text-[#E8F0EC] border-b border-brand/8 dark:border-brand/15
                        bg-transparent hover:bg-surface dark:hover:bg-[#1A2820]
                        transition-colors text-left cursor-pointer">
                      {m.icon} {m.label}
                    </button>
                  ))}
                  <button onClick={() => { setMenu(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold
                      text-red-700 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20
                      transition-colors text-left cursor-pointer">
                    🚪 Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FILA 2: accesos rápidos */}
        <div className="flex items-center gap-1.5 px-5 lg:px-7 pb-2 overflow-x-auto">
          {ACCESOS_NAV.map(a => (
            <button key={a.ruta} onClick={() => navigate(a.ruta)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-150",
                location.pathname === a.ruta
                  ? "bg-brand text-white"
                  : "border border-brand/15 text-brand dark:text-[#A8C0B0] bg-transparent hover:bg-brand hover:text-white"
              )}>
              <i className={`bi ${a.icon}`} /> {a.label}
            </button>
          ))}
        </div>
      </header>

      {/* Contenido de la página */}
      <main className="flex-1 overflow-auto p-4 lg:p-6
        bg-surface dark:bg-[#0D1210] transition-colors duration-200">
        <Outlet />
      </main>
    </div>
  );
}