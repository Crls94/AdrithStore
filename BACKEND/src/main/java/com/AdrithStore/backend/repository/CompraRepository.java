package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Compra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraRepository extends JpaRepository<Compra, Integer> {
    List<Compra> findAllByOrderByFechaDesc();
    List<Compra> findByEstadoOrderByFechaDesc(String estado);
}