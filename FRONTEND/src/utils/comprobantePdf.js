import { jsPDF } from "jspdf";
import { PLAYBALL_REGULAR_BASE64 } from "./fonts/playballBase64";


const NEGOCIO = {
  direccion: "Sebastian Barranca B347",
  ruc: "10729670176",
  whatsapp: "914112976",
};

const fmtFecha = (f) => f ? new Date(f).toLocaleDateString("es-PE", { day:"numeric", month:"numeric", year:"numeric" }) : "—";
const fmtHora  = (f) => f ? new Date(f).toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit" }) : "—";
const money    = (n) => `S/ ${parseFloat(n||0).toFixed(2)}`;

const W = 80;
const MARGEN_INF = 8;
const GAP = 1.4; 




function crearTicket(alturaMm) {
  const doc = new jsPDF({ unit: "mm", format: [W, alturaMm] });
  doc.addFileToVFS("Playball-Regular.ttf", PLAYBALL_REGULAR_BASE64);
  doc.addFont("Playball-Regular.ttf", "Playball", "normal");

  let y = 10;

  
  
  
  
  const altoTexto = (txt) => doc.getTextDimensions(String(txt || " ")).h;

  const aplicarFuente = (font, bold) => doc.setFont(font, font === "Playball" ? "normal" : (bold ? "bold" : "normal"));

  const line = (txt, { size = 8, font = "times", bold = false, align = "center" } = {}) => {
    doc.setFontSize(size);
    aplicarFuente(font, bold);
    const h = altoTexto(txt);
    const x = align === "center" ? W / 2 : align === "right" ? W - 6 : 6;
    doc.text(String(txt ?? ""), x, y + h * 0.78, { align });
    y += h + GAP;
  };

  const row = (label, value, { size = 8, bold = false } = {}) => {
    doc.setFontSize(size);
    aplicarFuente("times", bold);
    const h = Math.max(altoTexto(label), altoTexto(value));
    doc.text(String(label ?? ""), 6, y + h * 0.78);
    doc.text(String(value ?? ""), W - 6, y + h * 0.78, { align: "right" });
    y += h + GAP;
  };

  const tablaHeader = (c1, c2, c3, c4) => {
    doc.setFontSize(7.3);
    aplicarFuente("times", true);
    const h = altoTexto(c1);
    const by = y + h * 0.78;
    doc.text(c1, 6, by);
    doc.text(c2, 14, by);
    doc.text(c3, 58, by, { align: "right" });
    doc.text(c4, W - 6, by, { align: "right" });
    y += h + GAP;
  };

  const tablaFila = (cant, desc, punit, total) => {
    doc.setFontSize(7.3);
    aplicarFuente("times", false);
    const descLineas = doc.splitTextToSize(String(desc ?? ""), 30);
    const h = altoTexto(descLineas[0] || " ");
    const by = y + h * 0.78;
    doc.text(String(cant ?? ""), 6, by);
    doc.text(descLineas[0] ?? "", 14, by);
    doc.text(punit ?? "", 58, by, { align: "right" });
    doc.text(total ?? "", W - 6, by, { align: "right" });
    y += h + GAP;
    for (let i = 1; i < descLineas.length; i++) {
      doc.text(descLineas[i], 14, y + h * 0.78);
      y += h + GAP;
    }
  };

  
  
  
  const hrule = (grueso = false) => {
    y += GAP;
    doc.setDrawColor(0);
    doc.setLineWidth(grueso ? 0.4 : 0.15);
    doc.line(6, y, W - 6, y);
    doc.setLineWidth(0.15);
    y += GAP + 1;
  };

  const parrafo = (txt, { size = 7.5 } = {}) => {
    doc.setFontSize(size);
    aplicarFuente("times", false);
    const lineas = doc.splitTextToSize(String(txt ?? ""), W - 12);
    lineas.forEach(l => {
      const h = altoTexto(l);
      doc.text(l, 6, y + h * 0.78);
      y += h + GAP;
    });
  };

  return { doc, line, row, tablaHeader, tablaFila, hrule, parrafo, alturaActual: () => y };
}





function generarTicket(dibujar) {
  const medidor = crearTicket(500);
  dibujar(medidor);
  const alturaFinal = medidor.alturaActual() + MARGEN_INF;

  const real = crearTicket(alturaFinal);
  dibujar(real);
  return real.doc;
}

