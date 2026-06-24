package com.AdrithStore.backend.repository;
 
import com.AdrithStore.backend.model.SistemaConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
 
@Repository
public interface SistemaConfigRepository extends JpaRepository<SistemaConfig, Integer> {
    // findById(1) siempre retorna la config global
}