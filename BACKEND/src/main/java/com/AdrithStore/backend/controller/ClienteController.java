package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.Cliente;
import com.AdrithStore.backend.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ClienteController {

    private final ClienteRepository clienteRepo;

    @GetMapping
    public List<Cliente> listar() {
        return clienteRepo.findAll();
    }

    @GetMapping("/buscar")
    public List<Cliente> buscar(@RequestParam String q) {
        return clienteRepo.findByNombreContainingOrApellidoContainingOrDniContaining(q, q, q);
    }

    @PostMapping
    public Cliente crear(@RequestBody Cliente cliente) {
        return clienteRepo.save(cliente);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> actualizar(@PathVariable Integer id,
                                               @RequestBody Cliente datos) {
        return clienteRepo.findById(id).map(c -> {
            c.setNombre(datos.getNombre());
            c.setApellido(datos.getApellido());
            c.setDni(datos.getDni());
            c.setTelefono(datos.getTelefono());
            return ResponseEntity.ok(clienteRepo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Integer id) {
        if (!clienteRepo.existsById(id)) return ResponseEntity.notFound().build();
        clienteRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}