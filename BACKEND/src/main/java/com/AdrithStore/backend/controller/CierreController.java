package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.CierreDiario;
import com.AdrithStore.backend.repository.CierreDiarioRepository;
import com.AdrithStore.backend.security.AuthenticatedUser;
import com.AdrithStore.backend.service.TesoreriaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tesoreria/cierre")
@RequiredArgsConstructor
public class CierreController {

    private final TesoreriaService           tesoreriaService;
    private final CierreDiarioRepository     cierreRepo;

    @GetMapping("/preview")
    public List<Map<String, Object>> preview(
            @RequestParam(required = false) LocalDate fecha) {
        if (fecha == null) fecha = LocalDate.now();
        return tesoreriaService.obtenerPreviewCierre(fecha);
    }

    @PostMapping("/ejecutar")
    @Transactional
    public ResponseEntity<?> ejecutar(@RequestBody EjecutarCierreRequest req,
            @AuthenticationPrincipal AuthenticatedUser me) {
        if (req.getFecha() == null)
            return ResponseEntity.badRequest().body("La fecha es obligatoria.");
        if (req.getItems() == null || req.getItems().isEmpty())
            return ResponseEntity.badRequest().body("Debe incluir al menos una cuenta.");
        try {
            // "Cerrado por" sale del admin autenticado (JWT), no de un valor mandado
            // por el cliente - no se puede confiar en el frontend para un dato de
            // auditoría (ver SecurityConfig: este endpoint ya exige rol ADMIN).
            tesoreriaService.ejecutarCierre(
                req.getFecha(), req.getItems(), me.username());
            return ResponseEntity.ok(Map.of(
                "mensaje", "Cierre ejecutado correctamente para el " + req.getFecha()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/historial")
    public List<CierreDiario> historial(
            @RequestParam(required = false) LocalDate desde,
            @RequestParam(required = false) LocalDate hasta) {
        if (desde == null) desde = LocalDate.now().minusDays(30);
        if (hasta == null) hasta = LocalDate.now().plusDays(1);
        return cierreRepo.findByFechaCierreBetweenOrderByFechaCierreDesc(desde, hasta);
    }

    @Data
    public static class EjecutarCierreRequest {
        private LocalDate fecha;
        private List<TesoreriaService.ItemCierre> items;
        // "usuario" ya no se lee de acá: "Cerrado por" sale del admin autenticado
        // (ver @AuthenticationPrincipal en ejecutar()), no de un valor que mande el
        // cliente.
    }
}
