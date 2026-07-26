package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Producto;
import com.AdrithStore.backend.repository.CategoriaRepository;
import com.AdrithStore.backend.repository.ProductoRepository;
import com.AdrithStore.backend.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProductoController {

    private static final Set<String> CATEGORIAS_SERVICIO = Set.of("SERVICIOS", "IMPRESIONES", "TRANSFERENCIA");

    private final ProductoRepository   productoRepo;
    private final CategoriaRepository  categoriaRepo;
    private final LogService           logService;

    @GetMapping
    public List<Producto> listar() {
        return productoRepo.findAll();
    }

    @GetMapping("/buscar")
    public List<Producto> buscar(@RequestParam String nombre) {
        return productoRepo.findByNombreContainingIgnoreCaseOrSkuContainingIgnoreCase(nombre, nombre);
    }

    
    @GetMapping("/pos")
    public List<Producto> paraPos() {
        return productoRepo.findByVisibleEnPosTrue();
    }

    
    @GetMapping("/consumibles")
    public List<Producto> consumibles() {
        return productoRepo.findByTipo("CONSUMIBLE");
    }

    @GetMapping("/stock-bajo")
    public List<Producto> stockBajo() {
        return productoRepo.findStockBajo();
    }

    @GetMapping("/stock-negativo")
    public List<Producto> stockNegativo() {
        return productoRepo.findByStockLessThan(BigDecimal.ZERO);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Producto> obtener(@PathVariable Integer id) {
        return productoRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Producto producto) {
        if (producto.getSku() != null && producto.getSku().isBlank()) producto.setSku(null);
        forzarTipoPorCategoria(producto);
        String error = validarProducto(producto);
        if (error != null) return ResponseEntity.badRequest().body(error);

        
        if (producto.getCategoria() != null && producto.getCategoria().getIdCategoria() != null) {
            var cat = categoriaRepo.findById(producto.getCategoria().getIdCategoria()).orElse(null);
            if (cat != null && CATEGORIAS_SERVICIO.contains(cat.getNombre())) {
                if (productoRepo.existsByCategoriaNombre(cat.getNombre())) {
                    return ResponseEntity.badRequest().body("Ya existe un producto en la categoría " + cat.getNombre());
                }
            }
        }

        
        if ("CONSUMIBLE".equals(producto.getTipo()))
            producto.setVisibleEnPos(false);

        
        if (producto.getCpp() == null || producto.getCpp().compareTo(BigDecimal.ZERO) == 0)
            producto.setCpp(producto.getPrecioCosto());

        try {
            Producto guardado = productoRepo.save(producto);
            if (guardado.getSku() == null) {
                guardado.setSku(String.format("PROD-%05d", guardado.getIdProducto()));
                guardado = productoRepo.save(guardado);
            }
            return ResponseEntity.ok(guardado);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body("El SKU \"" + producto.getSku() + "\" ya está en uso por otro producto.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id,
                                        @RequestBody Producto datos) {
        var p = productoRepo.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();

        String catNombreExistente = p.getCategoria() != null ? p.getCategoria().getNombre() : null;
        boolean existenteEsServicio = catNombreExistente != null && CATEGORIAS_SERVICIO.contains(catNombreExistente);

        
        if (existenteEsServicio) {
            datos.setCategoria(p.getCategoria());
        } else if (datos.getCategoria() != null && datos.getCategoria().getIdCategoria() != null) {
            var nuevaCat = categoriaRepo.findById(datos.getCategoria().getIdCategoria()).orElse(null);
            if (nuevaCat != null && CATEGORIAS_SERVICIO.contains(nuevaCat.getNombre())) {
                return ResponseEntity.badRequest().body("No puedes cambiar un producto físico a una categoría de servicio.");
            }
        }

        if (datos.getSku() != null && datos.getSku().isBlank()) datos.setSku(null);
        forzarTipoPorCategoria(datos);
        String error = validarProducto(datos);
        if (error != null) return ResponseEntity.badRequest().body(error);

        p.setNombre(datos.getNombre());
        p.setSku(datos.getSku());
        p.setTipo(datos.getTipo());
        p.setVisibleEnPos("CONSUMIBLE".equals(datos.getTipo()) ? false : datos.getVisibleEnPos());
        p.setStock(datos.getStock());
        p.setUnidadMedida(datos.getUnidadMedida());
        p.setPrecioCosto(datos.getPrecioCosto());
        p.setPorcentajeCosto(datos.getPorcentajeCosto());
        p.setPrecioVenta(datos.getPrecioVenta());
        p.setStockAlert(datos.getStockAlert());
        p.setDescripcion(datos.getDescripcion());
        p.setCategoria(datos.getCategoria());
        p.setPermiteStockNegativo(datos.getPermiteStockNegativo());
        p.setCpp(datos.getCpp());
        if (datos.getComisionBase() != null) p.setComisionBase(datos.getComisionBase());
        if (datos.getComisionCada() != null) p.setComisionCada(datos.getComisionCada());
        if (datos.getImagenUrl() != null) p.setImagenUrl(datos.getImagenUrl());
        try {
            return ResponseEntity.ok(productoRepo.save(p));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body("El SKU \"" + datos.getSku() + "\" ya está en uso por otro producto.");
        }
    }

    @PatchMapping("/{id}/imagen")
    public ResponseEntity<?> actualizarImagen(@PathVariable Integer id,
                                              @RequestBody Map<String, String> body) {
        return productoRepo.findById(id).map(p -> {
            p.setImagenUrl(body.get("imagenUrl"));
            return ResponseEntity.ok(productoRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/ajuste-stock")
    public ResponseEntity<?> ajusteStock(@PathVariable Integer id,
                                         @RequestBody Map<String, Object> req) {
        Producto p = productoRepo.findById(id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();

        if (!"BIEN_FISICO".equals(p.getTipo()) && !"CONSUMIBLE".equals(p.getTipo()))
            return ResponseEntity.badRequest()
                .body("Solo se puede ajustar stock en BIEN_FISICO y CONSUMIBLE.");

        BigDecimal delta  = new BigDecimal(req.get("delta").toString());
        if (!p.esVentaPorKg() && delta.stripTrailingZeros().scale() > 0)
            return ResponseEntity.badRequest()
                .body("Este producto se vende por unidad: el ajuste no puede tener decimales.");

        String motivo     = (String) req.getOrDefault("motivo", "Ajuste manual");
        BigDecimal antes  = p.getStock() != null ? p.getStock() : BigDecimal.ZERO;
        p.setStock(antes.add(delta));
        productoRepo.save(p);

        logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", id,
            "Stock: " + antes + " -> " + p.getStock() + " | " + motivo, null);

        if (p.getStock().compareTo(BigDecimal.ZERO) < 0)
            logService.log(LogService.STOCK_NEGATIVO, "PRODUCTO", id,
                "Stock negativo: " + p.getStock(), null);

        return ResponseEntity.ok(p);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        if (!productoRepo.existsById(id)) return ResponseEntity.notFound().build();
        productoRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    
    private String validarProducto(Producto p) {
        if (p.getTipo() == null || p.getTipo().isBlank())
            p.setTipo("BIEN_FISICO");
        if (p.getUnidadMedida() == null || p.getUnidadMedida().isBlank())
            p.setUnidadMedida("UNIDAD");

        if (!p.esVentaPorKg()) {
            if (p.getStock() != null && p.getStock().stripTrailingZeros().scale() > 0)
                return "Este producto se vende por unidad: el stock no puede tener decimales.";
            if (p.getStockAlert() != null && p.getStockAlert().stripTrailingZeros().scale() > 0)
                return "Este producto se vende por unidad: la alerta de stock no puede tener decimales.";
        }

        String tipo = p.getTipo();

        switch (tipo) {
            case "BIEN_FISICO":
                if (p.getPrecioCosto() == null || p.getPrecioCosto().compareTo(BigDecimal.ZERO) <= 0)
                    return "BIEN_FISICO requiere costo > 0.";
                if (p.getPrecioVenta() == null || p.getPrecioVenta().compareTo(BigDecimal.ZERO) <= 0)
                    return "El precio de venta debe ser mayor a 0.";
                break;
            case "SERVICIO_PURO":
                if (p.getPrecioCosto() == null || p.getPrecioCosto().compareTo(BigDecimal.ZERO) < 0)
                    return "SERVICIO_PURO requiere costo >= 0.";
                if (p.getPrecioVenta() == null || p.getPrecioVenta().compareTo(BigDecimal.ZERO) <= 0)
                    return "El precio de venta debe ser mayor a 0.";
                break;
            case "SERVICIO_COMIS":
                if (p.getPrecioVenta() == null || p.getPrecioVenta().compareTo(BigDecimal.ZERO) < 0)
                    return "SERVICIO_COMIS requiere precio_venta >= 0.";
                break;
            case "CONSUMIBLE":
                
                break;
            default:
                return "Tipo de producto invalido: " + tipo
                    + ". Use: BIEN_FISICO, SERVICIO_PURO, SERVICIO_COMIS, CONSUMIBLE";
        }
        return null; 
    }

    
    private void forzarTipoPorCategoria(Producto p) {
        if (p.getCategoria() == null || p.getCategoria().getIdCategoria() == null) return;
        categoriaRepo.findById(p.getCategoria().getIdCategoria()).ifPresent(cat -> {
            String nombre = cat.getNombre();
            if ("SERVICIOS".equals(nombre) || "IMPRESIONES".equals(nombre)) {
                p.setTipo("SERVICIO_PURO");
            } else if ("TRANSFERENCIA".equals(nombre)) {
                p.setTipo("SERVICIO_COMIS");
            }
        });
    }
}