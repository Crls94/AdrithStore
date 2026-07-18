import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../auth/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';




export const HeaderScrollContext = createContext(() => {});
export const useHeaderScroll = () => useContext(HeaderScrollContext);

const ACCESOS = [
  {label:"Dashboard",   ruta:"/dashboard",         icon:"bi-speedometer2"},
  {label:"Nueva Venta", ruta:"/ventas",            icon:"bi-cart-plus"},
  {label:"Reg. Ventas", ruta:"/registro-ventas",   icon:"bi-list-ul"},
  {label:"Productos",   ruta:"/productos",          icon:"bi-box-seam"},
  {label:"Categorías",  ruta:"/categorias",         icon:"bi-tags"},
  {label:"Compras",     ruta:"/compras",            icon:"bi-truck"},
  {label:"Proveedores", ruta:"/proveedores",        icon:"bi-people"},
  {label:"Clientes",    ruta:"/clientes",           icon:"bi-person-vcard"},
  {label:"Reportes",    ruta:"/reportes",           icon:"bi-graph-up"},
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
  const [pos,setPos]=useState({top:0,right:0});
  const btnRef=useRef(null);
  const menuRef=useRef(null);

  useEffect(()=>{
    const h=(e)=>{
      if(btnRef.current&&!btnRef.current.contains(e.target)
        &&menuRef.current&&!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const toggleOpen=()=>{
    if(!open&&btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+8,right:window.innerWidth-r.right});
    }
    setOpen(v=>!v);
  };

  return (
    <div className="relative" ref={btnRef}>
      <button onClick={toggleOpen}
        className="flex items-center gap-2 bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity p-1 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
          {(usuario?.nombres?.[0]||"?").toUpperCase()}
        </div>
        <span className="hidden md:inline text-sm font-semibold text-ink dark:text-[#E8F0EC] leading-tight">
          {usuario?.nombres?.split(" ")[0]}
        </span>
      </button>
      {open && createPortal(
        <div ref={menuRef}
          style={{position:'fixed',top:pos.top,right:pos.right}}
          className="w-48 bg-white dark:bg-[#162018] rounded-2xl shadow-xl border border-brand/10 dark:border-brand/20 overflow-hidden z-[200]">
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
        </div>,
        document.body
      )}
    </div>
  );
}

export default function Layout() {
  const { usuario, esAdmin, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { dark, toggle } = useDarkMode();
  const ahora = useReloj();
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handleChange = () => setIsMobile(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const collapsado = scrolled && isMobile;

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
    <div className="h-screen overflow-hidden bg-surface dark:bg-[#0D1210] font-sans flex flex-col transition-colors duration-200">
      <header className="flex-shrink-0 border-b border-brand/10 bg-canvas dark:bg-[#0A1A14]/95 sticky top-0 z-[90]">

        { }
        <div className={`overflow-hidden transition-all duration-300
          ${collapsado ? 'max-h-0 opacity-0' : 'max-h-[60px] opacity-100'}`}>
          <div className="flex items-center justify-between px-4 lg:px-7 pt-3 pb-2">

            { }
            <div className="flex items-center gap-2 flex-shrink-0">
              <img src="/icons/logo.png" alt=""
                className="w-8 h-8 object-contain rounded-lg"
                onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
              <span className="font-black text-sm tracking-tight text-ink dark:text-[#E8F0EC]">Adrith</span>
            </div>

            { }
            <div className="flex-1 flex flex-col items-center min-w-0">
              <div className="text-center">
                <div className="text-sm font-extrabold text-brand tracking-wide leading-tight">{horaStr}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 capitalize leading-tight">{fechaStr}</div>
              </div>
            </div>

            { }
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={toggle} title={dark ? 'Modo claro' : 'Modo oscuro'}
                className="flex items-center justify-center bg-transparent border-none cursor-pointer hover:opacity-75 transition-opacity p-1 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-accent">
                  {dark ? '☀️' : '🌙'}
                </div>
              </button>
              <AvatarMenu usuario={usuario} items={menuItems} onLogout={handleLogout}/>
            </div>

          </div>
        </div>

        { }
        <div className="flex flex-wrap items-center justify-center gap-1.5
          px-4 pt-2 pb-2 flex-shrink-0">
          {ACCESOS.map(a=>{
            const activo = location.pathname===a.ruta || location.pathname.startsWith(a.ruta+'/');
            return (
              <button key={a.ruta} onClick={()=>navigate(a.ruta)} title={a.label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0
                  bg-white dark:bg-[#162018] border border-brand/15 dark:border-brand/25
                  hover:text-accent transition-all duration-150
                  ${activo ? '!text-accent' : 'text-brand dark:text-[#A8C0B0]'}`}>
                <i className={`bi ${a.icon} text-sm`}/>
              </button>
            );
          })}
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-auto p-1.5 md:p-4 lg:p-6
        bg-surface dark:bg-[#0D1210] transition-colors duration-200">
        <HeaderScrollContext.Provider value={setScrolled}>
          <Outlet />
        </HeaderScrollContext.Provider>
      </main>
    </div>
  );
}
