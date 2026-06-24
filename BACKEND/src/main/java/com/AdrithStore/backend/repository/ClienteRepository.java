package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Integer> {
    List<Cliente> findByNombreContainingOrApellidoContainingOrDniContaining(
        String nombre, String apellido, String dni);
}