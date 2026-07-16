package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.VentaDetalleServicio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VentaDetalleServicioRepository extends JpaRepository<VentaDetalleServicio, Integer> {
    List<VentaDetalleServicio> findByVenta_IdVenta(Integer idVenta);
}
