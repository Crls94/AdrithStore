import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import CalendarHeatmap from "@freecodecamp/react-calendar-heatmap";
import api from "../../api/axiosConfig";
import { getVentasHeatmap } from "../../api/reportesApi";

const FMT = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

// Tamaño fijo en píxeles de cada cuadro del día. La librería usa viewBox de
// 10 uds. y se estira al ancho del contenedor; para que el cuadro sea SIEMPRE
// del mismo tamaño calculamos el ancho en px del SVG según el nº de semanas.
const CELDA_PX     = 13;
const GUTTER_PX    = 3;
const WEEKDAY_W    = 30;   // espacio para las etiquetas de día a la izquierda

// Aproxima getWeekCount() de la librería: semanas alineadas a domingo.
function calcularAnchoSvgPx(desde, hasta) {
  const dIni = new Date(desde + "T00:00:00");
  const dFin = new Date(hasta + "T00:00:00");
  const dias = Math.round((dFin - dIni) / 86400000) + 1; // inclusive
  const emptyStart = dIni.getDay();
  const emptyEnd = 6 - dFin.getDay();
  const semanas = Math.ceil((dias + emptyStart + emptyEnd) / 7);
  return (semanas * (CELDA_PX + GUTTER_PX)) + WEEKDAY_W;
}


const PERIODOS = [
  { k: "hoy",    l: "Hoy" },
  { k: "semana", l: "7 días" },
  { k: "mes",    l: "Mes" },
  { k: "año",    l: "Año" },
];

function calcularRango(periodo) {
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let ini;
  switch (periodo) {
    case "semana": ini = new Date(hoy); ini.setDate(hoy.getDate() - 7); break;
    case "mes":    ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1); break;
    case "año":    ini = new Date(hoy.getFullYear(), 0, 1); break;
    default:       ini = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); break;
  }
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { desde: iso(ini), hasta: iso(fin) };
}

const S = {
  select: {
    padding: "6px 10px", borderRadius: 8, border: "1.5px solid rgba(13,94,79,0.15)",
    fontSize: 12, outline: "none", fontFamily: "inherit", color: "#1F1F1F", background: "#fff", cursor: "pointer",
  },
  fecha: {
    padding: "5px 8px", borderRadius: 8, border: "1.5px solid rgba(13,94,79,0.15)",
    fontSize: 12, outline: "none", fontFamily: "inherit", color: "#1F1F1F", background: "#fff",
  },
  label: { fontSize: 10, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 },
};

// Cuatro niveles de intensidad según el monto respecto al máximo del rango.
function nivelIntensidad(monto, max) {
  if (!monto || max <= 0) return 0;
  const r = monto / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5)  return 2;
  if (r <= 0.75) return 3;
  return 4;
}

