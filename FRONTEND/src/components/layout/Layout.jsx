import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';

const ACCESOS = [
  {label:"Dashboard",   ruta:"/dashboard",         icon:"bi-speedometer2"},
  {label:"Nueva Venta", ruta:"/ventas",            icon:"bi-cart-plus"},
  {label:"Reg. Ventas", ruta:"/registro-ventas",   icon:"bi-list-ul"},
  {label:"Productos",   ruta:"/productos",          icon:"bi-box-seam"},
  {label:"Categorías",  ruta:"/categorias",         icon:"bi-tags"},
  {label:"Compras",     ruta:"/compras",            icon:"bi-truck"},
  {label:"Proveedores", ruta:"/proveedores",        icon:"bi-people"},
  {label:"Clientes",    ruta:"/clientes",           icon:"bi-person-vcard"},
];

const G = { kpi: "linear-gradient(135deg, #0A3D3A, #0D5E4F)" };

function useReloj() {
  const [t,setT] = useState(new Date());
  useEffect(()=>{
    const id = setInterval(()=>setT(new Date()),1000);
    return ()=>clearInterval(id);
  },[]);
  return t;
}

function AvatarMenu({usuario,items,onLogout}) {
  const navigate=useNavigate();
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(v=>!v)}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity p-1 rounded-xl">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{background:"linear-gradient(135deg,#0D5E4F,#E07A2F)"}}>
          {(usuario?.nombres?.[0]||"?").toUpperCase()}
        </div>
        <span className="text-sm font-semibold text-ink dark:text-[#E8F0EC] leading-tight">
          {usuario?.nombres?.split(" ")[0]}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-48 bg-white dark:bg-[#162018] rounded-2xl shadow-xl border border-brand/10 dark:border-brand/20 overflow-hidden z-[100]">
          {items.map(m=>(
            <button key={m.ruta} onClick={()=>{setOpen(false);navigate(m.ruta);}}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink dark:text-[#E8F0EC] border-b border-brand/10 dark:border-brand/15 bg-transparent hover:bg-surface dark:hover:bg-[#1A2820] transition-colors text-left cursor-pointer">
              {m.icon} {m.label}
            </button>
          ))}
          <button onClick={()=>{setOpen(false);onLogout();}}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-700 bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left cursor-pointer">
            🚪 Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { usuario, esAdmin, logout } = useAuth();
  const navigate  = useNavigate();
  const { dark, toggle } = useDarkMode();
  const ahora = useReloj();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const horaStr = ahora.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
  const fechaStr = ahora.toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"});

  const menuItems = [
    {label:"Mi Perfil",  icon:"👤", ruta:"/perfil"},
    {label:"Tesorería",  icon:"💰", ruta:"/tesoreria", admin:true},
    {label:"Usuarios",   icon:"👥", ruta:"/usuarios",  admin:true},
    {label:"Sistema",    icon:"⚙️", ruta:"/admin-sistema", admin:true},
    {label:"Log Eventos",icon:"📝", ruta:"/eventos",   admin:true},
  ].filter(m=>!m.admin||esAdmin());

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-surface dark:bg-[#0D1210] font-sans flex flex-col transition-colors duration-200">
      <header className="flex-shrink-0 border-b border-brand/10 bg-canvas dark:bg-[#0A1A14]/95 sticky top-0 z-[90]">

        {/* ── 1 fila · 3 columnas ────────────────────────────── */}
        <div className="flex items-start justify-between px-4 lg:px-7 pt-3">

          {/* Col 1: Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/icons/logo.png" alt=""
              className="w-8 h-8 object-contain rounded-lg"
              onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
            <span className="font-black text-sm tracking-tight text-ink dark:text-[#E8F0EC]">Adrith</span>
          </div>

          {/* Col 2: Reloj (collapsible) + Iconos */}
          <div className="flex-1 flex flex-col items-center min-w-0">
            <div className="transition-all duration-300 overflow-hidden"
              style={{maxHeight: scrolled ? '0' : '36px', opacity: scrolled ? 0 : 1}}>
              <div className="text-center pb-1">
                <div className="text-sm font-extrabold text-brand tracking-wide leading-tight">{horaStr}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 capitalize leading-tight">{fechaStr}</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 pb-2 flex-shrink-0">
              {ACCESOS.map(a=>(
                <button key={a.ruta} onClick={()=>navigate(a.ruta)} title={a.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer
                    bg-white dark:bg-[#162018] border border-brand/15 dark:border-brand/25 hover:bg-brand hover:border-brand
                    text-brand dark:text-[#A8C0B0] hover:text-white transition-all duration-150">
                  <i className={`bi ${a.icon} text-sm`}/>
                </button>
              ))}
            </div>
          </div>

          {/* Col 3: Dark toggle (sin texto) + Avatar */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={toggle} title={dark ? 'Modo claro' : 'Modo oscuro'}
              className="flex items-center justify-center bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity p-1 rounded-xl">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{background:"linear-gradient(135deg,#0D5E4F,#E07A2F)"}}>
                {dark ? '☀️' : '🌙'}
              </div>
            </button>
            <AvatarMenu usuario={usuario} items={menuItems}
              onLogout={handleLogout}/>
          </div>

        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 lg:p-6
        bg-surface dark:bg-[#0D1210] transition-colors duration-200">
        <Outlet />
      </main>
    </div>
  );
}
