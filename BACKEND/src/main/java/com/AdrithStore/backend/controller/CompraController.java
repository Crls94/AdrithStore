package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CompraController {

    private final CompraRepository       compraRepo;
    private final ProveedorRepository    proveedorRepo;
    private final ProductoRepository     productoRepo;
    private final CompraAjusteRepository ajusteRepo;
    private final LogService             logService;

    @GetMapping
    public List<Compra> listar() {
        return compraRepo.findAllByOrderByFechaDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Compra> obtener(@PathVariable Integer id) {
        return compraRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ── POST: crear compra ────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody CompraRequest req) {

        Proveedor proveedor = proveedorRepo.findById(req.getIdProveedor()).orElse(null);
        if (proveedor == null)
            return ResponseEntity.badRequest().body("Proveedor no encontrado.");

        Compra compra = new Compra();
        compra.setProveedor(proveedor);
        compra.setTipoComprobante(req.getTipoComprobante());
        compra.setSerieComprobante(req.getSerieComprobante());
        // Regla de fecha: si viene fecha del frontend la usa, si no usa ahora
        compra.setFecha(req.getFechaIngreso() != null ? req.getFechaIngreso() : LocalDateTime.now());
        compra.setEstado("confirmado");
        compra.setPercepcion(req.getPercepcion()      != null ? req.getPercepcion()      : BigDecimal.ZERO);
        compra.setDescuentoGlobal(req.getDescuentoGlobal() != null ? req.getDescuentoGlobal() : BigDecimal.ZERO);

        List<CompraDetalle> detalles = new ArrayList<>();
        BigDecimal totalGeneral      = BigDecimal.ZERO;

        for (CompraRequest.DetalleItem item : req.getDetalles()) {
            Producto producto = productoRepo.findById(item.getIdProducto()).orElse(null);
            if (producto == null) continue;

            // ── Calcular cantidad real y costo real según bonificación ──
            int cantidadFacturada = item.getCantidad();
            int unidadesBonif     = item.getUnidadesBonificacion() != null ? item.getUnidadesBonificacion() : 0;
            int cantidadTotal     = cantidadFacturada + unidadesBonif; // total que entra al almacén

            BigDecimal costoTotalLote = item.getCostoUnitario()
                .multiply(BigDecimal.valueOf(cantidadFacturada))
                .setScale(4, RoundingMode.HALF_UP);

            // Costo unitario real = costo total / cantidad total (incluyendo bonificadas)
            BigDecimal costoUnitarioReal = cantidadTotal > 0
                ? costoTotalLote.divide(BigDecimal.valueOf(cantidadTotal), 4, RoundingMode.HALF_UP)
                : item.getCostoUnitario();

            BigDecimal cppAnterior = producto.getCpp() != null && producto.getCpp().compareTo(BigDecimal.ZERO) > 0
                ? producto.getCpp() : producto.getPrecioCosto();

            // ── Si hay bonificación de PRODUCTO DISTINTO ──────────────
            // Distribuir una porción del costo al producto regalado
            BigDecimal costoLoteAjustado = costoTotalLote; // puede reducirse si hay bonif distinto
            if (item.getIdProductoBonif() != null && item.getCantidadBonif() != null
                    && item.getCantidadBonif() > 0) {

                Producto prodBonif = productoRepo.findById(item.getIdProductoBonif()).orElse(null);
                if (prodBonif != null) {
                    // Costo del regalo: usar el ingresado por el usuario o el CPP existente
                    BigDecimal cppBonif;
                    BigDecimal costoBonifTotal;
                    if (item.getCostoBonifTotal() != null && item.getCostoBonifTotal().compareTo(BigDecimal.ZERO) > 0) {
                        // El usuario ingresó el costo total del regalo (producto sin CPP previo)
                        costoBonifTotal = item.getCostoBonifTotal().setScale(4, RoundingMode.HALF_UP);
                        cppBonif = item.getCantidadBonif() > 0
                            ? costoBonifTotal.divide(BigDecimal.valueOf(item.getCantidadBonif()), 4, RoundingMode.HALF_UP)
                            : costoBonifTotal;
                    } else {
                        // Usar CPP existente del producto regalado
                        cppBonif = prodBonif.getCpp() != null && prodBonif.getCpp().compareTo(BigDecimal.ZERO) > 0
                            ? prodBonif.getCpp() : prodBonif.getPrecioCosto();
                        if (cppBonif == null || cppBonif.compareTo(BigDecimal.ZERO) == 0) {
                            // Sin CPP y sin costo ingresado: no hacer distribución, solo sumar stock
                            cppBonif = BigDecimal.ZERO;
                        }
                        costoBonifTotal = cppBonif
                            .multiply(BigDecimal.valueOf(item.getCantidadBonif()))
                            .setScale(4, RoundingMode.HALF_UP);
                    }

                    // Restar del costo del producto pagado
                    costoLoteAjustado = costoTotalLote.subtract(costoBonifTotal);
                    if (costoLoteAjustado.compareTo(BigDecimal.ZERO) < 0)
                        costoLoteAjustado = BigDecimal.ZERO;

                    // Calcular nuevo CPP del producto bonificado
                    int stockBonifActual = prodBonif.getStock() != null ? prodBonif.getStock() : 0;
                    int stockBonifNuevo  = stockBonifActual + item.getCantidadBonif();
                    BigDecimal cppBonifAnterior = prodBonif.getCpp() != null ? prodBonif.getCpp() : prodBonif.getPrecioCosto();

                    BigDecimal cppBonifNuevo = stockBonifNuevo > 0
                        ? cppBonifAnterior.multiply(BigDecimal.valueOf(stockBonifActual))
                            .add(cppBonif.multiply(BigDecimal.valueOf(item.getCantidadBonif())))
                            .divide(BigDecimal.valueOf(stockBonifNuevo), 4, RoundingMode.HALF_UP)
                        : cppBonif;

                    // Crear detalle para el producto bonificado
                    CompraDetalle detBonif = new CompraDetalle();
                    detBonif.setCompra(compra);
                    detBonif.setProducto(prodBonif);
                    detBonif.setCantidad(item.getCantidadBonif());
                    detBonif.setCostoUnitario(cppBonif);
                    detBonif.setCostoAnterior(cppBonifAnterior);
                    detBonif.setSubtotal(costoBonifTotal);
                    // Subtotal NO suma al total de la factura (es costo distribuido, no pagado extra)
                    detalles.add(detBonif);

                    prodBonif.setStock(stockBonifNuevo);
                    prodBonif.setCpp(cppBonifNuevo);
                    prodBonif.setPrecioCosto(cppBonifNuevo);
                    productoRepo.save(prodBonif);

                    logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", prodBonif.getIdProducto(),
                        "Bonif. distinta desde compra | " + prodBonif.getNombre()
                            + " +" + item.getCantidadBonif() + " und. | costo dist: " + costoBonifTotal,
                        null);
                }
            }

            // ── Recalcular costoUnitarioReal con costoLoteAjustado ────
            costoUnitarioReal = cantidadTotal > 0
                ? costoLoteAjustado.divide(BigDecimal.valueOf(cantidadTotal), 4, RoundingMode.HALF_UP)
                : item.getCostoUnitario();

            CompraDetalle det = new CompraDetalle();
            det.setCompra(compra);
            det.setProducto(producto);
            det.setCantidad(cantidadTotal);      // stock total que entra
            det.setCostoUnitario(costoUnitarioReal);
            det.setCostoAnterior(cppAnterior);
            det.setVencimiento(item.getVencimiento());
            det.setDescuentoPct(item.getDescuentoPct() != null ? item.getDescuentoPct() : BigDecimal.ZERO);
            det.setSubtotal(costoTotalLote);     // lo que realmente pagué en factura
            totalGeneral = totalGeneral.add(costoTotalLote);
            detalles.add(det);

            // ── Nuevo CPP ─────────────────────────────────────────────
            int stockActual = producto.getStock() != null ? producto.getStock() : 0;
            int nuevoStock  = stockActual + cantidadTotal;
            BigDecimal cppNuevo = nuevoStock > 0
                ? cppAnterior.multiply(BigDecimal.valueOf(Math.max(0, stockActual)))
                    .add(costoUnitarioReal.multiply(BigDecimal.valueOf(cantidadTotal)))
                    .divide(BigDecimal.valueOf(nuevoStock), 4, RoundingMode.HALF_UP)
                : costoUnitarioReal;

            producto.setStock(nuevoStock);
            producto.setCpp(cppNuevo);
            producto.setPrecioCosto(cppNuevo);

            if (item.getPrecioVenta() != null && item.getPrecioVenta().compareTo(BigDecimal.ZERO) > 0)
                producto.setPrecioVenta(item.getPrecioVenta());

            productoRepo.save(producto);

            if (unidadesBonif > 0)
                logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", producto.getIdProducto(),
                    "Bonif. mismo producto | " + producto.getNombre()
                        + " | facturadas: " + cantidadFacturada + " bonif: " + unidadesBonif
                        + " | costo real/und: " + costoUnitarioReal,
                    null);
        }

        compra.setSubtotal(totalGeneral.setScale(2, RoundingMode.HALF_UP));
        compra.setTotal(totalGeneral
            .add(compra.getPercepcion())
            .subtract(compra.getDescuentoGlobal())
            .setScale(2, RoundingMode.HALF_UP));
        compra.setDetalles(detalles);

        Compra guardada = compraRepo.save(compra);
        logService.log(LogService.COMPRA_CREADA, "COMPRA", guardada.getIdCompra(),
            "Compra #" + guardada.getIdCompra()
                + " | " + proveedor.getEmpresa()
                + " | fecha: " + compra.getFecha()
                + " | S/ " + guardada.getTotal(), null);

        return ResponseEntity.ok(guardada);
    }

    // ── PATCH: anular con CPP ponderado inverso ───────────────────
    @PatchMapping("/{id}/anular")
    public ResponseEntity<?> anular(@PathVariable Integer id,
                                    @RequestBody AnulacionRequest req) {
        Compra compra = compraRepo.findById(id).orElse(null);
        if (compra == null) return ResponseEntity.notFound().build();
        if (!"confirmado".equals(compra.getEstado()))
            return ResponseEntity.badRequest().body("Solo se pueden anular compras confirmadas.");
        if (req.getMotivo() == null || req.getMotivo().isBlank())
            return ResponseEntity.badRequest().body("El motivo es obligatorio.");

        if (compra.getDetalles() != null) {
            for (CompraDetalle det : compra.getDetalles()) {
                Producto prod = det.getProducto();
                int stockActual  = prod.getStock()   != null ? prod.getStock()   : 0;
                int cantAnulada  = det.getCantidad()  != null ? det.getCantidad()  : 0;
                int stockNuevo   = stockActual - cantAnulada;
                BigDecimal cppActual = prod.getCpp() != null ? prod.getCpp() : prod.getPrecioCosto();
                BigDecimal cppNuevo;

                if (stockNuevo > 0) {
                    BigDecimal valorTotal   = cppActual.multiply(BigDecimal.valueOf(stockActual));
                    BigDecimal valorAnulado = det.getCostoUnitario().multiply(BigDecimal.valueOf(cantAnulada));
                    BigDecimal valorRest    = valorTotal.subtract(valorAnulado);
                    if (valorRest.compareTo(BigDecimal.ZERO) < 0) valorRest = BigDecimal.ZERO;
                    cppNuevo = valorRest.divide(BigDecimal.valueOf(stockNuevo), 4, RoundingMode.HALF_UP);
                } else {
                    cppNuevo = det.getCostoAnterior() != null ? det.getCostoAnterior() : BigDecimal.ZERO;
                }
                prod.setStock(Math.max(0, stockNuevo));
                prod.setCpp(cppNuevo);
                prod.setPrecioCosto(cppNuevo);
                productoRepo.save(prod);
            }
        }
        compra.setEstado("anulado");
        compra.setMotivo(req.getMotivo());
        Compra guardada = compraRepo.save(compra);
        logService.log(LogService.COMPRA_ANULADA, "COMPRA", id,
            "Compra #" + id + " anulada. " + req.getMotivo(), null);
        return ResponseEntity.ok(guardada);
    }

    // ── POST: ajuste Plan B ───────────────────────────────────────
    @PostMapping("/{id}/ajuste")
    public ResponseEntity<?> ajuste(@PathVariable Integer id,
                                    @RequestBody AjusteRequest req) {
        Compra compra = compraRepo.findById(id).orElse(null);
        if (compra == null) return ResponseEntity.notFound().build();
        Producto producto = productoRepo.findById(req.getIdProducto()).orElse(null);
        if (producto == null) return ResponseEntity.badRequest().body("Producto no encontrado.");
        if (req.getMotivo() == null || req.getMotivo().isBlank())
            return ResponseEntity.badRequest().body("El motivo es obligatorio.");

        BigDecimal cppAnterior = producto.getCpp() != null ? producto.getCpp() : producto.getPrecioCosto();
        CompraAjuste ajuste    = new CompraAjuste();
        ajuste.setCompraOriginal(compra); ajuste.setProducto(producto);
        ajuste.setFecha(LocalDateTime.now()); ajuste.setTipo(req.getTipo());
        ajuste.setMotivo(req.getMotivo()); ajuste.setCostoAnterior(cppAnterior);
        ajuste.setDeltaCantidad(req.getDeltaCantidad() != null ? req.getDeltaCantidad() : 0);
        ajuste.setImpactoStock(ajuste.getDeltaCantidad());

        BigDecimal cppNuevo = cppAnterior;
        if ("COSTO".equals(req.getTipo()) && req.getCostoNuevo() != null) {
            int stockActual = producto.getStock() != null ? producto.getStock() : 0;
            if (stockActual > 0 && req.getCantidadOriginal() != null && req.getCantidadOriginal() > 0) {
                int cantResto = Math.max(0, stockActual - req.getCantidadOriginal());
                cppNuevo = cppAnterior.multiply(BigDecimal.valueOf(cantResto))
                    .add(req.getCostoNuevo().multiply(BigDecimal.valueOf(req.getCantidadOriginal())))
                    .divide(BigDecimal.valueOf(stockActual), 4, RoundingMode.HALF_UP);
            } else { cppNuevo = req.getCostoNuevo(); }
            producto.setCpp(cppNuevo); producto.setPrecioCosto(cppNuevo);
            ajuste.setCostoNuevo(req.getCostoNuevo()); ajuste.setCppResultante(cppNuevo);
        } else if ("CANTIDAD".equals(req.getTipo()) || "DEVOLUCION".equals(req.getTipo())) {
            int delta = ajuste.getDeltaCantidad();
            producto.setStock(producto.getStock() + delta);
            ajuste.setCppResultante(cppAnterior);
        }
        productoRepo.save(producto);
        CompraAjuste guardado = ajusteRepo.save(ajuste);
        logService.log(LogService.COMPRA_AJUSTE, "COMPRA", id,
            "Ajuste " + req.getTipo() + " | " + producto.getNombre()
                + " | CPP: " + cppAnterior + " -> " + cppNuevo + " | " + req.getMotivo(),
            "{\"cppAnterior\":" + cppAnterior + ",\"cppNuevo\":" + cppNuevo + "}");
        return ResponseEntity.ok(guardado);
    }

    @GetMapping("/{id}/ajustes")
    public List<CompraAjuste> ajustes(@PathVariable Integer id) {
        return ajusteRepo.findByCompraOriginal_IdCompraOrderByFechaDesc(id);
    }

    @lombok.Data public static class AnulacionRequest { private String motivo; }
    @lombok.Data public static class AjusteRequest {
        private Integer idProducto; private String tipo; private String motivo;
        private Integer deltaCantidad; private BigDecimal costoNuevo; private Integer cantidadOriginal;
    }
}