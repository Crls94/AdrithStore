package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.CuentaFinanciera;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CuentaFinancieraRepository extends JpaRepository<CuentaFinanciera, Integer> {

    List<CuentaFinanciera> findByActivaTrue();

    // Retorna Optional — falla si hay más de 1 resultado (usar solo cuando la BD está limpia)
    Optional<CuentaFinanciera> findByNombreIgnoreCase(String nombre);

    // Retorna List — seguro aunque haya duplicados (usar en Setup y TesoreriaService)
    List<CuentaFinanciera> findAllByNombreIgnoreCase(String nombre);

    // Para recalcular saldos con lock para evitar race conditions
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CuentaFinanciera c WHERE c.activa = true")
    List<CuentaFinanciera> findAllForUpdate();
}