export function imprimirComprobanteVenta(venta) {
  const dibujar = ({ line, row, tablaHeader, tablaFila, hrule }) => {
    line("AB  Adrith", { size: 20, font: "Playball" });
    line(NEGOCIO.direccion, { size: 7.5 });
    line(`RUC: ${NEGOCIO.ruc}`, { size: 7.5 });
    line(`WhatsApp: ${NEGOCIO.whatsapp}`, { size: 7.5 });
    hrule();

    const nombreCliente = venta.cliente ? `${venta.cliente.nombre||""} ${venta.cliente.apellido||""}`.trim() : "";
    line(nombreCliente || "Cliente varios", { size: 15, font: "Playball" });
    hrule();

    row("N° Boleta:", `${venta.serieComprobante||"B001"}-${String(venta.idVenta).padStart(6,"0")}`);
    row("Fecha:", fmtFecha(venta.fecha));
    row("Hora:", fmtHora(venta.fecha));
    row("Cajero:", venta.usuario?.nombres || "—");
    hrule();

    tablaHeader("Cant", "Descripción", "P.Unit", "Total");
    (venta.detalles||[]).forEach(d => {
      tablaFila(d.cantidad, d.producto?.nombre || `Prod #${d.producto?.idProducto||""}`,
        (parseFloat(d.precioHistorico)||0).toFixed(2), (parseFloat(d.subtotal)||0).toFixed(2));
    });
    (venta.detallesServicio||[]).forEach(s => {
      const nombre = s.producto?.nombre || s.descripcion || "Servicio";
      const desc = (s.origen||s.destino) ? `${nombre} (${s.origen||"?"} → ${s.destino||"?"})` : nombre;
      tablaFila(1, desc, (parseFloat(s.monto)||0).toFixed(2), (parseFloat(s.subtotal)||0).toFixed(2));
    });
    hrule();

    row("Subtotal:", money(venta.subtotal));
    row("IGV (18%):", money(venta.igv));
    if (parseFloat(venta.descuentoGlobal) > 0) row("Descuento:", `-${money(venta.descuentoGlobal)}`);
    hrule(true);
    row("TOTAL:", money(venta.total), { size: 11, bold: true });
    hrule();

    const pagos = venta.pagos || [];
    if (pagos.length <= 1) {
      row("Método de pago:", pagos[0]?.medioPago || "—");
    } else {
      pagos.forEach(p => row(`${p.medioPago}:`, money(p.monto)));
    }

    hrule();
    if (venta.estado === "anulado") {
      line("*** VENTA ANULADA ***", { size: 11, font: "Playball" });
    } else {
      line("¡Gracias por su compra!", { size: 11, font: "Playball" });
      line("Buen día!", { size: 11, font: "Playball" });
    }
  };

  const doc = generarTicket(dibujar);
  doc.save(`venta-${venta.idVenta}.pdf`);
}

export function imprimirComprobanteCompra(compra) {
  const dibujar = ({ line, row, tablaHeader, tablaFila, hrule, parrafo }) => {
    line("AB  Adrith", { size: 20, font: "Playball" });
    line(NEGOCIO.direccion, { size: 7.5 });
    line(`RUC: ${NEGOCIO.ruc}`, { size: 7.5 });
    line(`WhatsApp: ${NEGOCIO.whatsapp}`, { size: 7.5 });
    hrule();

    line(compra.proveedor?.empresa || "Proveedor", { size: 15, font: "Playball" });
    hrule();

    row("N° Compra:", `${compra.serieComprobante||""} ${String(compra.idCompra).padStart(6,"0")}`.trim());
    row("Fecha:", fmtFecha(compra.fecha));
    row("Comprobante:", compra.tipoComprobante || "—");
    row("Estado:", compra.estado === "anulado" ? "Anulado" : "Confirmado");
    hrule();

    tablaHeader("Cant", "Descripción", "Costo", "Total");
    (compra.detalles||[]).forEach(d => {
      tablaFila(d.cantidad, d.producto?.nombre || `Prod #${d.producto?.idProducto||""}`,
        (parseFloat(d.costoUnitario)||0).toFixed(2), (parseFloat(d.subtotal)||0).toFixed(2));
    });
    hrule();

    row("Subtotal:", money(compra.subtotal));
    if (parseFloat(compra.descuentoGlobal) > 0) row("Descuento:", `-${money(compra.descuentoGlobal)}`);
    if (parseFloat(compra.percepcion) > 0) row("Percepción:", money(compra.percepcion));
    hrule(true);
    row("TOTAL:", money(compra.total), { size: 11, bold: true });

    if (compra.motivo) {
      hrule();
      line("Motivo:", { size: 7.5, bold: true, align: "left" });
      parrafo(compra.motivo);
    }

    hrule();
    line(compra.estado === "anulado" ? "*** COMPRA ANULADA ***" : "Registro de compra", { size: 11, font: "Playball" });
    line("AdrithStore · Ica, Perú", { size: 8, font: "Playball" });
  };

  const doc = generarTicket(dibujar);
  doc.save(`compra-${compra.idCompra}.pdf`);
}
