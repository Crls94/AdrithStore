package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProductoRepository extends JpaRepository<Producto, Integer> {

    boolean existsByCategoriaNombre(String nombre);

    

    List<Producto> findByVisibleEnPosTrue();

    List<Producto> findByTipo(String tipo);

    
    List<Producto> findByNombreContainingIgnoreCaseOrSkuContainingIgnoreCase(
        String nombre, String sku);

    
    @Query("""
        SELECT p FROM Producto p
        WHERE p.tipo = 'BIEN_FISICO'
          AND p.stock IS NOT NULL
          AND p.stockAlert IS NOT NULL
          AND p.stock <= p.stockAlert
        ORDER BY p.stock ASC
    """)
    List<Producto> findStockBajo();

    
    List<Producto> findByStockLessThan(int cantidad);

    

    
    @Query("""
        SELECT COUNT(p) FROM Producto p
        WHERE p.tipo = 'BIEN_FISICO'
          AND p.stock IS NOT NULL
          AND p.stockAlert IS NOT NULL
          AND p.stock <= p.stockAlert
    """)
    long countProductosStockBajo();

    

    List<Producto> findByCategoria_IdCategoria(Integer idCategoria);
}