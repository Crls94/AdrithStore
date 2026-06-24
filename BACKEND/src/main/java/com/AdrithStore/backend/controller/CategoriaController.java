package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Categoria;
import com.AdrithStore.backend.repository.CategoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/categorias")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")   // ← permite cualquier origen (red local + producción)
public class CategoriaController {

    private final CategoriaRepository categoriaRepo;

    @GetMapping
    public List<Categoria> listar() {
        return categoriaRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Categoria> obtener(@PathVariable Integer id) {
        return categoriaRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Categoria categoria) {
        if (categoria.getNombre() == null || categoria.getNombre().isBlank())
            return ResponseEntity.badRequest().body("El nombre es obligatorio.");
        try {
            return ResponseEntity.ok(categoriaRepo.save(categoria));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Nombre de categoría ya existe.");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Integer id,
                                        @RequestBody Categoria datos) {
        return categoriaRepo.findById(id).map(c -> {
            c.setNombre(datos.getNombre());
            c.setDescripcion(datos.getDescripcion());
            try {
                return ResponseEntity.ok((Object) categoriaRepo.save(c));
            } catch (Exception e) {
                return ResponseEntity.badRequest().body((Object) "Nombre de categoría ya existe.");
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        if (!categoriaRepo.existsById(id))
            return ResponseEntity.notFound().build();
        categoriaRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}