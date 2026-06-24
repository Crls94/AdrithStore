package com.AdrithStore.backend.repository;
 
import com.AdrithStore.backend.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
 
@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
 
    Optional<Usuario> findByUsername(String username);
 
    boolean existsByUsername(String username);
 
    boolean existsByDni(String dni);
 
    // Contar todos los usuarios (para detectar si es la primera vez)
    long count();
 
    List<Usuario> findByRolOrderByNombresAsc(String rol);
 
    List<Usuario> findAllByOrderByNombresAsc();
}