export default function HeatmapCard() {
  const [modo,        setModo]        = useState("categoria");
  const [idCategoria, setIdCategoria] = useState("");
  const [idProducto,  setIdProducto]  = useState("");
  const [idVendedor,  setIdVendedor]  = useState("");
  const [activo,      setActivo]      = useState("mes");
  const [desde,       setDesde]       = useState(() => calcularRango("mes").desde);
  const [hasta,       setHasta]       = useState(() => calcularRango("mes").hasta);

  const [categorias,  setCategorias] = useState([]);
  const [productos,   setProductos]  = useState([]);
  const [vendedores,  setVendedores] = useState([]);
  const [datos,       setDatos]      = useState([]);
  const [cargando,    setCargando]   = useState(false);

  useEffect(() => {
    api.get("/categorias").then(r => setCategorias(Array.isArray(r.data) ? r.data : []));
    api.get("/productos").then(r => setProductos(Array.isArray(r.data) ? r.data : []));
    api.get("/usuarios").then(r => {
      const list = Array.isArray(r.data) ? r.data : [];
      setVendedores(list.filter(u => u.rol === "VENDEDOR"));
    });
  }, []);

  const seleccionarPeriodo = (k) => {
    setActivo(k);
    const r = calcularRango(k);
    setDesde(r.desde);
    setHasta(r.hasta);
  };

  // En modo producto, al elegir una categoría se limita la lista de productos.
  const productosDisponibles = useMemo(() => {
    if (!idCategoria) return productos;
    return productos.filter(p => p.categoria && String(p.categoria.idCategoria) === String(idCategoria));
  }, [productos, idCategoria]);

  const cargar = useCallback(() => {
    const params = { desde, hasta };
    if (idProducto)  params.idProducto = idProducto;
    if (idCategoria) params.idCategoria = idCategoria;
    if (idVendedor)  params.idVendedor = idVendedor;
    setCargando(true);
    getVentasHeatmap(params)
      .then(r => setDatos((r.data?.content) || []))
      .catch(() => setDatos([]))
      .finally(() => setCargando(false));
  }, [desde, hasta, idProducto, idCategoria, idVendedor]);

  useEffect(() => { cargar(); }, [cargar]);

  const values = usoDatos(datos);
  const maxMonto = useMemo(() => values.reduce((m, v) => Math.max(m, v.count || 0), 0), [values]);

  const seleccion = modo === "categoria"
    ? (categorias.find(c => String(c.idCategoria) === String(idCategoria))?.nombre || "Todas las categorías")
    : (productos.find(p => String(p.idProducto) === String(idProducto))?.nombre || "Todos los productos");

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="text-[14px] text-center font-extrabold uppercase tracking-widest text-brand/70">
          Mapa de calor de ventas
        </div>
      </div>

      {}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-brand/15 text-xs font-bold">
          <button onClick={() => setModo("categoria")}
            className={clsx("px-3 py-1.5 transition-all cursor-pointer",
              modo === "categoria" ? "bg-brand text-white" : "bg-white text-gray-600 hover:bg-surface")}>
            Categoría
          </button>
          <button onClick={() => setModo("producto")}
            className={clsx("px-3 py-1.5 transition-all cursor-pointer",
              modo === "producto" ? "bg-brand text-white" : "bg-white text-gray-600 hover:bg-surface")}>
            Producto
          </button>
        </div>

        <div className="flex gap-1.5 ml-auto">
          {PERIODOS.map(p => (
            <button key={p.k} onClick={() => seleccionarPeriodo(p.k)}
              className={clsx("px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all cursor-pointer",
                activo === p.k ? "bg-brand text-white" : "bg-white text-gray-600 border border-brand/15 hover:text-brand")}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="flex items-end gap-2 mb-3 flex-shrink-0 flex-wrap">
        {modo === "categoria" ? (
          <div>
            <div style={S.label}>Categoría</div>
            <select style={S.select} value={idCategoria} onChange={e => { setIdCategoria(e.target.value); setIdProducto(""); }}>
              <option value="">Todas</option>
              {categorias.map(c => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <div style={S.label}>Producto</div>
            <select style={S.select} value={idProducto} onChange={e => setIdProducto(e.target.value)}>
              <option value="">Todos</option>
              {productosDisponibles.map(p => <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        <div>
          <div style={S.label}>Vendedor</div>
          <select style={S.select} value={idVendedor} onChange={e => setIdVendedor(e.target.value)}>
            <option value="">Todos</option>
            {vendedores.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombres}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <div>
            <div style={S.label}>Desde</div>
            <input type="date" style={S.fecha} value={desde} onChange={e => { setActivo(""); setDesde(e.target.value); }} />
          </div>
          <div>
            <div style={S.label}>Hasta</div>
            <input type="date" style={S.fecha} value={hasta} onChange={e => { setActivo(""); setHasta(e.target.value); }} />
          </div>
        </div>
      </div>

      {}
      <div className="relative">
        <div className={clsx("transition-opacity", cargando && "opacity-40 pointer-events-none")}>
          <div className="heatmap-scroll">
            <div style={{ width: calcularAnchoSvgPx(desde, hasta) }} className="heatmap-canvas">
              <CalendarHeatmap
                startDate={new Date(desde + "T00:00:00")}
                endDate={new Date(hasta + "T00:00:00")}
                values={values}
                showOutOfRangeDays={false}
                classForValue={(v) => {
                  if (!v || !v.count) return "heat-0";
                  return `heat-${nivelIntensidad(v.count, maxMonto)}`;
                }}
                titleForValue={(v) => {
                  if (!v || !v.count) return "";
                  const d = new Date(v.date);
                  const texto = d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
                  return `${texto} — ${FMT.format(v.count)}`;
                }}
              />
            </div>
          </div>
        </div>
        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-xs text-brand font-semibold">Cargando…</div>
          </div>
        )}
      </div>

      {}
      <div className="flex items-center justify-between mt-2 flex-shrink-0 flex-wrap gap-2">
        <div className="text-[11px] text-gray-500">
          <span className="font-bold text-brand">{seleccion}</span> · {FMT.format(maxMonto)} máximo en el período
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span>Menos</span>
          {["heat-0", "heat-1", "heat-2", "heat-3", "heat-4"].map(c => (
            <span key={c} className="inline-block w-2.5 h-2.5 rounded-sm heat-square" data-level={c} />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}

// datos: [{fecha:'YYYY-MM-DD', monto}] → [{date, count}]
function usoDatos(datos) {
  return (datos || []).map(d => ({ date: d.fecha, count: parseFloat(d.monto || 0) }));
}
