package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Proveedor;
import com.AdrithStore.backend.repository.ProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProveedorController {

    private final ProveedorRepository proveedorRepo;

    @GetMapping
    public List<Proveedor> listar() {
        return proveedorRepo.findAll();
    }

    @GetMapping("/buscar")
    public List<Proveedor> buscar(@RequestParam String q) {
        return proveedorRepo.findByEmpresaContainingIgnoreCaseOrRucContaining(q, q);
    }

    @PostMapping
    public ResponseEntity<Proveedor> crear(@RequestBody Proveedor proveedor) {
        return ResponseEntity.ok(proveedorRepo.save(proveedor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Proveedor> actualizar(@PathVariable Integer id,
                                                @RequestBody Proveedor datos) {
        return proveedorRepo.findById(id).map(p -> {
            p.setEmpresa(datos.getEmpresa());
            p.setRuc(datos.getRuc());
            p.setDescripcion(datos.getDescripcion());
            p.setEmitePercepcion(datos.getEmitePercepcion());
            p.setTelefono(datos.getTelefono());
            p.setContacto(datos.getContacto());
            p.setEmail(datos.getEmail());
            return ResponseEntity.ok(proveedorRepo.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        if (!proveedorRepo.existsById(id)) return ResponseEntity.notFound().build();
        proveedorRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}