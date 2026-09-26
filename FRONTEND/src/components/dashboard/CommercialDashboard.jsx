import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import api from "../../api/axiosConfig";
import DashboardTrend, { money } from "./DashboardTrend";
import HeatmapCard from "./HeatmapCard";

const card = { background: "#005522", color: "#F2F2F2" };
const fixedAccounts = ["Caja Fisica", "Plin", "Yape", "Tarjeta", "Transferencia", "Otro"];
const shortcuts = [["Nueva Venta", "/ventas", "nueva-venta"], ["Reg. Ventas", "/registro-ventas", "registro-ventas"], ["Productos", "/productos", "productos"], ["Categorías", "/categorias", "categorias"], ["Compras", "/compras", "compras"], ["Proveedores", "/proveedores", "proveedores"], ["Clientes", "/clientes", "clientes"]];

export default function CommercialDashboard() {
  const { usuario, esAdmin } = useAuth();
  const admin = esAdmin();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ periodo: "hoy", tipo: "ingresos", vendedor: "" });
  const [options, setOptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [treasury, setTreasury] = useState(null);
  const [users, setUsers] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [financeError, setFinanceError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get("/dashboard/periodos", { signal: controller.signal }).then(({ data }) => {
      setOptions(data.opciones);
      setFilters(f => f.periodo === "hoy" ? { ...f, periodo: data.predeterminado } : f);
    }).catch(e => { if (e.code !== "ERR_CANCELED") setSetupError("No se pudieron cargar los períodos. Recarga la página para reintentar."); });
    if (admin) api.get("/usuarios", { signal: controller.signal }).then(r => setUsers(Array.isArray(r.data) ? r.data : []))
      .catch(e => { if (e.code !== "ERR_CANCELED") setSetupError("No se pudo cargar la lista de vendedores."); });
    return () => controller.abort();
  }, [admin]);

  // Las cuentas son una fotografía actual, independiente de los filtros. Se refrescan al volver a la página.
  useEffect(() => {
    if (!admin) return;
    const controller = new AbortController();
    const refresh = () => api.get("/dashboard/resumen-tesoreria", { signal: controller.signal })
      .then(r => { setTreasury(r.data); setFinanceError(""); })
      .catch(e => { if (e.code !== "ERR_CANCELED") setFinanceError("No se pudo actualizar el saldo actual."); });
    refresh(); window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, [admin]);

  useEffect(() => {
    if (!usuario?.idUsuario || !options.length) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    const params = { periodo: filters.periodo, tipo: filters.tipo };
    const vendedor = admin ? filters.vendedor : usuario.idUsuario;
    if (vendedor) params.idUsuario = vendedor;
    api.get("/dashboard/stats", { params, signal: controller.signal })
      .then(r => setStats(r.data))
      .catch(e => { if (e.code !== "ERR_CANCELED") setError("No se pudo actualizar el dashboard. Se conservan los últimos datos cargados."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [admin, usuario?.idUsuario, filters, options]);

  useEffect(() => {
    if (admin || !usuario?.idUsuario) return;
    const controller = new AbortController();
    api.get(`/ventas/por-usuario/${usuario.idUsuario}`, { signal: controller.signal })
      .then(r => setLatest(Array.isArray(r.data) ? r.data.slice(0, 8) : []))
      .catch(e => { if (e.code !== "ERR_CANCELED") setSetupError("No se pudieron cargar las últimas ventas."); });
    return () => controller.abort();
  }, [admin, usuario?.idUsuario]);

  const accounts = fixedAccounts.map(name => {
    const real = treasury?.cuentas?.find(c => c.nombre.toLowerCase().includes(name.toLowerCase()));
    return { name, amount: real?.saldoActual };
  });
  const extraAccounts = (treasury?.cuentas || []).filter(c => !fixedAccounts.some(n => c.nombre.toLowerCase().includes(n.toLowerCase())));
  const periodMetrics = [
    ["Ventas", stats?.totalVentas ?? "—", "Transacciones comerciales"],
    ["Compras", stats ? money(stats.totalCompras) : "—", "Global del período"],
    ["Costos", stats ? money(stats.totalCostos) : "—", "Costos históricos registrados"],
    ["Gastos", stats ? money(stats.totalGastos) : "—", "Global del período"],
    ["Margen", stats ? `${Number(stats.margen).toFixed(2)}%` : "—", "Ganancia / ingresos"],
    ["Utilidad", stats ? `${Number(stats.utilidad).toFixed(2)}%` : "—", "Ganancia / costos"],
  ];

  return <div className="flex flex-col gap-3 min-w-0">
    {(setupError || financeError) && <p role="alert" className="text-sm text-red-700">{setupError} {financeError}</p>}
    <DashboardTrend stats={stats} options={options} filters={filters} setFilters={setFilters} users={users} treasury={treasury} admin={admin} loading={loading} error={error} />
    {admin ? <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_1.5fr] gap-3 items-stretch min-w-0">
      <section className="rounded-2xl p-4 min-w-0" style={card} aria-label="Cuentas actuales">
        <h2 className="text-sm text-center font-extrabold uppercase tracking-widest mb-3">Cuentas</h2>
        <div className="rounded-xl p-3 border border-[#FAA222]/60 bg-white/10 mb-3 text-center">
          <p className="text-xs">Saldo Total · actual</p>
          <p className="text-2xl font-black text-[#FAA222]">{treasury ? money(treasury.totalGeneral) : "—"}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[...accounts, ...extraAccounts.map(c => ({ name: c.nombre, amount: c.saldoActual })), { name: "Percepción", amount: treasury?.totalPercepcion }].map(c => <div key={c.name} className="rounded-xl p-3 bg-white/10 min-w-0">
            <p className="text-xs">{c.name}</p><p className="font-bold break-words">{c.amount != null ? money(c.amount) : "—"}</p>
          </div>)}
        </div>
      </section>
      <section className="rounded-2xl p-4 min-w-0" style={card} aria-label="Métricas del período">
        <h2 className="text-sm text-center font-extrabold uppercase tracking-widest mb-3">Métricas del período</h2>
        <button className="w-full rounded-xl p-3 bg-white/10 text-center mb-3" onClick={() => navigate("/productos")}>
          <span className="text-xs block">Stock bajo · actual</span><span className="text-xl font-black text-[#FAA222]">{stats?.productosStockBajo ?? "—"} productos</span>
        </button>
        <div className="grid grid-cols-2 gap-2">
          {periodMetrics.map(([name, value, note]) => <div key={name} className="rounded-xl p-3 bg-white/10 min-w-0 text-center">
            <p className="text-xs font-semibold uppercase">{name}</p><p className="text-lg font-black break-words">{value}</p><p className="text-[10px] mt-1">{note}</p>
          </div>)}
        </div>
      </section>
      <section className="bg-white rounded-2xl p-4 border border-brand/10 min-w-0">
        <h2 className="text-sm text-center font-extrabold uppercase tracking-widest text-brand/70 mb-3">Mapa de calor de ventas</h2>
        <HeatmapCard dashboardFilters={filters} options={options} />
      </section>
    </div> : <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-3">
      <section className="bg-white rounded-2xl p-4 border border-brand/10">
        <h2 className="text-center text-sm font-bold uppercase text-brand mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-3 gap-2">{shortcuts.map(([name, url, icon]) => <button key={url} onClick={() => navigate(url)} className="p-2 rounded-xl bg-canvas text-xs text-brand font-bold flex flex-col items-center gap-2">
          <img src={`/icons/${icon}.png`} alt="" className="w-7 h-7" />{name}
        </button>)}</div>
      </section>
      <section className="bg-white rounded-2xl p-4 border border-brand/10">
        <div className="flex justify-between mb-3"><h2 className="text-sm font-bold text-brand">Mis últimas ventas</h2><button className="text-xs text-brand" onClick={() => navigate("/registro-ventas")}>Ver todas →</button></div>
        <p className="text-xs text-gray-500 mb-2">Montos de comprobantes; pueden incluir principal movilizado.</p>
        {latest.map(v => <div key={v.idVenta} className="flex justify-between py-2 border-b border-brand/10 text-sm"><span>Venta #{v.idVenta} · {v.estado}</span><strong>{money(v.total)}</strong></div>)}
        {!latest.length && <p className="text-sm text-gray-500">Aún no hay ventas para mostrar.</p>}
      </section>
    </div>}
  </div>;
}
