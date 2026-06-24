package com.AdrithStore.backend.controller;

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

    // ── POST: subir desde archivo — nombre basado en idProducto ──
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

    // ── POST: guardar desde URL externa ──────────────────────────
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
            // Fallback: devolver la URL externa directamente sin descargar
            return ResponseEntity.ok(Map.of(
                "url", urlExterna,
                "original", urlExterna,
                "warning", "No se pudo descargar localmente: " + e.getMessage()
            ));
        }
    }

    // ── GET: servir imagen local ──────────────────────────────────
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

    // ── Generar nombre del archivo basado en idProducto ──────────
    // Si idProducto existe → "prod-{id}.jpg" (sobreescribe si ya hay imagen del mismo producto)
    // Si no → UUID corto
    private String generarNombre(Integer idProducto) {
        if (idProducto != null) return "prod-" + idProducto + ".jpg";
        return "img-" + UUID.randomUUID().toString().replace("-","").substring(0,10) + ".jpg";
    }

    // ── Procesar: redimensionar + comprimir → JPEG ────────────────
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