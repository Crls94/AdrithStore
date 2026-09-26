import { useState } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, LabelList } from "recharts";

export const money = (n) => `S/ ${Number(n ?? 0).toFixed(2)}`;
export const TYPES = { ingresos: "Ingresos", productos: "Productos", servicios: "Servicios" };
const GROUPS = { dia: "Día", semana: "Semana", mes: "Mes", año: "Año" };
const control = "min-h-10 max-w-full rounded-lg px-2 py-1 text-xs font-semibold bg-white text-[#005522] border border-white/30";

export function MetricNotes({ data }) {
  return <>
    {data?.costosAusentes > 0 && <p className="text-xs mt-2" role="note">Hay {data.costosAusentes} líneas sin costo histórico registrado. Costos y ganancia reflejan únicamente los costos disponibles.</p>}
    {Number(data?.descuentosGlobalesHistoricos) > 0 && <p className="text-xs mt-2" role="note">Importes de líneas guardadas. Descuentos globales históricos: {money(data.descuentosGlobalesHistoricos)}, sin redistribuir entre productos y servicios.</p>}
  </>;
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
    ["Costos", stats ? money(stats.totalCostos) : "—"],
    ["Ticket Prom.", stats ? money(stats.ticketPromedio) : "—"],
    ["Ganancia", stats ? money(stats.ganancia) : "—"],
    ["Gastos", stats ? money(stats.totalGastos) : "—", "Global del negocio"],
    ...(admin ? [["Saldo Total", treasury ? money(treasury.totalGeneral) : "—", "Actual · todas las cuentas"]] : []),
  ];

  return <section className="rounded-3xl p-4 sm:p-5 lg:p-6 min-w-0" style={{ background: "#005522", color: "#F2F2F2" }} aria-label="Resumen y tendencia" aria-busy={loading}>
    {error && <p role="alert" className="mb-3 text-sm">{error}</p>}
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,2fr)_minmax(0,3fr)] gap-5 lg:gap-6">
      <div className="min-w-0 lg:border-r lg:border-white/20 lg:pr-6">
        {admin && <label className="flex justify-center items-center gap-2 text-xs mb-3">Vendedor
          <select aria-label="Vendedor del dashboard" className={control} value={filters.vendedor} onChange={e => setFilters(f => ({ ...f, vendedor: e.target.value }))}>
            <option value="">Todos</option>
            {users.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombres} {u.apellidos}</option>)}
          </select>
        </label>}
        <div className="grid grid-cols-3 text-center gap-x-2 gap-y-4">
          <div className="col-span-3 border-b border-white/20 pb-4">
            <label className="flex flex-wrap justify-center items-center gap-2 text-xs font-bold uppercase tracking-wide">
              {GROUPS[range?.grupo] || "Día"} —
              <select aria-label="Tipo de ingreso" className={control} value={filters.tipo} onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}>
                {Object.entries(TYPES).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
              </select>
            </label>
            <div className="text-3xl sm:text-4xl font-black tracking-tight mt-2 break-words" data-testid="ingreso-principal">{stats ? money(stats.totalIngresos) : "—"}</div>
            <p className="text-xs mt-2">{range?.etiqueta || "Hoy"} · {selectedType}</p>
          </div>
          {metrics.map(([name, value, note]) => <div key={name} className="min-w-0">
            <div className="text-[10px] sm:text-xs font-semibold uppercase">{name}</div>
            <div className="text-sm sm:text-base font-bold mt-1 break-words" style={name === "Saldo Total" ? { color: "#FAA222" } : undefined}>{value}</div>
            {note && <p className="text-[10px] mt-1 leading-tight">{note}</p>}
          </div>)}
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-end gap-2 mb-3">
          <label className="flex flex-col gap-1 text-xs">Período
            <select aria-label="Grupo temporal" className={control} value={group} onChange={e => selectGroup(e.target.value)} disabled={!options.length}>
              {Object.entries(GROUPS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs min-w-0">Seleccionar {GROUPS[group].toLowerCase()}
            <select aria-label="Período concreto" className={control} value={filters.periodo} onChange={e => setFilters(f => ({ ...f, periodo: e.target.value }))} disabled={!options.length}>
              {options.filter(p => p.grupo === group).map(p => <option key={p.id} value={p.id}>{p.etiqueta}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">Serie adicional
            <select aria-label="Serie adicional" className={control} value={auxiliary} onChange={e => setAuxiliary(e.target.value)}>
              <option value="">Ninguna</option><option value="totalGastos">Gastos</option><option value="ganancia">Ganancia</option>
            </select>
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
        <details className="text-xs mt-2">
          <summary className="cursor-pointer min-h-8">Ver todos los valores</summary>
          <div className="max-h-48 overflow-auto">
            <table className="w-full text-right"><thead><tr><th className="text-left">Fecha / hora</th><th>{selectedType}</th>{auxiliary && <th>{auxiliary === "ganancia" ? "Ganancia" : "Gastos globales"}</th>}</tr></thead>
              <tbody>{data.map(d => <tr key={d.fecha}><td className="text-left py-1">{d.fecha.replace("T", " ").slice(0, 16)}</td><td>{money(d.totalIngresos)}</td>{auxiliary && <td>{money(d[auxiliary])}</td>}</tr>)}</tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
    {filters.vendedor && <p className="text-xs mt-3">Gastos es el total global del negocio para este período; no se atribuye al vendedor.</p>}
    <MetricNotes data={stats} />
  </section>;
}
