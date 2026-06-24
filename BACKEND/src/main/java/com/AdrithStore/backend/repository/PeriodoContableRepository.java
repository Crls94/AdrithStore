package com.AdrithStore.backend.repository;

import com.AdrithStore.backend.model.PeriodoContable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PeriodoContableRepository extends JpaRepository<PeriodoContable, Integer> {

    Optional<PeriodoContable> findByPeriodo(String periodo);

    boolean existsByPeriodo(String periodo);
}