import { useState } from "react";

const PERIODOS = [
  { k:"hoy",    l:"Hoy" },
  { k:"semana", l:"7 días" },
  { k:"mes",    l:"Mes" },
  { k:"año",    l:"Año" },
];

function calcularRango(periodo) {
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  let ini;
  switch (periodo) {
    case "semana":       ini = new Date(hoy); ini.setDate(hoy.getDate()-7);  break;
    case "mes":          ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1); break;
    case "año":          ini = new Date(hoy.getFullYear(), 0, 1);            break;
    default:             ini = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); break;
  }
  return {
    desde: ini.toISOString().split("T")[0],
    hasta: fin.toISOString().split("T")[0],
  };
}

const S = {
  label: { fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 },
  input: { padding:"8px 12px", borderRadius:10, border:"1.5px solid rgba(13,94,79,0.12)", fontSize:13, outline:"none", fontFamily:"inherit", color:"#1F1F1F", background:"#fff" },
  btn:   { padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit", transition:"all 0.15s" },
};

export default function FiltroFecha({ desde, hasta, onChange }) {
  const [activo, setActivo] = useState("hoy");

  const handlePeriodo = (k) => {
    setActivo(k);
    const r = calcularRango(k);
    onChange(r.desde, r.hasta);
  };

  return (
    <div className="no-print" style={{ display:"flex", alignItems:"end", gap:12, flexWrap:"wrap", marginBottom:20 }}>
      {PERIODOS.map(p => (
        <button key={p.k} onClick={() => handlePeriodo(p.k)}
          style={{ ...S.btn,
            background: activo === p.k ? "#0D5E4F" : "#F1F3F2",
            color:      activo === p.k ? "#fff"    : "#666",
            boxShadow:  activo === p.k ? "0 4px 12px rgba(13,94,79,0.25)" : "0 1px 3px #0001",
          }}>
          {p.l}
        </button>
      ))}
      <div style={{ display:"flex", alignItems:"end", gap:8, marginLeft:"auto" }}>
        <div>
          <div style={S.label}>Desde</div>
          <input type="date" value={desde} onChange={e => { setActivo(""); onChange(e.target.value, hasta); }}
            style={S.input} />
        </div>
        <div>
          <div style={S.label}>Hasta</div>
          <input type="date" value={hasta} onChange={e => { setActivo(""); onChange(desde, e.target.value); }}
            style={S.input} />
        </div>
      </div>
    </div>
  );
}
