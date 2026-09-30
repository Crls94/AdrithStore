package com.AdrithStore.backend;

import com.AdrithStore.backend.infraestructura.MetricasSnapshot;
import com.AdrithStore.backend.security.JwtUtil;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.actuate.endpoint.web.WebEndpointsSupplier;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.*;

@EnabledIfSystemProperty(named = "infra.test.url", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55439/adrith_infra_issue22")
@ActiveProfiles("issue22-test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=${infra.test.url}", "spring.datasource.username=postgres", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=validate", "spring.flyway.enabled=true", "spring.sql.init.mode=never",
    "app.jwt.secret=issue22-test-only-secret-long-enough-for-hmac-256", "app.cors.allowed-origins=http://localhost:5173"
})
class InfraestructuraIssue22IntegrationTest {
    @Autowired TestRestTemplate http;
    @Autowired JwtUtil jwt;
    @Autowired MeterRegistry registry;
    @Autowired WebEndpointsSupplier endpoints;
    private ResponseEntity<String> get(String path, String rol) {
        var headers = new HttpHeaders();
        if (rol != null) headers.setBearerAuth(jwt.generarTokenAuth(22001, "infra-test", rol));
        return http.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }
    @Test void accesoRealJwtSoloAdminYActuatorNoPublicado() {
        assertThat(endpoints.getEndpoints()).isEmpty();
        assertThat(get("/api/infraestructura/metricas", null).getStatusCode().value()).isEqualTo(401);
        assertThat(get("/api/infraestructura/metricas", "VENDEDOR").getStatusCode().value()).isEqualTo(403);
        var admin = get("/api/infraestructura/metricas", "ADMIN");
        assertThat(admin.getStatusCode().value()).isEqualTo(200);
        assertThat(admin.getHeaders().getCacheControl()).contains("no-store");
        assertThat(admin.getBody()).doesNotContain("jdbc:", "password", "secret", "username", "connectionString");
        for (String path : new String[]{"/actuator/health", "/actuator/env", "/actuator/metrics"}) {
            assertThat(get(path, "VENDEDOR").getStatusCode().value()).isEqualTo(403);
            // La cadena existente puede convertir el error dispatch de un 404 en 401.
            assertThat(get(path, "ADMIN").getStatusCode().value()).isIn(401, 404);
        }
    }
    @Test void capturaTecnicaNoPideConexionSql() {
        var adquisiciones = registry.find("hikaricp.connections.acquire").timers();
        assertThat(adquisiciones).isNotEmpty();
        long antes = adquisiciones.stream().mapToLong(io.micrometer.core.instrument.Timer::count).sum();
        assertThat(get("/api/infraestructura/metricas", "ADMIN").getStatusCode().value()).isEqualTo(200);
        assertThat(adquisiciones.stream().mapToLong(io.micrometer.core.instrument.Timer::count).sum()).isEqualTo(antes);
    }
    @Test void instrumentosRealesHttpJvmPoolYContextoComercial() {
        get("/api/infraestructura/metricas", "VENDEDOR");
        var headers = new HttpHeaders();
        headers.setBearerAuth(jwt.generarTokenAuth(22001, "infra-test", "ADMIN"));
        var response = http.exchange("/api/infraestructura/metricas?incluirActividad=true", HttpMethod.GET,
                new HttpEntity<>(headers), MetricasSnapshot.class);
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        var metricas = response.getBody().secciones().stream().flatMap(s -> s.metricas().stream()).toList();
        for (String id : new String[]{"http.requests", "http.latency.mean", "jvm.memory.used", "process.uptime", "hikaricp.connections.active", "hikaricp.connections.max", "actividad.ventas", "actividad.compras"}) {
            assertThat(metricas.stream().filter(m -> m.id().equals(id)).findFirst().orElseThrow().estado()).as(id).isEqualTo(MetricasSnapshot.Estado.MEDIDO);
        }
        assertThat(registry.find("http.server.requests").tag("status", "403").timers()).isNotEmpty();
    }
}
