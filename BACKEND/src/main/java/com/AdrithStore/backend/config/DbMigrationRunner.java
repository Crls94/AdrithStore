package com.AdrithStore.backend.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Correcciones de esquema que Hibernate ddl-auto=update no puede aplicar solo
// (no elimina constraints existentes). Se ejecutan acá vía JdbcTemplate en vez
// de data.sql porque Spring parte data.sql por cada ";" sin entender el
// dollar-quoting ($$...$$) de los bloques PL/pgSQL, lo que corrompe el DO block.
@Component
public class DbMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DbMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        // Permite varios cierres de caja por cuenta el mismo día (reconciliación
        // más frecuente): elimina la constraint única (fecha_cierre, id_cuenta)
        // de cierre_diario si todavía existe.
        jdbcTemplate.execute("""
            DO $$
            DECLARE
                v_constraint_name text;
            BEGIN
                SELECT tc.constraint_name INTO v_constraint_name
                FROM information_schema.table_constraints tc
                WHERE tc.table_name = 'cierre_diario'
                  AND tc.constraint_type = 'UNIQUE'
                LIMIT 1;
                IF v_constraint_name IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE cierre_diario DROP CONSTRAINT ' || quote_ident(v_constraint_name);
                END IF;
            END $$;
            """);
    }
}
