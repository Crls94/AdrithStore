package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Proveedor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProveedorRepository extends JpaRepository<Proveedor, Integer> {
    List<Proveedor> findByEmpresaContainingIgnoreCaseOrRucContaining(String empresa, String ruc);
}