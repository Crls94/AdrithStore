package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.ProductoUnidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductoUnidadRepository extends JpaRepository<ProductoUnidad, Integer> {
    List<ProductoUnidad> findByProducto_IdProducto(Integer idProducto);
}