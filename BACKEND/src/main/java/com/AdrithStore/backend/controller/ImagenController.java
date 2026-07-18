package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Producto;
import com.AdrithStore.backend.repository.ProductoRepository;
import lombok.RequiredArgsConstructor;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
import java.io.*;
import java.net.URL;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ImagenController {

    @Value("${app.upload.dir:uploads/imagenes}")
    private String uploadDir;

    private final ProductoRepository productoRepo;

    
    @PostMapping("/imagen")
    public ResponseEntity<?> subirImagen(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "idProducto", required = false) Integer idProducto) {
        try {
            String nombre = generarNombre(idProducto);
            String url    = procesarYGuardar(file.getInputStream(), nombre);
            return ResponseEntity.ok(Map.of("url", url, "nombre", nombre));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al procesar imagen: " + e.getMessage());
        }
    }

    
    @PostMapping("/imagen-url")
    public ResponseEntity<?> guardarDesdeUrl(@RequestBody Map<String, Object> body) {
        String urlExterna = (String) body.get("url");
        Object idProdObj  = body.get("idProducto");
        Integer idProducto = idProdObj != null ? Integer.parseInt(idProdObj.toString()) : null;

        if (urlExterna == null || urlExterna.isBlank())
            return ResponseEntity.badRequest().body("URL requerida.");

        try {
            String nombre = generarNombre(idProducto);
            InputStream is = new URL(urlExterna).openStream();
            String localUrl = procesarYGuardar(is, nombre);
            return ResponseEntity.ok(Map.of("url", localUrl, "original", urlExterna));
        } catch (Exception e) {
            
            
            
            return ResponseEntity.unprocessableEntity()
                .body(Map.of("error", "No se pudo descargar la imagen desde esa URL: " + e.getMessage()));
        }
    }

    
    
    
    
    @PostMapping("/reparar-imagenes")
    public ResponseEntity<?> repararImagenes() {
        List<Producto> productos = productoRepo.findAll().stream()
            .filter(p -> p.getImagenUrl() != null && p.getImagenUrl().startsWith("http"))
            .toList();

        int migradas = 0;
        List<Map<String, Object>> detalle = new ArrayList<>();

        for (Producto p : productos) {
            String urlExterna = p.getImagenUrl();
            try {
                String nombre = generarNombre(p.getIdProducto());
                InputStream is = new URL(urlExterna).openStream();
                String localUrl = procesarYGuardar(is, nombre);
                p.setImagenUrl(localUrl);
                productoRepo.save(p);
                migradas++;
                detalle.add(Map.of("idProducto", p.getIdProducto(), "nombre", p.getNombre(), "resultado", "migrada"));
            } catch (Exception e) {
                p.setImagenUrl(null);
                productoRepo.save(p);
                detalle.add(Map.of("idProducto", p.getIdProducto(), "nombre", p.getNombre(),
                    "resultado", "sin-descargar", "motivo", String.valueOf(e.getMessage())));
            }
        }

        Map<String, Object> res = Map.of(
            "total",        productos.size(),
            "migradas",     migradas,
            "sinDescargar", productos.size() - migradas,
            "detalle",      detalle
        );
        return ResponseEntity.ok(res);
    }

    
    @GetMapping("/imagen/{nombre}")
    public ResponseEntity<byte[]> servirImagen(@PathVariable String nombre) {
        try {
            Path path = Path.of(uploadDir, nombre);
            if (!Files.exists(path)) return ResponseEntity.notFound().build();
            byte[] bytes = Files.readAllBytes(path);
            return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    
    
    
    private String generarNombre(Integer idProducto) {
        if (idProducto != null) return "prod-" + idProducto + ".jpg";
        return "img-" + UUID.randomUUID().toString().replace("-","").substring(0,10) + ".jpg";
    }

    
    private String procesarYGuardar(InputStream input, String nombre) throws Exception {
        Files.createDirectories(Path.of(uploadDir));
        Path destino = Path.of(uploadDir, nombre);

        BufferedImage original = ImageIO.read(input);
        if (original == null) throw new IllegalArgumentException("Archivo no es una imagen válida.");

        Thumbnails.of(original)
            .size(1280, 720)
            .keepAspectRatio(true)
            .outputFormat("jpg")
            .outputQuality(0.78)
            .toFile(destino.toFile());

        return "/api/uploads/imagen/" + nombre;
    }
}