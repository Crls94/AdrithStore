package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.TransaccionFinanciera;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransaccionFinancieraRepository extends JpaRepository<TransaccionFinanciera, Integer> {

    List<TransaccionFinanciera> findByPeriodoOrderByFechaDesc(String periodo);

    List<TransaccionFinanciera> findByFechaBetweenOrderByFechaDesc(
        LocalDateTime desde, LocalDateTime hasta);

    List<TransaccionFinanciera> findByCuenta_IdCuentaAndPeriodoOrderByFechaDesc(
        Integer idCuenta, String periodo);

    @Query("SELECT t FROM TransaccionFinanciera t WHERE t.idVenta = :idVenta")
    List<TransaccionFinanciera> findByVentaId(@Param("idVenta") Integer idVenta);

    
    @Query("""
        SELECT COALESCE(SUM(t.monto * t.signo), 0)
        FROM TransaccionFinanciera t
        WHERE t.cuenta.idCuenta = :idCuenta
    """)
    Optional<BigDecimal> calcularSaldoTotal(@Param("idCuenta") Integer idCuenta);

    
    
    @Query("""
        SELECT COALESCE(SUM(t.monto), 0)
        FROM TransaccionFinanciera t
        WHERE t.signo = -1
          AND t.tipoMov = 'GASTO'
          AND t.fecha BETWEEN :desde AND :hasta
    """)
    BigDecimal sumEgresosEntreFechas(
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta
    );

    @Query("""
        SELECT t.tipoMov, SUM(t.monto * t.signo)
        FROM TransaccionFinanciera t
        WHERE t.periodo = :periodo
        GROUP BY t.tipoMov
    """)
    List<Object[]> sumByTipoMovAndPeriodo(@Param("periodo") String periodo);

    @Query("""
        SELECT t FROM TransaccionFinanciera t
        WHERE t.cuenta.idCuenta = :idCuenta
          AND t.fecha BETWEEN :desde AND :hasta
        ORDER BY t.fecha DESC
    """)
    List<TransaccionFinanciera> findByCuentaAndFecha(
        @Param("idCuenta") Integer idCuenta,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta
    );

    List<TransaccionFinanciera> findByFechaAfterOrderByFechaDesc(LocalDateTime desde);

    

    @Query("""
        SELECT t FROM TransaccionFinanciera t
        WHERE t.fecha BETWEEN :desde AND :hasta
          AND (:tipoMov IS NULL OR t.tipoMov = :tipoMov)
          AND (:idCuenta IS NULL OR t.cuenta.idCuenta = :idCuenta)
    """)
    Page<TransaccionFinanciera> buscarPaginado(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                                                @Param("tipoMov") String tipoMov, @Param("idCuenta") Integer idCuenta,
                                                Pageable pageable);

    @Query("""
        SELECT COALESCE(SUM(t.monto * t.signo), 0)
        FROM TransaccionFinanciera t
        WHERE t.fecha BETWEEN :desde AND :hasta
          AND (:tipoMov IS NULL OR t.tipoMov = :tipoMov)
          AND (:idCuenta IS NULL OR t.cuenta.idCuenta = :idCuenta)
    """)
    BigDecimal sumTotales(@Param("desde") LocalDateTime desde, @Param("hasta") LocalDateTime hasta,
                          @Param("tipoMov") String tipoMov, @Param("idCuenta") Integer idCuenta);
}