package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.CompraAjuste;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CompraAjusteRepository extends JpaRepository<CompraAjuste, Integer> {
    List<CompraAjuste> findByCompraOriginal_IdCompraOrderByFechaDesc(Integer idCompra);
    List<CompraAjuste> findByProducto_IdProductoOrderByFechaDesc(Integer idProducto);
}