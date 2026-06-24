import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import clsx from "clsx";
import { AreaChart, Area, ResponsiveContainer, ReferenceLine, XAxis, LabelList } from "recharts";
import { useAuth } from "../auth/AuthContext";

const API = "http://192.168.18.28:8080/api/dashboard";

const G = {
  hero:       "linear-gradient(135deg, #061A18 0%, #0A3D3A 45%, #0D5E4F 100%)",
  kpi:        "linear-gradient(135deg, #0A3D3A, #0D5E4F)",
  accounts:   "linear-gradient(160deg, #061A18 0%, #0A3D3A 55%, #0D5E4F 100%)",
  glass:      "rgba(255,255,255,0.10)",
  glassBorder:"rgba(255,255,255,0.14)",
};

const money = (n) => `S/ ${parseFloat(n || 0).toFixed(2)}`;

function buildChartData(ventas, periodo) {
  if (!ventas || ventas.length === 0) return [];
  const ahora = new Date();
  const desde = new Date();
  if      (periodo === "semana")       desde.setDate(ahora.getDate() - 7);
  else if (periodo === "mes")          desde.setDate(1);
  else if (periodo === "mes_anterior") { desde.setMonth(ahora.getMonth()-1); desde.setDate(1); }
  else                                 desde.setHours(0,0,0,0);
  const mapa = {};
    {/* Agrupa por dia */ }
  
ventas
    .filter(v => v.fecha && v.total && new Date(v.fecha) >= desde)
    .forEach(v => {
      const dia = new Date(v.fecha).toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit"});
      mapa[dia] = (mapa[dia]||0) + parseFloat(v.total||0);
    });

  return Object.entries(mapa)
    .map(([dia,total]) => ({dia, total:parseFloat(total.toFixed(2))}))
    .slice(-30);
}



function useReloj() {
  const [t,setT] = useState(new Date());
  useEffect(()=>{
    const id = setInterval(()=>setT(new Date()),1000);
    return ()=>clearInterval(id);
  },[]);
  return t;
}

function AnimNum({ to, prefix="", suffix="", dec=0 }) {
  const [v,setV] = useState(0);
  useEffect(()=>{
    const end = parseFloat(to)||0;
    if(end===0){setV(0);return;}
    let cur=0; const step=end/36;
    const id=setInterval(()=>{ cur=Math.min(cur+step,end); setV(cur); if(cur>=end)clearInterval(id); },16);
    return ()=>clearInterval(id);
  },[to]);
  return <>{prefix}{dec>0?v.toFixed(dec):Math.floor(v)}{suffix}</>;
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
        <span className="text-sm font-semibold text-ink leading-tight">
          {usuario?.nombres?.split(" ")[0]}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 w-48 bg-white rounded-2xl shadow-xl border border-brand/10 overflow-hidden z-[100]">
          {items.map(m=>(
            <button key={m.ruta} onClick={()=>{setOpen(false);navigate(m.ruta);}}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-ink border-b border-brand/10 bg-transparent hover:bg-surface transition-colors text-left cursor-pointer">
              {m.icon} {m.label}
            </button>
          ))}
          <button onClick={()=>{setOpen(false);onLogout();}}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-700 bg-transparent hover:bg-red-50 transition-colors text-left cursor-pointer">
            🚪 Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}

const ACCESOS = [
  {label:"Nueva Venta",  ruta:"/ventas",          img:"nueva-venta",    color:"#0D5E4F", icon:"bi-cart-plus"},
  {label:"Reg. Ventas",  ruta:"/registro-ventas", img:"registro-ventas",color:"#0D5E4F", icon:"bi-list-ul"},
  {label:"Productos",    ruta:"/productos",        img:"productos",      color:"#0D5E4F", icon:"bi-box-seam"},
  {label:"Categorías",   ruta:"/categorias",       img:"categorias",     color:"#0D5E4F", icon:"bi-tags"},
  {label:"Compras",      ruta:"/compras",          img:"compras",        color:"#0D5E4F", icon:"bi-truck"},
  {label:"Proveedores",  ruta:"/proveedores",      img:"proveedores",    color:"#0D5E4F", icon:"bi-people"},
  {label:"Clientes",     ruta:"/clientes",         img:"clientes",       color:"#0D5E4F", icon:"bi-person-vcard"},
];

