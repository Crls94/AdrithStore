import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const btnBase = {
  padding:"6px 14px", borderRadius:8, border:"none",
  cursor:"pointer", fontSize:11, fontWeight:700,
  fontFamily:"inherit", transition:"all 0.12s",
};

function extraerFilas(data, columnas) {
  const filas = data.map(row => {
    const fila = {};
    columnas.forEach(col => {
      let val = row[col.key];
      if (col.render) val = col.render(val, row);
      fila[col.label] = val ?? "";
    });
    return fila;
  });
  return filas;
}

function exportarExcel(data, columnas, titulo) {
  const filas = extraerFilas(data, columnas);
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, titulo || "Reporte");
  XLSX.writeFile(wb, `${titulo || "reporte"}.xlsx`);
}

function exportarCSV(data, columnas, titulo) {
  const headers = columnas.map(c => c.label);
  const lines = [headers.join(",")];
  data.forEach(row => {
    const vals = columnas.map(col => {
      let val = row[col.key];
      if (col.render) val = col.render(val, row);
      const s = String(val ?? "");
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    });
    lines.push(vals.join(","));
  });
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${titulo || "reporte"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportarPDF(data, columnas, titulo) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const headers = columnas.map(c => c.label);
  const body = data.map(row =>
    columnas.map(col => {
      let val = row[col.key];
      if (col.render) val = col.render(val, row);
      return val != null ? String(val) : "";
    })
  );
  doc.text(titulo || "Reporte", 14, 15);
  doc.autoTable({
    head: [headers],
    body,
    startY: 22,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [13, 94, 79] },
    didDrawPage: (data) => {
      doc.setFontSize(6);
      doc.text(`Página ${doc.getNumberOfPages()}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 8);
    },
  });
  doc.save(`${titulo || "reporte"}.pdf`);
}

function exportarHTML() {
  window.print();
}

export default function ExportButtons({ data, columnas, titulo }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
      <button onClick={() => exportarExcel(data, columnas, titulo)} style={{ ...btnBase, background:"#E8F5E9", color:"#2E7D32" }}>
        📊 Excel
      </button>
      <button onClick={() => exportarCSV(data, columnas, titulo)} style={{ ...btnBase, background:"#FFF3E0", color:"#B84D00" }}>
        📄 CSV
      </button>
      <button onClick={() => exportarPDF(data, columnas, titulo)} style={{ ...btnBase, background:"#FFEBEE", color:"#C62828" }}>
        📕 PDF
      </button>
      <button onClick={exportarHTML} style={{ ...btnBase, background:"#E8F0FE", color:"#1A73E8" }}>
        🖨️ Imprimir
      </button>
    </div>
  );
}
