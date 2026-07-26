package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.CierreDiario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CierreDiarioRepository extends JpaRepository<CierreDiario, Integer> {

    List<CierreDiario> findByFechaCierreOrderByIdCierre(LocalDate fechaCierre);


    Optional<CierreDiario> findFirstByFechaCierreAndCuenta_IdCuentaOrderByCerradoEnDesc(
        LocalDate fechaCierre, Integer idCuenta);

    List<CierreDiario> findByFechaCierreBetweenOrderByFechaCierreDesc(LocalDate desde, LocalDate hasta);
}
