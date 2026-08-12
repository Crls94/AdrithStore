package com.AdrithStore.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(401);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"No autenticado.\"}");
                })
                .accessDeniedHandler((req, res, ex) -> {
                    res.setStatus(403);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"No tienes permiso para esta accion.\"}");
                }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Unicos endpoints alcanzables sin login:
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/primer-admin").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/auth/estado").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/recuperar/verificar").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/recuperar/cambiar").permitAll()
                .requestMatchers(HttpMethod.GET,  "/api/uploads/imagen/**").permitAll()

                // Mantenimiento masivo (reprocesa las imagenes de TODOS los productos):
                // solo se expone en AdminSistema.jsx, debe ser ADMIN-only tambien en el
                // backend, no solo escondido en el frontend.
                .requestMatchers(HttpMethod.POST, "/api/uploads/reparar-imagenes").hasRole("ADMIN")

                // Auto-servicio (mas especifico primero): cualquier logueado puede ver/editar
                // su propio perfil y su propia password; el controlador valida la identidad.
                .requestMatchers(HttpMethod.GET, "/api/usuarios/{id}").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/usuarios/{id}/password").authenticated()

                // Solo ADMIN (listar todos, crear, editar rol de otros, resetear password
                // ajena, activar/desactivar):
                .requestMatchers("/api/usuarios/**").hasRole("ADMIN")
                .requestMatchers("/api/tesoreria/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/setup/reset-operaciones").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/setup/configurar").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,  "/api/setup/estado").hasRole("ADMIN")
                .requestMatchers("/api/eventos/**").hasRole("ADMIN")

                // Debe ir ANTES que /api/reportes/** (mas especifico primero: Spring
                // Security evalua los matchers en orden y usa el primero que calce).
                .requestMatchers("/api/reportes/ventas").authenticated()
                .requestMatchers("/api/reportes/**").hasRole("ADMIN")

                // Cualquier otro logueado (VENDEDOR o ADMIN): productos, ventas, compras, etc.
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
