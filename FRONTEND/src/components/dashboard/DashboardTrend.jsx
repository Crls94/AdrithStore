import { useEffect, useId, useRef, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, LabelList } from "recharts";

export const money = (n) => `S/ ${Number(n ?? 0).toFixed(2)}`;
export const TYPES = { ingresos: "Ingresos", productos: "Productos", servicios: "Servicios" };
export const dashboardGreenSurface = "linear-gradient(118deg, #0D5E4F 0%, #0D5E4F 62%, #005522 100%)";
const GROUPS = { dia: "Día", semana: "Semana", mes: "Mes", año: "Año" };
const dropdownTrigger = "inline-flex h-7 max-w-full items-center justify-between gap-1.5 rounded-md px-2 text-[11px] font-semibold leading-none transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export function CompactDropdown({ label, value, options, onChange, className = "", fullWidth = false, disabled = false, theme = "dark" }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex];
  const light = theme === "light";
  const triggerTheme = light
    ? "border border-brand/20 bg-white text-brand hover:bg-surface focus-visible:ring-2 focus-visible:ring-brand"
    : "bg-[#0A3D3A] text-[#F2F2F2] hover:bg-[#0D5E4F] focus-visible:ring-2 focus-visible:ring-[#FAA222]";
  const menuTheme = light
    ? "border border-brand/10 bg-[#FAFAF8] text-ink shadow-brand-sm"
    : "border border-black/5 bg-[#FAFAF8] text-[#005522] shadow-lg shadow-black/20";
  const optionFocus = light ? "focus-visible:ring-2 focus-visible:ring-brand" : "focus-visible:ring-2 focus-visible:ring-[#FAA222]";

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const openAt = index => {
    if (disabled || !options.length) return;
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
    setOpen(true);
  };
  const move = delta => setActiveIndex(index => (index + delta + options.length) % options.length);
  const choose = option => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };
  const onMenuKeyDown = event => {
    if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
    else if (event.key === "Home") { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === "End") { event.preventDefault(); setActiveIndex(options.length - 1); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    else if (event.key === "Tab") setOpen(false);
  };

  return <div ref={rootRef} className={`relative min-w-0 ${className}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} disabled={disabled}
      className={`${dropdownTrigger} ${triggerTheme} ${fullWidth ? "w-full" : ""}`} onClick={() => open ? setOpen(false) : openAt(selectedIndex)}
      onKeyDown={event => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          openAt(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : selectedIndex + (event.key === "ArrowUp" ? -1 : 0));
        } else if (event.key === "Escape" && open) setOpen(false);
      }}>
      <span className="truncate">{selected?.label ?? "—"}</span>
      <svg aria-hidden="true" className={`h-3 w-3 shrink-0 opacity-75 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none">
        <path d="m2 4 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    {open && <div id={id} role="listbox" aria-label={label} className={`absolute left-0 top-full z-50 mt-1 max-h-56 min-w-full max-w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-lg p-1 ${menuTheme}`} onKeyDown={onMenuKeyDown}>
      {options.map((option, index) => <button key={option.value} ref={node => { optionRefs.current[index] = node; }} type="button" role="option" data-value={option.value} aria-selected={option.value === value} tabIndex={-1}
        className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[11px] leading-tight transition-colors focus-visible:outline-none ${optionFocus} ${option.value === value ? light ? "bg-brand font-bold text-white" : "bg-[#0D5E4F] font-bold text-[#F2F2F2]" : light ? "text-ink hover:bg-surface" : "text-[#005522] hover:bg-[#F1F3F2]"}`}
        onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}>{option.label}</button>)}
    </div>}
  </div>;
}

export default function DashboardTrend({ stats, options, filters, setFilters, users, treasury, admin, loading, error }) {
  const [auxiliary, setAuxiliary] = useState("");
  const [chartWidth, setChartWidth] = useState(600);
  const group = options.find(p => p.id === filters.periodo)?.grupo || "dia";
  const range = stats?.rango;
  const data = stats?.serie || [];
  const selectedType = TYPES[stats?.tipo || filters.tipo];
  const selectGroup = (next) => {
    const first = options.find(p => p.grupo === next);
    if (first) setFilters(f => ({ ...f, periodo: first.id }));
  };
  const label = (color, position) => ({ x, y, value, index }) => {
    // Densidad legible en móvil. La tabla accesible conserva todos los valores sin hover.
    const stride = Math.max(1, Math.ceil(data.length / Math.max(4, Math.floor(chartWidth / 70))));
    if (index % stride !== 0 && index !== data.length - 1) return null;
    return <text x={x} y={Number(y) + position} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
      {`S/${Number(value).toFixed(0)}`}
    </text>;
  };
  const metrics = [
    ["Ventas", stats ? stats.totalVentas : "—"],
    ["Compras", stats ? money(stats.totalCompras) : "—", undefined, "dashboard-kpi-purchases"],
    ["Ticket Prom.", stats ? money(stats.ticketPromedio) : "—"],
    ["Ganancia", stats ? money(stats.ganancia) : "—"],
    ["Costos", stats ? money(stats.totalCostos) : "—"],
    ...(admin ? [["Saldo Total", treasury ? money(treasury.totalGeneral) : "—", "Actual · todas las cuentas"]] : []),
  ];

  return <section className="rounded-3xl p-4 sm:p-5 lg:p-6 min-w-0" style={{ background: dashboardGreenSurface, color: "#F2F2F2" }} aria-label="Resumen y tendencia" aria-busy={loading}>
    {error && <p role="alert" className="mb-3 text-sm">{error}</p>}
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,2fr)_minmax(0,3fr)] gap-5 lg:gap-6">
      <div className="min-w-0 lg:border-r lg:border-white/20 lg:pr-6">
        {admin && <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
          <span>Vendedor</span>
          <CompactDropdown label="Vendedor del dashboard" value={filters.vendedor}
            options={[{ value: "", label: "Todos" }, ...users.map(u => ({ value: String(u.idUsuario), label: `${u.nombres} ${u.apellidos}` }))]}
            onChange={vendedor => setFilters(f => ({ ...f, vendedor }))} className="max-w-[13rem]" />
        </div>}
        <div className="grid grid-cols-3 text-center gap-x-2 gap-y-4">
          <div className="col-span-3 border-b border-white/20 pb-4">
            <div className="flex flex-wrap justify-center items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
              {GROUPS[range?.grupo] || "Día"} —
              <CompactDropdown label="Tipo de ingreso" value={filters.tipo}
                options={Object.entries(TYPES).map(([value, text]) => ({ value, label: text }))}
                onChange={tipo => setFilters(f => ({ ...f, tipo }))} />
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight mt-2 break-words" data-testid="ingreso-principal">{stats ? money(stats.totalIngresos) : "—"}</div>
            <p className="text-xs mt-2">{range?.etiqueta || "Hoy"} · {selectedType}</p>
          </div>
          {metrics.map(([name, value, note, testId]) => <div key={name} className="min-w-0">
            <div className="text-[10px] sm:text-xs font-semibold uppercase">{name}</div>
            <div data-testid={testId} className="text-sm sm:text-base font-bold mt-1 break-words" style={name === "Saldo Total" ? { color: "#FAA222" } : undefined}>{value}</div>
            {note && <p className="text-[10px] mt-1 leading-tight">{note}</p>}
          </div>)}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-end gap-1.5 mb-2">
          <div className="flex min-w-0 flex-col gap-0.5 text-[10px] font-medium">
            <span>Período</span>
            <div role="group" aria-label="Grupo temporal" className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-[#061A18]/70 p-0.5">
              {Object.entries(GROUPS).map(([value, text]) => <button key={value} type="button" data-value={value} aria-pressed={group === value} disabled={!options.length}
                className={`h-6 rounded-md px-2 text-[10px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAA222] disabled:opacity-50 ${group === value ? "bg-[#0D5E4F] text-[#F2F2F2]" : "bg-transparent text-[#F2F2F2]/80 hover:bg-[#0D5E4F] hover:text-[#F2F2F2]"}`}
                onClick={() => selectGroup(value)}>{text}</button>)}
            </div>
          </div>
          <label className="flex min-w-0 flex-[1_1_11rem] flex-col gap-0.5 text-[10px] font-medium">Seleccionar {GROUPS[group].toLowerCase()}
            <CompactDropdown label="Período concreto" value={filters.periodo} fullWidth disabled={!options.length}
              options={options.filter(p => p.grupo === group).map(p => ({ value: p.id, label: p.etiqueta }))}
              onChange={periodo => setFilters(f => ({ ...f, periodo }))} />
          </label>
          <label className="flex min-w-0 basis-[8rem] flex-col gap-0.5 text-[10px] font-medium">Serie adicional
            <CompactDropdown label="Serie adicional" value={auxiliary} fullWidth
              options={[{ value: "", label: "Ninguna" }, { value: "totalGastos", label: "Gastos" }, { value: "ganancia", label: "Ganancia" }]}
              onChange={setAuxiliary} />
          </label>
        </div>
        <p className="text-xs mb-2">Tendencia · {range?.etiqueta || "Hoy"}{loading ? " · Actualizando…" : ""}</p>
        <div className="flex flex-wrap gap-4 text-xs mb-1" aria-label="Leyenda de tendencia">
          <span>● {selectedType}</span>
          {auxiliary && <span style={{ color: auxiliary === "ganancia" ? "#FAA222" : "#89D7ED" }}>● {auxiliary === "ganancia" ? "Ganancia" : "Gastos · globales"}</span>}
        </div>
        <div className="h-64 min-w-0 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} onResize={w => setChartWidth(w)}>
            <AreaChart data={data} margin={{ top: 28, right: 24, left: 24, bottom: 12 }} accessibilityLayer>
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#F2F2F2" }} minTickGap={18} />
              <YAxis hide domain={["auto", "auto"]} />
              <Area name={selectedType} type="linear" dataKey="totalIngresos" stroke="#F2F2F2" fill="#F2F2F2" fillOpacity={0.10} strokeWidth={2} dot={{ r: 2 }} activeDot={false} isAnimationActive={false}>
                <LabelList dataKey="totalIngresos" content={label("#F2F2F2", -10)} />
              </Area>
              {auxiliary && <Area name={auxiliary === "ganancia" ? "Ganancia" : "Gastos"} type="linear" dataKey={auxiliary} stroke={auxiliary === "ganancia" ? "#FAA222" : "#89D7ED"} fillOpacity={0} strokeWidth={2} dot={{ r: 2 }} activeDot={false} isAnimationActive={false}>
                <LabelList dataKey={auxiliary} content={label(auxiliary === "ganancia" ? "#FAA222" : "#89D7ED", 17)} />
              </Area>}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
    {filters.vendedor && <p className="text-xs mt-3">Gastos es el total global del negocio para este período; no se atribuye al vendedor.</p>}
  </section>;
}