function SectionLabel({children, dark=true}) {
  return (
    <div className={clsx("text-[11px] font-extrabold uppercase tracking-widest mb-3",
      dark ? "text-white/90" : "text-brand/70")}>
      {children}
    </div>
  );
}

function PeriodoPicker({ periodo, setPeriodo, periodos }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  const actual = periodos.find(p=>p.k===periodo);
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(v=>!v)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer bg-white/15 hover:bg-white/25 border border-white/20 transition-all">
        <i className="bi bi-calendar3 text-white text-[10px]"/>
        <span className="text-[11px] font-bold text-white whitespace-nowrap">{actual?.l}</span>
        <i className="bi bi-chevron-down text-white/60 text-[9px]"/>
      </button>
      {open && (
        <div className="absolute left-0 top-8 w-32 bg-white rounded-xl shadow-xl border border-brand/10 overflow-hidden z-[200]">
          {periodos.map(p=>(
            <button key={p.k} onClick={()=>{setPeriodo(p.k);setOpen(false);}}
              className={clsx("w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left cursor-pointer transition-colors border-b border-brand/8 last:border-0",
                periodo===p.k ? "bg-brand text-white" : "text-ink hover:bg-surface")}>
              {periodo===p.k && <i className="bi bi-check2 text-xs"/>}
              {p.l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VendedorPicker({ filtroVendedor, setFiltroVendedor, usuarios }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  const nombreActual = filtroVendedor
    ? usuarios.find(u=>String(u.idUsuario)===String(filtroVendedor))?.nombres?.split(" ")[0] || "Vendedor"
    : "Todos";
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(v=>!v)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer bg-white/15 hover:bg-white/25 border border-white/20 transition-all">
        <i className="bi bi-people text-white text-[10px]"/>
        <span className="text-[11px] font-bold text-white whitespace-nowrap">{nombreActual}</span>
        <i className="bi bi-chevron-down text-white/60 text-[9px]"/>
      </button>
      {open && (
        <div className="absolute left-0 top-8 w-36 bg-white rounded-xl shadow-xl border border-brand/10 overflow-hidden z-[200]">
          <button onClick={()=>{setFiltroVendedor("");setOpen(false);}}
            className={clsx("w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left cursor-pointer transition-colors border-b border-brand/8",
              !filtroVendedor ? "bg-brand text-white" : "text-ink hover:bg-surface")}>
            {!filtroVendedor && <i className="bi bi-check2 text-xs"/>}
            👥 Todos
          </button>
          {usuarios.map(u=>(
            <button key={u.idUsuario} onClick={()=>{setFiltroVendedor(String(u.idUsuario));setOpen(false);}}
              className={clsx("w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-left cursor-pointer transition-colors border-b border-brand/8 last:border-0",
                String(filtroVendedor)===String(u.idUsuario) ? "bg-brand text-white" : "text-ink hover:bg-surface")}>
              {String(filtroVendedor)===String(u.idUsuario) && <i className="bi bi-check2 text-xs"/>}
              {u.nombres?.split(" ")[0]}
              <span className="text-[10px] opacity-60 ml-auto">{u.rol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SparkLine({ data, gradId }) {
  if (data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-white/25 text-xs">
        Sin datos para graficar
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={data} margin={{top:22,right:25,left:25,bottom:0}}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#FAFAF8" stopOpacity={0.22}/>
            <stop offset="95%" stopColor="#FAFAF8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        {data.map((d,i)=>(
          <ReferenceLine key={i} x={d.dia}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="3 3"/>
        ))}
        <XAxis dataKey="dia" hide />
        <Area type="monotone" dataKey="total"
          stroke="rgba(255,255,255,0.65)" strokeWidth={2}
          fill={`url(#${gradId})`}
          dot={{ r:3, fill:"rgba(255,255,255,0.9)", strokeWidth:0 }}
          activeDot={false}>
          <LabelList dataKey="total" position="top"
            content={(props)=>{
              const {x,y,value}=props;
              return (
                <text x={x} y={y-6} textAnchor="middle"
                  fontSize={12} fontWeight={700}
                  fill="rgba(255,255,255,0.85)"
                  style={{fontFamily:"Inter,system-ui,sans-serif"}}>
                  {`S/${value.toFixed(0)}`}
                </text>
              );
            }}/>
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Dashboard() {
  const {esAdmin} = useAuth();
  return esAdmin() ? <DashAdmin/> : <DashVendedor/>;
}

// ═════════════════════════════════════════════════════════════════════════
// DASH ADMIN
// ═════════════════════════════════════════════════════════════════════════
function DashAdmin() {
  const {usuario,esAdmin,logout} = useAuth();
  const navigate = useNavigate();
  const ahora    = useReloj();

  const [periodo,        setPeriodo]        = useState("hoy");
  const [stats,          setStats]          = useState(null);
  const [tes,            setTes]            = useState(null);
  const [ventas,         setVentas]         = useState([]);
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [usuarios,       setUsuarios]       = useState([]);

  const mesActual   = ahora.toLocaleString("es-PE",{month:"long"});
  const mesAnterior = new Date(ahora.getFullYear(),ahora.getMonth()-1,1)
                        .toLocaleString("es-PE",{month:"long"});
  const cap = (s) => s.charAt(0).toUpperCase()+s.slice(1);

  const periodos = [
    {k:"hoy",          l:"Hoy"},
    {k:"semana",       l:"Semana"},
    {k:"mes",          l: cap(mesActual)},
    {k:"mes_anterior", l: cap(mesAnterior)},
   
  ];

  useEffect(()=>{
    axios.get(`${API.replace("/api/dashboard","")}/api/usuarios`)
      .then(r=>setUsuarios(Array.isArray(r.data)?r.data.filter(u=>u.activo):[]))
      .catch(()=>{});
  },[]);

  useEffect(()=>{
    const params = new URLSearchParams({periodo});
    if (filtroVendedor) params.append("idUsuario",filtroVendedor);
    Promise.all([
      axios.get(`${API}/stats?${params.toString()}`),
      axios.get(`${API}/resumen-tesoreria`),
      axios.get(`${API.replace("/api/dashboard","")}/api/ventas${filtroVendedor?"/por-usuario/"+filtroVendedor:"/todas"}`),
    ]).then(([s,t,v])=>{
      setStats(s.data); setTes(t.data);
      setVentas(Array.isArray(v.data)?v.data.slice(0,8):[]);
    }).catch(()=>{});
  },[periodo,filtroVendedor]);

  const totalCtas = tes?.cuentas?.reduce((s,c)=>s+(parseFloat(c.saldoActual)||0),0)||0;
  const ingresos  = parseFloat(stats?.totalIngresos||0);
  const costos    = parseFloat(stats?.totalCostos||0);
  const gastos    = parseFloat(stats?.totalGastos||0);
  const margen    = parseFloat(stats?.margen||0);
  const utilidad  = parseFloat(stats?.utilidad||0);
  const stockBajo = stats?.productosStockBajo||0;
  const horaStr   = ahora.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
  const fechaStr  = ahora.toLocaleDateString("es-PE",{weekday:"long",day:"numeric",month:"long"});
  const chartData = useMemo(()=>buildChartData(ventas,periodo),[ventas,periodo]);

  const CUENTAS_FIJAS = [
    {nombre:"Caja Fisica",   icono:"🏧"},
    {nombre:"Plin",          icono:"📱"},
    {nombre:"Yape",          icono:"📲"},
    {nombre:"Tarjeta",       icono:"💳"},
    {nombre:"Transferencia", icono:"🏦"},
    {nombre:"Otro",          icono:"💰"},
  ];
  const cuentasMostradas = CUENTAS_FIJAS.map(fija=>{
    const real = tes?.cuentas?.find(c=>
      c.nombre.toLowerCase().includes(fija.nombre.toLowerCase())
    );
    return { nombre:fija.nombre, icono:fija.icono, saldo:real?.saldoActual??null };
  });

  const menuItems = [
    {label:"Mi Perfil",  icon:"👤",ruta:"/perfil"},
    {label:"Usuarios",   icon:"👥",ruta:"/usuarios",      admin:true},
    {label:"Sistema",    icon:"⚙️",ruta:"/admin-sistema", admin:true},
    {label:"Log Eventos",icon:"📝",ruta:"/eventos",       admin:true},
  ].filter(m=>!m.admin||esAdmin());

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-surface font-sans text-ink">

      {/* HEADER */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 lg:px-7
        border-b border-brand/10 bg-canvas sticky top-0 z-[90]">
        <div className="flex items-center gap-2">
          <img src="/icons/logo.png" alt=""
            className="w-8 h-8 object-contain rounded-lg"
            onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex";}}/>
          <div className="w-8 h-8 rounded-lg items-center justify-center text-base hidden flex-shrink-0"
            style={{background:G.kpi}}>🏪</div>
          <span className="font-black text-sm tracking-tight text-ink">Adrith</span>
        </div>
        <div className="text-center flex-1 mx-2">
          <div className="text-sm font-extrabold text-brand tracking-wide leading-tight">{horaStr}</div>
          <div className="text-[10px] text-gray-500 capitalize leading-tight">{fechaStr}</div>
        </div>
        <AvatarMenu usuario={usuario} items={menuItems}
          onLogout={()=>{logout();navigate("/login");}}/>
      </header>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 lg:p-5 lg:gap-4">

        {/* ── Fila accesos rápidos iconos ── */}
        <div className="flex items-center justify-center gap-1.5 flex-shrink-0">
          {ACCESOS.map(a=>(
            <button key={a.ruta} onClick={()=>navigate(a.ruta)} title={a.label}
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer
                bg-white border border-brand/15 hover:bg-brand hover:border-brand
                text-brand hover:text-white transition-all duration-150">
              <i className={`bi ${a.icon} text-sm`}/>
            </button>
          ))}
        </div>

       


       {/* HERO CARD */}
        <div className="flex-shrink-0 rounded-3xl p-5 lg:p-6 relative overflow-hidden shadow-teal-lg"
          style={{background:G.hero}}>
          <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full pointer-events-none"
            style={{background:"radial-gradient(circle,rgba(255,255,255,0.05)0%,transparent 65%)"}}/>

          {/* Mobile: flex-col — Desktop: grid 3 cols */}
          <div className="flex flex-col gap-4 lg:grid lg:gap-0 relative"
            style={{gridTemplateColumns:"1fr 1fr 2fr", gridTemplateRows:"auto auto auto auto"}}>

            {/* Fila 1 col 1: Picker período */}
            <div className="lg:p-2 flex items-center">
              <PeriodoPicker periodo={periodo} setPeriodo={setPeriodo} periodos={periodos}/>
            </div>

            {/* Fila 1 col 2: Picker vendedor */}
            <div className="lg:p-2 flex items-center hidden lg:flex">
              <VendedorPicker filtroVendedor={filtroVendedor}
                setFiltroVendedor={setFiltroVendedor} usuarios={usuarios}/>
            </div>

            {/* Mobile: pickers en fila juntos */}
            <div className="flex items-center gap-2 lg:hidden">
              <PeriodoPicker periodo={periodo} setPeriodo={setPeriodo} periodos={periodos}/>
              <VendedorPicker filtroVendedor={filtroVendedor}
                setFiltroVendedor={setFiltroVendedor} usuarios={usuarios}/>
            </div>

            {/* Fila 1 col 3: Label tendencia — span 4 filas en desktop */}
            <div className="hidden lg:flex lg:flex-col lg:p-3 lg:pl-5 lg:border-l lg:border-white/10"
              style={{gridColumn:"3", gridRow:"1 / 5"}}>
              <div className="text-[11px] text-white/75 font-bold uppercase tracking-wider mb-3">
                Tendencia · {periodos.find(p=>p.k===periodo)?.l}
              </div>
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  <SparkLine data={chartData} gradId="gradAdmin"/>
                </div>
              </div>
            </div>

            {/* Fila 2: Ingresos — span 2 cols */}
            <div className="lg:col-span-2 lg:px-2 lg:py-3 lg:border-b lg:border-white/10">
              <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest mb-1">
                {periodos.find(p=>p.k===periodo)?.l} — Ingresos
              </div>
              <div className="text-4xl font-black text-white tracking-tighter leading-none">
                {stats ? money(ingresos) : "—"}
              </div>
            </div>

            {/* Fila 3: Ventas | Ticket prom — 1 col cada uno */}
            {[
              {l:"Ventas",       v: String(stats?.totalVentas||0)},
              {l:"Ticket prom.", v: money(stats?.ticketPromedio||0)},
            ].map(item=>(
              <div key={item.l}
                className="lg:px-2 lg:py-3 lg:border-b lg:border-white/10 flex flex-col justify-center">
                <div className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">{item.l}</div>
                <div className="text-sm font-bold mt-0.5 text-white/90">{item.v}</div>
              </div>
            ))}

            {/* Fila 4: Ganancia | Saldo total — 1 col cada uno */}
            {[
              {l:"Ganancia",    v: money(ingresos-costos),  accent:false},
              {l:"Saldo total", v: money(totalCtas),        accent:true},
            ].map(item=>(
              <div key={item.l}
                className="lg:px-2 lg:py-3 flex flex-col justify-center">
                <div className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">{item.l}</div>
                <div className={clsx("text-sm font-bold mt-0.5", item.accent?"text-accent":"text-white/90")}>
                  {item.v}
                </div>
              </div>
            ))}

            {/* Mobile: gráfico al final */}
            <div className="lg:hidden mt-2 border-t border-white/10 pt-3">
              <div className="text-[10px] text-white/70 font-bold uppercase tracking-wider mb-2">
                Tendencia · {periodos.find(p=>p.k===periodo)?.l}
              </div>
              <SparkLine data={chartData} gradId="gradAdmin"/>
            </div>

          </div>
        </div>






        {/* ══ FILA A: Saldos | Métricas | Últimas Ventas ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_3fr_4fr] gap-3 lg:gap-4 items-stretch">

          {/* 💰 Saldos — FIX: 1 col en desktop (6 filas), 2 cols en mobile */}
          <div className="rounded-2xl p-4 relative overflow-hidden shadow-teal-lg"
            style={{background:G.accounts}}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
              style={{background:"rgba(255,255,255,0.04)"}}/>
            <div className="text-center pb-3 mb-3 border-b border-white/10">
              <div className="text-xs text-white/90 font-bold uppercase tracking-widest mb-0.5">
                💰 Saldo total
              </div>
              <div className="text-2xl font-black text-accent">{money(totalCtas)}</div>
            </div>

            {/* Mobile: 2 cols — Desktop: 1 col (cada cuenta en su fila) */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              {cuentasMostradas.map(c=>(
                <div key={c.nombre} className="rounded-xl p-2 backdrop-blur-md"
                  style={{background:G.glass,border:`1px solid ${G.glassBorder}`}}>
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] text-white/85 font-semibold uppercase tracking-wide">
                      {c.icono} {c.nombre}
                    </div>

                    
                    <div className={clsx("text-xs font-black",c.saldo!==null?"text-white":"text-white/25")}>
                      {c.saldo!==null ? money(c.saldo) : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas */}
          <div className="rounded-2xl p-4 lg:p-5 relative overflow-hidden shadow-brand-md"
            style={{background:G.kpi}}>
            <SectionLabel>Métricas del período</SectionLabel>
            <div className="flex flex-col gap-2">
              <div className={clsx("rounded-xl p-3 backdrop-blur-md w-full transition-all",
                  stockBajo>0?"cursor-pointer ring-1 ring-orange-400/50 hover:ring-orange-400/80":"cursor-default")}
                style={{background:G.glass,border:`1px solid ${G.glassBorder}`}}
                onClick={()=>stockBajo>0&&navigate("/productos")}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-white/85 font-semibold uppercase tracking-wide mb-1">Stock bajo</div>
                    <div className={clsx("text-xl font-black",stockBajo>0?"text-orange-400":"text-white")}>
                      {stockBajo}
                      {stockBajo>0&&<span className="text-[10px] text-orange-400/70 ml-2 font-semibold">productos · Toca para ver →</span>}
                    </div>
                  </div>
                  {stockBajo>0&&<div className="text-2xl">⚠️</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {l:"Ventas",   v:stats?.totalVentas||0,pre:"",   dec:0,tip:"Transacciones"},
                  {l:"Ingresos", v:ingresos,              pre:"S/ ",dec:2,tip:"Dinero ingresado"},
                  {l:"Costos",   v:costos,                pre:"S/ ",dec:2,tip:"Costo de productos"},
                  {l:"Gastos",   v:gastos,                pre:"S/ ",dec:2,tip:"Egresos registrados"},
                  {l:"Margen",   v:margen,                pre:"",   dec:1,suf:"%",tip:"Margen bruto"},
                  {l:"Utilidad", v:utilidad,              pre:"",   dec:1,suf:"%",tip:"Ganancia sobre costo"},
                ].map(k=>(
                  <div key={k.l} className="rounded-xl p-3 backdrop-blur-md"
                    style={{background:G.glass,border:`1px solid ${G.glassBorder}`}}>
                    <div className="text-[10px] text-white/85 font-semibold uppercase tracking-wide mb-1">{k.l}</div>
                    <div className="text-xl font-black text-white">
                      <AnimNum to={k.v} prefix={k.pre} suffix={k.suf||""} dec={k.dec}/>
                    </div>
                    <div className="text-[9px] text-white/55 mt-0.5">{k.tip}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Últimas Ventas — FIX: agrega vendedor y medio de pago */}
          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-brand/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <SectionLabel dark={false}>Últimas Ventas</SectionLabel>
              <button onClick={()=>navigate("/registro-ventas")}
                className="text-xs font-bold text-brand bg-transparent border-none cursor-pointer hover:underline -mt-3">
                Ver todas →
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {ventas.length===0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-gray-300">
                  Sin ventas en este período
                </div>
              ) : ventas.map((v,i)=>(
                <div key={v.idVenta||i}
                  className={clsx("flex justify-between items-start py-2.5",
                    i<ventas.length-1&&"border-b border-brand/8")}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🧾</div>
                    <div>
                      <div className="text-sm font-bold text-brand">Venta #{v.idVenta}</div>
                      {/* Cliente */}
                      <div className="text-xs text-gray-500">
                        {v.cliente?`${v.cliente.nombre} ${v.cliente.apellido||""}`.trim():"Cliente General"}
                      </div>
                      {/* Vendedor + medio de pago */}
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {v.usuario && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{background:"rgba(13,94,79,0.08)", color:"#0D5E4F"}}>
                            👤 {v.usuario.nombres?.split(" ")[0]}
                          </span>
                        )}
                        {v.pagos?.length>0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{background:"rgba(224,122,47,0.1)", color:"#B86020"}}>
                            {v.pagos[0].medioPago}
                            {v.pagos.length>1 && ` +${v.pagos.length-1}`}
                          </span>
                        )}
                        {v.fecha && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(v.fecha).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-brand flex-shrink-0 ml-2">{money(v.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// DASH VENDEDOR
// ═════════════════════════════════════════════════════════════════════════
function DashVendedor() {
  const {usuario,logout} = useAuth();
  const navigate = useNavigate();
  const ahora    = useReloj();
  const [stats,  setStats]  = useState(null);
  const [ventas, setVentas] = useState([]);
  const [periodo,setPeriodo]= useState("hoy");

  const periodos = [
    {k:"hoy",    l:"Hoy"},
    {k:"semana", l:"7 días"},
    {k:"mes",    l:"Mes"},
  ];

  useEffect(()=>{
    if(!usuario?.idUsuario) return;
    axios.get(`${API}/stats?periodo=${periodo}&idUsuario=${usuario.idUsuario}`)
      .then(r=>setStats(r.data)).catch(()=>setStats({}));
    axios.get(`${API.replace("/api/dashboard","")}/api/ventas/por-usuario/${usuario.idUsuario}`)
      .then(r=>setVentas(Array.isArray(r.data)?r.data.slice(0,20):[]))
      .catch(()=>setVentas([]));
  },[periodo,usuario?.idUsuario]);

  const chartData = useMemo(()=>buildChartData(ventas,periodo),[ventas,periodo]);
  const h      = ahora.getHours();
  const saludo = h<12?"Buenos días":h<18?"Buenas tardes":"Buenas noches";
  const horaStr= ahora.toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"});
  const menuItems = [{label:"Mi Perfil",icon:"👤",ruta:"/perfil"}];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-surface font-sans">
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 lg:px-7
        border-b border-brand/10 bg-canvas sticky top-0 z-[90]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
            style={{background:G.kpi}}>🏪</div>
          <span className="font-black text-sm tracking-tight text-ink">Adrith</span>
        </div>
        <span className="font-extrabold text-base text-brand tracking-wide">{horaStr}</span>
        <AvatarMenu usuario={usuario} items={menuItems}
          onLogout={()=>{logout();navigate("/login");}}/>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 lg:p-5 lg:gap-4">

        {/* Filtro período */}
        <div className="flex-shrink-0 flex gap-2 justify-center flex-wrap">
          {periodos.map(p=>(
            <button key={p.k} onClick={()=>setPeriodo(p.k)}
              className={clsx("px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                periodo===p.k?"bg-brand text-white shadow-brand-sm":"bg-white text-gray-600 shadow-sm hover:text-brand")}>
              {p.l}
            </button>
          ))}
        </div>

        {/* HERO CARD igual al admin */}
        <div className="flex-shrink-0 rounded-3xl p-4 lg:p-5 relative overflow-hidden shadow-teal-lg"
          style={{background:G.hero}}>
          <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full pointer-events-none"
            style={{background:"radial-gradient(circle,rgba(255,255,255,0.05)0%,transparent 65%)"}}/>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 lg:gap-5 relative items-start">
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="text-[10px] text-white/75 font-bold uppercase tracking-widest mb-0.5">
                  {saludo} · {usuario?.nombres?.split(" ")[0]} 👋
                </div>
                <div className="text-3xl lg:text-4xl font-black text-white tracking-tighter leading-none">
                  {stats ? money(stats?.totalIngresos||0) : "—"}
                </div>
                <div className="text-[10px] text-white/60 mt-0.5 capitalize">
                  {periodos.find(p=>p.k===periodo)?.l} · mis ingresos
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {[
                  {l:"Mis ventas",   v:stats?.totalVentas||0},
                  {l:"Ticket prom.", v:money(stats?.ticketPromedio||0)},
                ].map(item=>(
                  <div key={item.l}>
                    <div className="text-[9px] text-white/70 font-semibold uppercase tracking-wider">{item.l}</div>
                    <div className="text-xs font-bold mt-0.5 text-white/85">{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-white/75 font-bold uppercase tracking-wider mb-1.5">
                Tendencia · {periodos.find(p=>p.k===periodo)?.l}
              </div>
              <SparkLine data={chartData} gradId="gradVend"/>
            </div>
          </div>
        </div>

        {/* Accesos + Mis Últimas Ventas */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3 lg:gap-4 items-stretch">

          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-brand/10 shadow-sm">
            <SectionLabel dark={false}>Accesos Rápidos</SectionLabel>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-2">
              {ACCESOS.map(a=>(
                <button key={a.ruta} onClick={()=>navigate(a.ruta)}
                  className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border border-brand/10 bg-canvas cursor-pointer transition-all group"
                  onMouseEnter={e=>{
                    e.currentTarget.style.background=a.color;
                    e.currentTarget.style.borderColor=a.color;
                    e.currentTarget.style.transform="translateY(-2px)";
                    e.currentTarget.style.boxShadow=`0 6px 16px ${a.color}44`;
                  }}
                  onMouseLeave={e=>{
                    e.currentTarget.style.background="#FAFAF8";
                    e.currentTarget.style.borderColor="rgba(13,94,79,0.10)";
                    e.currentTarget.style.transform="";
                    e.currentTarget.style.boxShadow="";
                  }}>
                  <img src={`/icons/${a.img}.png`} alt=""
                    className="w-7 h-7 object-contain"
                    onError={e=>{e.target.style.display="none";}}/>
                  <span className="text-[10px] font-bold text-gray-500 leading-tight text-center group-hover:text-white transition-colors">
                    {a.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 border border-brand/10 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <SectionLabel dark={false}>Mis Últimas Ventas</SectionLabel>
              <button onClick={()=>navigate("/registro-ventas")}
                className="text-xs font-bold text-brand bg-transparent border-none cursor-pointer hover:underline -mt-3">
                Ver todas →
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {ventas.length===0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-gray-300">
                  Aún no has registrado ventas
                </div>
              ) : ventas.slice(0,8).map((v,i)=>(
                <div key={v.idVenta||i}
                  className={clsx("flex justify-between items-start py-2.5",
                    i<Math.min(ventas.length,8)-1&&"border-b border-brand/8")}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🧾</div>
                    <div>
                      <div className="text-sm font-bold text-brand">Venta #{v.idVenta}</div>
                      <div className="text-xs text-gray-500">
                        {v.cliente?`${v.cliente.nombre} ${v.cliente.apellido||""}`.trim():"Cliente General"}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {v.pagos?.length>0 && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{background:"rgba(224,122,47,0.1)", color:"#B86020"}}>
                            {v.pagos[0].medioPago}
                            {v.pagos.length>1 && ` +${v.pagos.length-1}`}
                          </span>
                        )}
                        {v.fecha && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(v.fecha).toLocaleTimeString("es-PE",{hour:"2-digit",minute:"2-digit"})}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-brand flex-shrink-0 ml-2">{money(v.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}