package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.LogService;
import com.AdrithStore.backend.service.TesoreriaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ventas")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VentaController {

    private final VentaRepository     ventaRepo;
    private final VentaPagoRepository pagoRepo;
    private final ProductoRepository  productoRepo;
    private final ClienteRepository   clienteRepo;
    private final UsuarioRepository   usuarioRepo;
    private final TesoreriaService    tesoreriaService;
    private final LogService          logService;

    @GetMapping
    @Transactional(readOnly = true)
    public List<Venta> listar() {
        return ventaRepo.findAllConPagosOrderByFechaDesc();
    }

    @GetMapping("/todas")
    @Transactional(readOnly = true)
    public List<Venta> todas() {
        return ventaRepo.findAllConPagosOrderByFechaDesc();
    }

    // Ventas filtradas por usuario — para dashboard vendedor
    @GetMapping("/por-usuario/{idUsuario}")
    @Transactional(readOnly = true)
    public List<Venta> porUsuario(@PathVariable Integer idUsuario) {
        return ventaRepo.findByUsuario_IdUsuarioOrderByFechaDesc(idUsuario);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> crear(@RequestBody VentaRequest req) {

        if (req.getIdCliente()  == null) return ResponseEntity.badRequest().body("idCliente requerido.");
        if (req.getIdUsuario()  == null) return ResponseEntity.badRequest().body("idUsuario requerido.");
        if (req.getDetalles()   == null || req.getDetalles().isEmpty())
            return ResponseEntity.badRequest().body("Agrega al menos un producto.");
        if (req.getPagos()      == null || req.getPagos().isEmpty())
            return ResponseEntity.badRequest().body("Agrega al menos una forma de pago.");

        Venta venta = new Venta();

        clienteRepo.findById(req.getIdCliente()).ifPresent(venta::setCliente);
        if (venta.getCliente() == null) return ResponseEntity.badRequest().body("Cliente no encontrado.");

        usuarioRepo.findById(req.getIdUsuario()).ifPresent(venta::setUsuario);
        if (venta.getUsuario() == null) return ResponseEntity.badRequest().body("Usuario no encontrado.");

        venta.setTipoComprobante(req.getTipoComprobante() != null ? req.getTipoComprobante() : "Boleta");
        venta.setSerieComprobante(req.getSerieComprobante() != null ? req.getSerieComprobante() : "B001");
        venta.setEstado("confirmado");
        venta.setFecha(LocalDateTime.now());

        if (!req.getPagos().isEmpty()) venta.setMedioPago(req.getPagos().get(0).getMedioPago());

        BigDecimal totalBruto = BigDecimal.ZERO;

        for (VentaRequest.DetalleItem d : req.getDetalles()) {
            Producto p = productoRepo.findById(d.getIdProducto()).orElse(null);
            if (p == null) continue;

            int cantidad = d.getCantidad() != null ? d.getCantidad() : 1;

            if ("BIEN_FISICO".equals(p.getTipo()) || "CONSUMIBLE".equals(p.getTipo())) {
                if (p.getStock() < cantidad && !Boolean.TRUE.equals(p.getPermiteStockNegativo()))
                    return ResponseEntity.badRequest()
                        .body("Stock insuficiente: " + p.getNombre() + " (disponible: " + p.getStock() + ")");
                p.setStock(p.getStock() - cantidad);
                productoRepo.save(p);
            }

            BigDecimal precio      = p.getPrecioVenta() != null ? p.getPrecioVenta() : BigDecimal.ZERO;
            // Descuento por ítem — no puede superar el precio unitario × cantidad
            BigDecimal dscItem     = d.getDescuentoItem() != null ? d.getDescuentoItem() : BigDecimal.ZERO;
            BigDecimal maxDscItem  = precio.multiply(BigDecimal.valueOf(cantidad));
            if (dscItem.compareTo(maxDscItem) > 0) dscItem = maxDscItem;

            BigDecimal subtotal = precio.multiply(BigDecimal.valueOf(cantidad)).subtract(dscItem);
            totalBruto = totalBruto.add(subtotal);

            VentaDetalle det = new VentaDetalle();
            det.setVenta(venta);
            det.setProducto(p);
            det.setCantidad(cantidad);
            det.setPrecioHistorico(precio);
            det.setCostoHistorico(p.getCpp() != null ? p.getCpp() : BigDecimal.ZERO);
            det.setDescuentoItem(dscItem);
            det.setSubtotal(subtotal);
            venta.getDetalles().add(det);
        }

        if (venta.getDetalles().isEmpty()) return ResponseEntity.badRequest().body("Ningún producto fue encontrado.");

        // Descuento global — monto fijo (ej: redondeo 20.10 → 20.00 = descuento 0.10)
        BigDecimal dscGlobal = req.getDescuentoGlobal() != null ? req.getDescuentoGlobal() : BigDecimal.ZERO;
        if (dscGlobal.compareTo(totalBruto) > 0) dscGlobal = totalBruto; // no puede ser mayor al total
        BigDecimal totalFinal = totalBruto.subtract(dscGlobal).max(BigDecimal.ZERO);

        venta.setDescuentoGlobal(dscGlobal);
        venta.setTotal(totalFinal);
        venta.setSubtotal(totalFinal.divide(BigDecimal.valueOf(1.18), 2, RoundingMode.HALF_UP));
        venta.setIgv(totalFinal.subtract(venta.getSubtotal()));

        // Validar pago suficiente
        BigDecimal totalPagado = req.getPagos().stream()
            .map(p -> p.getMonto() != null ? p.getMonto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPagado.compareTo(totalFinal.subtract(BigDecimal.valueOf(0.01))) < 0)
            return ResponseEntity.badRequest()
                .body("Pago insuficiente: pagado S/ " + totalPagado + ", total S/ " + totalFinal);

        Venta guardada = ventaRepo.save(venta);

        for (VentaRequest.PagoItem pi : req.getPagos()) {
            if (pi.getMonto() == null || pi.getMonto().compareTo(BigDecimal.ZERO) <= 0) continue;
            VentaPago pago = new VentaPago();
            pago.setVenta(guardada);
            pago.setMedioPago(pi.getMedioPago() != null ? pi.getMedioPago() : "Efectivo");
            pago.setMonto(pi.getMonto());
            pagoRepo.save(pago);
            try {
                tesoreriaService.registrar(
                    "VENTA", mapearCuenta(pi.getMedioPago()), pi.getMonto(), 1,
                    "Venta #" + guardada.getIdVenta() + " — " + pi.getMedioPago(),
                    guardada.getIdVenta(), null, "pos");
            } catch (Exception e) {
                System.err.println("[VentaController] Tesorería: " + e.getMessage());
            }
        }

        logService.log(LogService.VENTA_CREADA, "Venta", guardada.getIdVenta(),
            "Venta #" + guardada.getIdVenta() + " por " +
            guardada.getUsuario().getNombres() + " — S/ " + totalFinal, null);

        return ResponseEntity.ok(Map.of(
            "idVenta", guardada.getIdVenta(),
            "total",   totalFinal,
            "descuentoGlobal", dscGlobal,
            "mensaje", "Venta registrada exitosamente."
        ));
    }

    // ── ANULAR VENTA ─────────────────────────────────────────────────────
    @PatchMapping("/{id}/anular")
    @Transactional
    public ResponseEntity<?> anular(@PathVariable Integer id,
                                    @RequestBody Map<String, String> body) {
        String motivo = body.getOrDefault("motivo", "").trim();
        if (motivo.isEmpty()) return ResponseEntity.badRequest().body("El motivo es obligatorio.");

        return ventaRepo.findById(id).map(v -> {
            if (!"confirmado".equals(v.getEstado()))
                return ResponseEntity.badRequest().body("La venta ya fue anulada.");

            // Revertir stock de cada producto
            for (VentaDetalle det : v.getDetalles()) {
                Producto p = det.getProducto();
                if (p != null && ("BIEN_FISICO".equals(p.getTipo()) || "CONSUMIBLE".equals(p.getTipo()))) {
                    p.setStock(p.getStock() + det.getCantidad());
                    productoRepo.save(p);
                }
            }

            v.setEstado("anulado");
            v.setMotivo(motivo);
            ventaRepo.save(v);

            logService.log("VENTA_ANULADA", "Venta", v.getIdVenta(),
                "Venta #" + v.getIdVenta() + " anulada — " + motivo, null);

            return ResponseEntity.ok(Map.of("mensaje", "Venta anulada correctamente."));
        }).orElse(ResponseEntity.notFound().build());
    }

    private String mapearCuenta(String medioPago) {
        if (medioPago == null) return "Caja Fisica";
        return switch (medioPago.toLowerCase()) {
            case "plin"                      -> "Plin";
            case "yape"                      -> "Yape";
            case "tarjeta"                   -> "Tarjeta";
            case "transferencia"             -> "Transferencia";
            case "otro"                       -> "Otro";
            default                          -> "Caja Fisica";
        };
    }

    @Data
    public static class VentaRequest {
        private Integer    idCliente;
        private Integer    idUsuario;
        private String     tipoComprobante;
        private String     serieComprobante;
        private BigDecimal descuentoGlobal;
        private List<PagoItem>    pagos;
        private List<DetalleItem> detalles;

        @Data public static class PagoItem {
            private String     medioPago;
            private BigDecimal monto;
        }
        @Data public static class DetalleItem {
            private Integer    idProducto;
            private Integer    cantidad;
            private BigDecimal descuentoItem; // monto fijo descontado del ítem
        }
    }
}