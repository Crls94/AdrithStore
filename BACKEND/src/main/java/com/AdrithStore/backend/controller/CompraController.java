package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.LogService;
import com.AdrithStore.backend.service.TesoreriaService;
import com.AdrithStore.backend.service.CalculoCompra;
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

        if (req.getIdProveedor() == null)
            return ResponseEntity.badRequest().body("Proveedor requerido.");
        Proveedor proveedor = proveedorRepo.findById(req.getIdProveedor()).orElse(null);
        if (proveedor == null)
            return ResponseEntity.badRequest().body("Proveedor no encontrado.");

        CalculoCompra.Resultado calculo;
        List<Producto> productos = new ArrayList<>();
        List<Producto> regalos = new ArrayList<>();
        try {
            calculo = CalculoCompra.calcular(req);
            if (calculo.diferencia().signum() != 0)
                return ResponseEntity.badRequest().body("La percepción ingresada (S/ "
                    + calculo.percepcionIngresada() + ") no coincide con la calculada (S/ "
                    + calculo.percepcionCalculada() + "). No se registró la compra.");
            // Resolver y validar TODAS las líneas antes de modificar entidades administradas.
            for (CompraRequest.DetalleItem item : req.getDetalles()) {
                Producto producto = productoRepo.findById(item.getIdProducto())
                    .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado: " + item.getIdProducto()));
                validarCantidadCompra(producto, item.getCantidad());
                if (item.getUnidadesBonificacion() != null)
                    validarCantidadCompra(producto, item.getUnidadesBonificacion());
                productos.add(producto);
                Producto regalo = null;
                if (item.getIdProductoBonif() != null) {
                    regalo = productoRepo.findById(item.getIdProductoBonif())
                        .orElseThrow(() -> new IllegalArgumentException("Producto regalado no encontrado."));
                    validarCantidadCompra(regalo, item.getCantidadBonif());
                }
                regalos.add(regalo);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        Compra compra = new Compra();
        compra.setProveedor(proveedor);
        compra.setTipoComprobante(req.getTipoComprobante());
        compra.setSerieComprobante(req.getSerieComprobante());
        
        compra.setFecha(req.getFechaIngreso() != null ? req.getFechaIngreso() : LocalDateTime.now());
        compra.setEstado("confirmado");
        compra.setPercepcion(calculo.percepcionIngresada());
        compra.setDescuentoGlobal(CalculoCompra.moneda(req.getDescuentoGlobal() != null ? req.getDescuentoGlobal() : BigDecimal.ZERO));
        compra.setMedioPago(req.getMedioPago() != null ? req.getMedioPago() : "Efectivo");

        List<CompraDetalle> detalles = new ArrayList<>();

        for (int indice = 0; indice < req.getDetalles().size(); indice++) {
            CompraRequest.DetalleItem item = req.getDetalles().get(indice);
            Producto producto = productos.get(indice);
            CalculoCompra.Linea linea = calculo.lineas().get(indice);


            BigDecimal cantidadFacturada = item.getCantidad();
            BigDecimal unidadesBonif     = item.getUnidadesBonificacion() != null ? item.getUnidadesBonificacion() : BigDecimal.ZERO;
            BigDecimal cantidadTotal     = cantidadFacturada.add(unidadesBonif);

            BigDecimal costoTotalLote = linea.valorizado();


            BigDecimal costoUnitarioReal = linea.costoUnitario();

            BigDecimal cppAnterior = producto.getCpp() != null ? producto.getCpp() : BigDecimal.ZERO;

            
            
Producto prodBonif = regalos.get(indice);
            if (prodBonif != null) {
                BigDecimal cantidadBonif = item.getCantidadBonif();
                BigDecimal cppBonifAnterior = prodBonif.getCpp();
                BigDecimal stockBonifActual = prodBonif.getStock() != null ? prodBonif.getStock() : BigDecimal.ZERO;
                // Issue #8: stock <= 0 se considera agotado; la bonificación inicia desde lo recibido.
                BigDecimal stockBonifNuevo = nuevoStock(stockBonifActual, cantidadBonif);
                boolean stockBonifNegativo = stockBonifActual.signum() < 0;
                CompraDetalle detBonif = new CompraDetalle();
                detBonif.setCompra(compra);
                detBonif.setProducto(prodBonif);
                detBonif.setCantidad(cantidadBonif);
                detBonif.setCostoAnterior(cppBonifAnterior);
                // Snapshot del CPP conservado; no es un costo monetario de la compra.
                detBonif.setCostoUnitario(cppBonifAnterior != null ? cppBonifAnterior : BigDecimal.ZERO);
                detBonif.setSubtotal(BigDecimal.ZERO);
                detalles.add(detBonif);
                prodBonif.setStock(stockBonifNuevo);
                productoRepo.save(prodBonif);
                if (stockBonifNegativo)
                    logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", prodBonif.getIdProducto(),
                        "Bonificación restablece stock | " + prodBonif.getNombre()
                            + " | stock previo negativo: " + stockBonifActual
                            + " | recibido: " + cantidadBonif + " | nuevo stock: " + stockBonifNuevo
                            + " | CPP conservado: " + cppBonifAnterior, null);
                logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", prodBonif.getIdProducto(),
                    "Bonificación distinta en compra | " + prodBonif.getNombre()
                        + " +" + cantidadBonif + " | CPP conservado: " + cppBonifAnterior, null);
            }

            CompraDetalle det = new CompraDetalle();
            det.setCompra(compra);
            det.setProducto(producto);
            det.setCantidad(cantidadTotal);
            det.setCostoUnitario(costoUnitarioReal);
            det.setCostoAnterior(cppAnterior);
            det.setVencimiento(item.getVencimiento());
            det.setDescuentoPct(item.getDescuentoPct() != null ? item.getDescuentoPct() : BigDecimal.ZERO);
            det.setSubtotal(CalculoCompra.moneda(linea.neto()));

            detalles.add(det);


            BigDecimal stockActual = producto.getStock() != null ? producto.getStock() : BigDecimal.ZERO;
            boolean stockNegativo = stockActual.signum() < 0;
            // Issue #8: solo existe inventario físico valorizable cuando stockActual > 0.
            BigDecimal nuevoStock = nuevoStock(stockActual, cantidadTotal);
            BigDecimal cppNuevo = nuevoCpp(stockActual, cantidadTotal,
                cppAnterior, costoTotalLote, costoUnitarioReal);

            producto.setStock(nuevoStock);
            producto.setCpp(cppNuevo);

            if (item.getPrecioVenta() != null && item.getPrecioVenta().compareTo(BigDecimal.ZERO) > 0)
                producto.setPrecioVenta(item.getPrecioVenta());

            productoRepo.save(producto);

            if (stockNegativo)
                logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", producto.getIdProducto(),
                    "Reposición de inventario | " + producto.getNombre()
                        + " | stock previo negativo: " + stockActual
                        + " | recibido: " + cantidadTotal + " | nuevo stock: " + nuevoStock
                        + " | CPP histórico " + cppAnterior + " reemplazado por: " + cppNuevo, null);

            if (unidadesBonif.compareTo(BigDecimal.ZERO) > 0)
                logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", producto.getIdProducto(),
                    "Bonif. mismo producto | " + producto.getNombre()
                        + " | facturadas: " + cantidadFacturada + " bonif: " + unidadesBonif
                        + " | costo real/und: " + costoUnitarioReal,
                    null);
        }

        compra.setSubtotal(calculo.subtotalNeto());
        compra.setTotal(calculo.totalTesoreria());
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

    // Previsualización sin escrituras: usa exactamente el mismo cálculo que crear.
    @PostMapping("/calcular")
    public ResponseEntity<?> calcular(@RequestBody CompraRequest req) {
        try {
            return ResponseEntity.ok(CalculoCompra.calcular(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private void validarCantidadCompra(Producto producto, BigDecimal cantidad) {
        int escala = producto.esVentaPorKg() ? 3 : 0;
        if (cantidad.stripTrailingZeros().scale() > escala)
            throw new IllegalArgumentException("Cantidad incompatible con la unidad de " + producto.getNombre());
    }

    /** Regla de reposición (issue #8): solo existe inventario físico cuando stockActual > 0. */
    private static BigDecimal nuevoStock(BigDecimal stockActual, BigDecimal cantidadLote) {
        return stockActual != null && stockActual.signum() > 0
            ? stockActual.add(cantidadLote) : cantidadLote;
    }

    /** Regla de CPP (issue #8): el CPP anterior solo participa cuando stockActual > 0. */
    private static BigDecimal nuevoCpp(BigDecimal stockActual, BigDecimal cantidadLote,
                                       BigDecimal cppAnterior, BigDecimal costoTotalLote,
                                       BigDecimal costoUnitarioLote) {
        if (stockActual == null || stockActual.signum() <= 0)
            return costoUnitarioLote;
        return cppAnterior.multiply(stockActual)
            .add(costoTotalLote)
            .divide(stockActual.add(cantidadLote), 4, RoundingMode.HALF_UP);
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
                BigDecimal cppActual = prod.getCpp() != null ? prod.getCpp() : BigDecimal.ZERO;
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

        BigDecimal cppAnterior = producto.getCpp() != null ? producto.getCpp() : BigDecimal.ZERO;
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
            producto.setCpp(cppNuevo);
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
