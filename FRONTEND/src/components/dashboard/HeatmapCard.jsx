import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import CalendarHeatmap from "@freecodecamp/react-calendar-heatmap";
import api from "../../api/axiosConfig";
import { CompactDropdown, money } from "./DashboardTrend";

const quickPeriods = [["hoy", "Hoy"], ["semana", "7 días"], ["mes", "Mes"], ["año", "Año"]];
const input = "min-h-9 min-w-0 max-w-full rounded-lg border border-brand/20 bg-white px-2 text-xs text-ink";
const label = "flex flex-col gap-1 text-[10px] uppercase font-semibold text-gray-600 min-w-0 max-w-full";
const dropdownLabel = "flex w-fit min-w-0 flex-col gap-0.5 text-[10px] uppercase font-semibold text-gray-600";

function intensity(amount, max) {
  if (!amount || max <= 0) return 0;
  return Math.min(4, Math.ceil(amount / max * 4));
}

function calendarWidth(from, to) {
  const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T00:00:00`);
  const days = Math.round((end - start) / 86400000) + 1;
  return Math.ceil((days + start.getDay() + 6 - end.getDay()) / 7) * 16 + 30;
}

export default function HeatmapCard({ dashboardFilters, options = [] }) {
  const [mode, setMode] = useState("categoria");
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState("");
  const [localFilters, setLocalFilters] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const filters = localFilters || dashboardFilters;
  const option = options.find(p => p.id === filters.periodo);
  const from = filters.desde || option?.desde || result?.rango?.desde || "";
  const to = filters.hasta || option?.hasta || result?.rango?.hasta || "";
  const shownRange = result?.rango;

  useEffect(() => { setLocalFilters(null); }, [dashboardFilters.periodo, dashboardFilters.tipo, dashboardFilters.vendedor]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(["categorias", "productos", "usuarios"].map(path => api.get(`/${path}`, { signal: controller.signal })))
      .then(([c, p, u]) => { setCategories(c.data); setProducts(p.data); setUsers(u.data); })
      .catch(e => { if (e.code !== "ERR_CANCELED") setCatalogError("No se pudieron cargar las opciones de filtros."); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!options.length) return;
    const controller = new AbortController();
    const params = { periodo: filters.periodo, tipo: filters.tipo };
    if (filters.desde || filters.hasta) { params.desde = filters.desde; params.hasta = filters.hasta; }
    if (filters.vendedor) params.idVendedor = filters.vendedor;
    if (category) params.idCategoria = category;
    if (mode === "producto" && product) params.idProducto = product;
    setLoading(true); setError("");
    api.get("/reportes/ventas/heatmap", { params, signal: controller.signal })
      .then(r => setResult(r.data))
      .catch(e => { if (e.code !== "ERR_CANCELED") setError("No se pudo actualizar el mapa. Revisa el rango; se conservan los datos anteriores."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, category, product, mode, options]);

  const availableProducts = useMemo(() => category ? products.filter(p => String(p.categoria?.idCategoria) === category) : products, [products, category]);
  const values = (result?.content || []).map(d => ({ date: d.fecha, count: Number(d.monto) }));
  const totals = result?.totales;
  const max = Number(totals?.montoDiaMaximo || 0);
  const maxDate = totals?.diaMaximo ? new Date(`${totals.diaMaximo}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "—";
  const activeQuick = filters.periodo?.startsWith("dia:") && option?.etiqueta === "Hoy" ? "hoy" : filters.periodo;
  const changeDate = (key, value) => setLocalFilters({ ...filters, desde: from, hasta: to, [key]: value, periodo: "personalizado" });

  return <div className="flex flex-col min-w-0" aria-busy={loading}>
    <div className="flex flex-wrap items-center gap-1.5 mb-2">
      <div className="flex rounded-lg border border-brand/20 overflow-hidden">
        {[["categoria", "Categoría"], ["producto", "Producto"]].map(([key, text]) => <button key={key} className={clsx("h-8 px-2.5 text-[11px] font-bold", mode === key ? "bg-brand text-white" : "bg-white text-gray-600")}
          onClick={() => { setMode(key); setProduct(""); }}>{text}</button>)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {quickPeriods.map(([key, text]) => <button key={key} className={clsx("h-8 px-2.5 text-[11px] rounded-md font-semibold", activeQuick === key ? "bg-brand text-white" : "border border-brand/20 text-gray-600")}
          onClick={() => setLocalFilters({ ...filters, periodo: key, desde: undefined, hasta: undefined })}>{text}</button>)}
      </div>
      {(category || product || localFilters) && <button type="button" className="h-8 rounded-md border border-brand/20 bg-white px-2.5 text-[11px] font-semibold text-brand transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => { setLocalFilters(null); setCategory(""); setProduct(""); }}>Usar filtros del dashboard</button>}
    </div>
    <div className="flex flex-wrap items-end gap-2 mb-2">
      <label className={`${dropdownLabel} w-36`}>Categoría
        <CompactDropdown label="Categoría del mapa" value={category} fullWidth theme="light" className="w-full"
          options={[{ value: "", label: "Todas" }, ...categories.map(c => ({ value: String(c.idCategoria), label: c.nombre }))]}
          onChange={value => { setCategory(value); setProduct(""); }} />
      </label>
      {mode === "producto" && <label className={`${dropdownLabel} w-36`}>Producto
        <CompactDropdown label="Producto del mapa" value={product} fullWidth theme="light" className="w-full"
          options={[{ value: "", label: "Todos" }, ...availableProducts.map(p => ({ value: String(p.idProducto), label: p.nombre }))]}
          onChange={setProduct} />
      </label>}
      <label className={`${dropdownLabel} w-36`}>Vendedor
        <CompactDropdown label="Vendedor del mapa" value={filters.vendedor || ""} fullWidth theme="light" className="w-full"
          options={[{ value: "", label: "Todos" }, ...users.map(u => ({ value: String(u.idUsuario), label: `${u.nombres} ${u.apellidos}` }))]}
          onChange={vendedor => setLocalFilters({ ...filters, vendedor })} />
      </label>
      <label className={label}>Desde<input aria-label="Desde mapa" type="date" className={input} value={from} onChange={e => changeDate("desde", e.target.value)} /></label>
      <label className={label}>Hasta<input aria-label="Hasta mapa" type="date" className={input} value={to} onChange={e => changeDate("hasta", e.target.value)} /></label>
    </div>
    {(error || catalogError) && <p role="alert" className="text-xs text-red-700 mb-2">{error} {catalogError}</p>}
    {shownRange && <div className="heatmap-scroll">
      <div className="heatmap-canvas" style={{ width: calendarWidth(shownRange.desde, shownRange.hasta) }}>
        <CalendarHeatmap startDate={new Date(`${shownRange.desde}T00:00:00`)} endDate={new Date(`${shownRange.hasta}T00:00:00`)} values={values} showOutOfRangeDays={false}
          classForValue={v => `heat-${intensity(v?.count, max)}`}
          titleForValue={v => v?.date ? `${v.date} — ${money(v.count)}` : ""} />
      </div>
    </div>}
    <div className="grid grid-cols-2 gap-3 mt-3 text-brand" data-testid="resumen-heatmap">
      {[["Total vendido", totals ? money(totals.totalIngresos) : "—"], ["Ganancia", totals ? money(totals.ganancia) : "—"],
        ["Día máximo", totals?.diaMaximo ? `${maxDate} · ${money(max)}` : "—"], ["Ganancia día máx.", totals?.diaMaximo ? money(totals.gananciaDiaMaximo) : "—"]].map(([text, value]) => <div key={text} className="min-w-0">
        <p className="text-[10px] font-bold uppercase">{text}</p><p className="text-sm font-bold break-words">{value}</p>
      </div>)}
    </div>
    <div className="flex items-center gap-1 text-[10px] text-gray-600 mt-3">
      <span>Menos</span>{[0, 1, 2, 3, 4].map(n => <span key={n} className="inline-block w-2.5 h-2.5 rounded-sm heat-square" data-level={`heat-${n}`} />)}<span>Más</span>
    </div>
  </div>;
}
