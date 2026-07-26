package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.LogService;
import com.AdrithStore.backend.service.TesoreriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
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
    private final TesoreriaService       tesoreriaService;

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

    
    @PostMapping
    @Transactional
    public ResponseEntity<?> crear(@RequestBody CompraRequest req) {

        Proveedor proveedor = proveedorRepo.findById(req.getIdProveedor()).orElse(null);
        if (proveedor == null)
            return ResponseEntity.badRequest().body("Proveedor no encontrado.");

        Compra compra = new Compra();
        compra.setProveedor(proveedor);
        compra.setTipoComprobante(req.getTipoComprobante());
        compra.setSerieComprobante(req.getSerieComprobante());
        
        compra.setFecha(req.getFechaIngreso() != null ? req.getFechaIngreso() : LocalDateTime.now());
        compra.setEstado("confirmado");
        compra.setPercepcion(req.getPercepcion()      != null ? req.getPercepcion()      : BigDecimal.ZERO);
        compra.setDescuentoGlobal(req.getDescuentoGlobal() != null ? req.getDescuentoGlobal() : BigDecimal.ZERO);
        compra.setMedioPago(req.getMedioPago() != null ? req.getMedioPago() : "Efectivo");

        List<CompraDetalle> detalles = new ArrayList<>();
        BigDecimal totalGeneral      = BigDecimal.ZERO;

        for (CompraRequest.DetalleItem item : req.getDetalles()) {
            Producto producto = productoRepo.findById(item.getIdProducto()).orElse(null);
            if (producto == null) continue;


            BigDecimal cantidadFacturada = item.getCantidad();
            BigDecimal unidadesBonif     = item.getUnidadesBonificacion() != null ? item.getUnidadesBonificacion() : BigDecimal.ZERO;
            BigDecimal cantidadTotal     = cantidadFacturada.add(unidadesBonif);

            BigDecimal costoTotalLote = item.getCostoUnitario()
                .multiply(cantidadFacturada)
                .setScale(4, RoundingMode.HALF_UP);


            BigDecimal costoUnitarioReal = cantidadTotal.compareTo(BigDecimal.ZERO) > 0
                ? costoTotalLote.divide(cantidadTotal, 4, RoundingMode.HALF_UP)
                : item.getCostoUnitario();

            BigDecimal cppAnterior = producto.getCpp() != null && producto.getCpp().compareTo(BigDecimal.ZERO) > 0
                ? producto.getCpp() : producto.getPrecioCosto();

            
            
            BigDecimal costoLoteAjustado = costoTotalLote;
            if (item.getIdProductoBonif() != null && item.getCantidadBonif() != null
                    && item.getCantidadBonif().compareTo(BigDecimal.ZERO) > 0) {

                Producto prodBonif = productoRepo.findById(item.getIdProductoBonif()).orElse(null);
                if (prodBonif != null) {
                    BigDecimal cantidadBonif = item.getCantidadBonif();
                    BigDecimal cppBonif;
                    BigDecimal costoBonifTotal;
                    if (item.getCostoBonifTotal() != null && item.getCostoBonifTotal().compareTo(BigDecimal.ZERO) > 0) {

                        costoBonifTotal = item.getCostoBonifTotal().setScale(4, RoundingMode.HALF_UP);
                        cppBonif = cantidadBonif.compareTo(BigDecimal.ZERO) > 0
                            ? costoBonifTotal.divide(cantidadBonif, 4, RoundingMode.HALF_UP)
                            : costoBonifTotal;
                    } else {

                        cppBonif = prodBonif.getCpp() != null && prodBonif.getCpp().compareTo(BigDecimal.ZERO) > 0
                            ? prodBonif.getCpp() : prodBonif.getPrecioCosto();
                        if (cppBonif == null || cppBonif.compareTo(BigDecimal.ZERO) == 0) {

                            cppBonif = BigDecimal.ZERO;
                        }
                        costoBonifTotal = cppBonif
                            .multiply(cantidadBonif)
                            .setScale(4, RoundingMode.HALF_UP);
                    }


                    costoLoteAjustado = costoTotalLote.subtract(costoBonifTotal);
                    if (costoLoteAjustado.compareTo(BigDecimal.ZERO) < 0)
                        costoLoteAjustado = BigDecimal.ZERO;


                    BigDecimal stockBonifActual = prodBonif.getStock() != null ? prodBonif.getStock() : BigDecimal.ZERO;
                    BigDecimal stockBonifNuevo  = stockBonifActual.add(cantidadBonif);
                    BigDecimal cppBonifAnterior = prodBonif.getCpp() != null ? prodBonif.getCpp() : prodBonif.getPrecioCosto();

                    BigDecimal cppBonifNuevo = stockBonifNuevo.compareTo(BigDecimal.ZERO) > 0
                        ? cppBonifAnterior.multiply(stockBonifActual)
                            .add(cppBonif.multiply(cantidadBonif))
                            .divide(stockBonifNuevo, 4, RoundingMode.HALF_UP)
                        : cppBonif;


                    CompraDetalle detBonif = new CompraDetalle();
                    detBonif.setCompra(compra);
                    detBonif.setProducto(prodBonif);
                    detBonif.setCantidad(cantidadBonif);
                    detBonif.setCostoUnitario(cppBonif);
                    detBonif.setCostoAnterior(cppBonifAnterior);
                    detBonif.setSubtotal(costoBonifTotal);

                    detalles.add(detBonif);

                    prodBonif.setStock(stockBonifNuevo);
                    prodBonif.setCpp(cppBonifNuevo);
                    prodBonif.setPrecioCosto(cppBonifNuevo);
                    productoRepo.save(prodBonif);

                    logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", prodBonif.getIdProducto(),
                        "Bonif. distinta desde compra | " + prodBonif.getNombre()
                            + " +" + cantidadBonif + " und. | costo dist: " + costoBonifTotal,
                        null);
                }
            }


            costoUnitarioReal = cantidadTotal.compareTo(BigDecimal.ZERO) > 0
                ? costoLoteAjustado.divide(cantidadTotal, 4, RoundingMode.HALF_UP)
                : item.getCostoUnitario();

            CompraDetalle det = new CompraDetalle();
            det.setCompra(compra);
            det.setProducto(producto);
            det.setCantidad(cantidadTotal);
            det.setCostoUnitario(costoUnitarioReal);
            det.setCostoAnterior(cppAnterior);
            det.setVencimiento(item.getVencimiento());
            det.setDescuentoPct(item.getDescuentoPct() != null ? item.getDescuentoPct() : BigDecimal.ZERO);
            det.setSubtotal(costoTotalLote);
            totalGeneral = totalGeneral.add(costoTotalLote);
            detalles.add(det);


            BigDecimal stockActual = producto.getStock() != null ? producto.getStock() : BigDecimal.ZERO;
            BigDecimal nuevoStock  = stockActual.add(cantidadTotal);
            BigDecimal cppNuevo = nuevoStock.compareTo(BigDecimal.ZERO) > 0
                ? cppAnterior.multiply(stockActual.max(BigDecimal.ZERO))
                    .add(costoUnitarioReal.multiply(cantidadTotal))
                    .divide(nuevoStock, 4, RoundingMode.HALF_UP)
                : costoUnitarioReal;

            producto.setStock(nuevoStock);
            producto.setCpp(cppNuevo);
            producto.setPrecioCosto(cppNuevo);

            if (item.getPrecioVenta() != null && item.getPrecioVenta().compareTo(BigDecimal.ZERO) > 0)
                producto.setPrecioVenta(item.getPrecioVenta());

            productoRepo.save(producto);

            if (unidadesBonif.compareTo(BigDecimal.ZERO) > 0)
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

        try {
            tesoreriaService.registrar("COMPRA", mapearCuenta(guardada.getMedioPago()),
                guardada.getTotal(), -1,
                "Compra #" + guardada.getIdCompra() + " — " + proveedor.getEmpresa(),
                null, guardada.getIdCompra(), "compras");
        } catch (Exception e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            System.err.println("[CompraController] Tesorería: " + e.getMessage());
            return ResponseEntity.badRequest().body(
                "No se pudo descontar el pago de tesorería (" + e.getMessage()
                    + "). La compra no fue registrada, corrige el medio de pago o la cuenta e intenta de nuevo.");
        }

        return ResponseEntity.ok(guardada);
    }

    private String mapearCuenta(String medioPago) {
        if (medioPago == null) return "Caja Fisica";
        return switch (medioPago.toLowerCase()) {
            case "plin"           -> "Plin";
            case "yape"           -> "Yape";
            case "tarjeta"        -> "Tarjeta";
            case "transferencia"  -> "Transferencia";
            case "otro"           -> "Otro";
            default               -> "Caja Fisica";
        };
    }

    
    @PatchMapping("/{id}/anular")
    @Transactional
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
                BigDecimal stockActual  = prod.getStock()   != null ? prod.getStock()   : BigDecimal.ZERO;
                BigDecimal cantAnulada  = det.getCantidad()  != null ? det.getCantidad()  : BigDecimal.ZERO;
                BigDecimal stockNuevo   = stockActual.subtract(cantAnulada);
                BigDecimal cppActual = prod.getCpp() != null ? prod.getCpp() : prod.getPrecioCosto();
                BigDecimal cppNuevo;

                if (stockNuevo.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal valorTotal   = cppActual.multiply(stockActual);
                    BigDecimal valorAnulado = det.getCostoUnitario().multiply(cantAnulada);
                    BigDecimal valorRest    = valorTotal.subtract(valorAnulado);
                    if (valorRest.compareTo(BigDecimal.ZERO) < 0) valorRest = BigDecimal.ZERO;
                    cppNuevo = valorRest.divide(stockNuevo, 4, RoundingMode.HALF_UP);
                } else {
                    cppNuevo = det.getCostoAnterior() != null ? det.getCostoAnterior() : BigDecimal.ZERO;
                }
                prod.setStock(stockNuevo.max(BigDecimal.ZERO));
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

        if (compra.getMedioPago() != null) {
            try {
                tesoreriaService.registrar("COMPRA_ANULADA", mapearCuenta(compra.getMedioPago()),
                    guardada.getTotal(), 1,
                    "Anulación compra #" + id + " — " + req.getMotivo(),
                    null, id, "compras");
            } catch (Exception e) {
                TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
                System.err.println("[CompraController] Tesorería: " + e.getMessage());
                return ResponseEntity.badRequest().body(
                    "No se pudo revertir el pago en tesorería (" + e.getMessage()
                        + "). La anulación no fue aplicada, intenta de nuevo.");
            }
        }

        return ResponseEntity.ok(guardada);
    }

    
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
        ajuste.setDeltaCantidad(req.getDeltaCantidad() != null ? req.getDeltaCantidad() : BigDecimal.ZERO);
        ajuste.setImpactoStock(ajuste.getDeltaCantidad());

        BigDecimal cppNuevo = cppAnterior;
        if ("COSTO".equals(req.getTipo()) && req.getCostoNuevo() != null) {
            BigDecimal stockActual = producto.getStock() != null ? producto.getStock() : BigDecimal.ZERO;
            if (stockActual.compareTo(BigDecimal.ZERO) > 0 && req.getCantidadOriginal() != null
                    && req.getCantidadOriginal().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal cantResto = stockActual.subtract(req.getCantidadOriginal()).max(BigDecimal.ZERO);
                cppNuevo = cppAnterior.multiply(cantResto)
                    .add(req.getCostoNuevo().multiply(req.getCantidadOriginal()))
                    .divide(stockActual, 4, RoundingMode.HALF_UP);
            } else { cppNuevo = req.getCostoNuevo(); }
            producto.setCpp(cppNuevo); producto.setPrecioCosto(cppNuevo);
            ajuste.setCostoNuevo(req.getCostoNuevo()); ajuste.setCppResultante(cppNuevo);
        } else if ("CANTIDAD".equals(req.getTipo()) || "DEVOLUCION".equals(req.getTipo())) {
            BigDecimal delta = ajuste.getDeltaCantidad();
            producto.setStock(producto.getStock().add(delta));
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
        private BigDecimal deltaCantidad; private BigDecimal costoNuevo; private BigDecimal cantidadOriginal;
    }
}