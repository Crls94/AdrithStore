package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Producto;
import com.AdrithStore.backend.repository.CategoriaRepository;
import com.AdrithStore.backend.repository.ProductoRepository;
import com.AdrithStore.backend.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProductoController {

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

    // Solo visibles en POS (excluye CONSUMIBLES)
    @GetMapping("/pos")
    public List<Producto> paraPos() {
        return productoRepo.findByVisibleEnPosTrue();
    }

    // Solo consumibles internos
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
        return productoRepo.findByStockLessThan(0);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Producto> obtener(@PathVariable Integer id) {
        return productoRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Producto producto) {
        String error = validarProducto(producto);
        if (error != null) return ResponseEntity.badRequest().body(error);

        // CONSUMIBLE siempre invisible en POS
        if ("CONSUMIBLE".equals(producto.getTipo()))
            producto.setVisibleEnPos(false);

        // CPP inicial = precio_costo
        if (producto.getCpp() == null || producto.getCpp().compareTo(BigDecimal.ZERO) == 0)
            producto.setCpp(producto.getPrecioCosto());

        return ResponseEntity.ok(productoRepo.save(producto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id,
                                        @RequestBody Producto datos) {
        String error = validarProducto(datos);
        if (error != null) return ResponseEntity.badRequest().body(error);

        return productoRepo.findById(id).map(p -> {
            p.setNombre(datos.getNombre());
            p.setSku(datos.getSku());
            p.setTipo(datos.getTipo() != null ? datos.getTipo() : "BIEN_FISICO");
            p.setVisibleEnPos("CONSUMIBLE".equals(datos.getTipo()) ? false : datos.getVisibleEnPos());
            p.setStock(datos.getStock());
            p.setPrecioCosto(datos.getPrecioCosto());
            p.setPrecioVenta(datos.getPrecioVenta());
            p.setStockAlert(datos.getStockAlert());
            p.setDescripcion(datos.getDescripcion());
            p.setCategoria(datos.getCategoria());
            p.setPermiteStockNegativo(datos.getPermiteStockNegativo());
            p.setComisionBase(datos.getComisionBase());
            p.setComisionCada(datos.getComisionCada());
            if (datos.getCpp() != null) p.setCpp(datos.getCpp());
            if (datos.getImagenUrl() != null) p.setImagenUrl(datos.getImagenUrl());
            return ResponseEntity.ok(productoRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
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

        int delta     = ((Number) req.get("delta")).intValue();
        String motivo = (String) req.getOrDefault("motivo", "Ajuste manual");
        int antes     = p.getStock() != null ? p.getStock() : 0;
        p.setStock(antes + delta);
        productoRepo.save(p);

        logService.log(LogService.STOCK_AJUSTADO, "PRODUCTO", id,
            "Stock: " + antes + " -> " + p.getStock() + " | " + motivo, null);

        if (p.getStock() < 0)
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

    // ── Validaciones por tipo (String, sin enum) ───────────────────────────
    private String validarProducto(Producto p) {
        if (p.getTipo() == null || p.getTipo().isBlank())
            p.setTipo("BIEN_FISICO");

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
                // sin restricciones
                break;
            default:
                return "Tipo de producto invalido: " + tipo
                    + ". Use: BIEN_FISICO, SERVICIO_PURO, SERVICIO_COMIS, CONSUMIBLE";
        }
        return null; // sin error
    }
}