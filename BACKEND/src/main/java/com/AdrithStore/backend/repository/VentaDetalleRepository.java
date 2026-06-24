package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.VentaDetalle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VentaDetalleRepository extends JpaRepository<VentaDetalle, Integer> {}