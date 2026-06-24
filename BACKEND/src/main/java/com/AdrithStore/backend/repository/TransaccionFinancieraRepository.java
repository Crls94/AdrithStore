package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.TransaccionFinanciera;
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

    // Saldo total de una cuenta usando signo +1/-1
    @Query("""
        SELECT COALESCE(SUM(t.monto * t.signo), 0)
        FROM TransaccionFinanciera t
        WHERE t.cuenta.idCuenta = :idCuenta
    """)
    Optional<BigDecimal> calcularSaldoTotal(@Param("idCuenta") Integer idCuenta);

    // Gastos operativos del período (tipoMov='GASTO', signo=-1)
    // El modelo tiene tipoMov (no 'tipo') y signo -1 para salidas
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
}