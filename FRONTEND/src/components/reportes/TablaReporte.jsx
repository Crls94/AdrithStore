import { useState, useEffect } from "react";

const C = {
  emerald:"#0D5E4F", teal:"#0A3D3A",
  tangerine:"#E07A2F", warmWhite:"#FAFAF8",
  softGray:"#F1F3F2", charcoal:"#1F1F1F",
  border:"rgba(13,94,79,0.12)",
};

const money = (n) => `S/ ${parseFloat(n||0).toFixed(2)}`;

export default function TablaReporte({
  columnas, data, totales, loading,
  onSort, sortBy, sortDir,
  pagina, totalPaginas, onCambiarPagina,
  renderExpandible, mensajeVacio, pageSize = 20,
}) {
  const [expandida, setExpandida] = useState(null);
  const toggleExpandir = (idx) => setExpandida(prev => prev === idx ? null : idx);
  useEffect(() => { setExpandida(null); }, [pagina]);

  const gridTemplate = columnas.map(c => c.width || "1fr").join(" ");

  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:40, color:C.emerald, fontSize:15 }}>
        Cargando...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding:40, textAlign:"center", color:"#bbb", fontSize:14 }}>
        {mensajeVacio || "Sin datos disponibles"}
      </div>
    );
  }

  return (
    <div style={{ background:"#fff", borderRadius:16,
      border:`1px solid ${C.border}`, overflow:"hidden" }}>

      { }
      <div style={{ display:"grid", gridTemplateColumns: gridTemplate,
        padding:"10px 16px", background:C.softGray,
        fontSize:11, fontWeight:700, color:"#888",
        textTransform:"uppercase", letterSpacing:"0.8px" }}>
        {columnas.map(col => (
          <span key={col.key}
            onClick={() => col.sortable && onSort && onSort(col.key)}
            style={{
              cursor: col.sortable ? "pointer" : "default",
              textAlign: col.numeric ? "right" : "left",
              userSelect:"none",
            }}>
            {col.label}
            {col.sortable && sortBy === col.key && (
              <span style={{ marginLeft:4 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
            )}
          </span>
        ))}
      </div>

      { }
      {data.map((row, i) => {
        const idx = pagina != null ? pagina * pageSize + i : i;
        const abierta = expandida === idx;
        return (
          <div key={i}
            style={{ borderBottom: i < data.length-1 ? `1px solid ${C.border}` : "none" }}>

            <div style={{ display:"grid", gridTemplateColumns: gridTemplate,
              padding:"11px 16px", alignItems:"center",
              cursor: renderExpandible ? "pointer" : "default",
              background: abierta ? "#F8FDF8" : i % 2 === 0 ? "#fff" : "#FAFAFA",
              transition:"background 0.12s" }}
              onClick={() => renderExpandible && toggleExpandir(idx)}>

              {columnas.map(col => {
                const raw = row[col.key];
                let valor = raw;
                if (col.render) valor = col.render(raw, row);
                if (col.numeric && typeof raw === "number" && col.isMoney !== false) valor = money(raw);
                return (
                  <span key={col.key} style={{
                    fontSize:13, fontWeight: col.numeric ? 700 : 600,
                    color: col.color ? col.color(raw, row) : C.charcoal,
                    textAlign: col.numeric ? "right" : "left",
                    whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                  }}>
                    {valor ?? "—"}
                  </span>
                );
              })}
            </div>

            { }
            {abierta && renderExpandible && (
              <div style={{ borderTop:`1px solid ${C.border}`, background:"#F8FDF8",
                padding:"16px 20px" }}>
                {renderExpandible(row)}
              </div>
            )}
          </div>
        );
      })}

      { }
      {totales && Object.keys(totales).length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns: gridTemplate,
          padding:"12px 16px", background:"#0D5E4F", color:"#fff",
          fontSize:13, fontWeight:700, borderTop:`2px solid ${C.emerald}` }}>
          {columnas.map(col => {
            const val = totales[col.key];
            return (
              <span key={col.key} style={{
                textAlign: col.numeric ? "right" : "left",
                fontSize: col.numeric ? 14 : 13,
              }}>
                {col.numeric && val != null ? (col.isMoney !== false ? money(val) : val) : col.key === columnas[0]?.key ? "Totales" : ""}
              </span>
            );
          })}
        </div>
      )}

      { }
      {totalPaginas > 1 && onCambiarPagina && (
        <div className="no-print" style={{ display:"flex", justifyContent:"center", alignItems:"center",
          gap:12, padding:"14px 16px", borderTop:`1px solid ${C.border}` }}>
          <button onClick={() => onCambiarPagina(pagina - 1)} disabled={pagina <= 0}
            style={{ padding:"7px 16px", borderRadius:8, border:"none",
              background: pagina <= 0 ? "#eee" : C.emerald,
              color: pagina <= 0 ? "#aaa" : "#fff",
              cursor: pagina <= 0 ? "not-allowed" : "pointer",
              fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
            ← Anterior
          </button>
          <span style={{ fontSize:12, color:"#888", fontWeight:600 }}>
            Página {pagina + 1} de {totalPaginas}
          </span>
          <button onClick={() => onCambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas - 1}
            style={{ padding:"7px 16px", borderRadius:8, border:"none",
              background: pagina >= totalPaginas - 1 ? "#eee" : C.emerald,
              color: pagina >= totalPaginas - 1 ? "#aaa" : "#fff",
              cursor: pagina >= totalPaginas - 1 ? "not-allowed" : "pointer",
              fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
