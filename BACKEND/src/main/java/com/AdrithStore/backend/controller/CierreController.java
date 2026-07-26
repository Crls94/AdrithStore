package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.CierreDiario;
import com.AdrithStore.backend.model.CuentaFinanciera;
import com.AdrithStore.backend.repository.CierreDiarioRepository;
import com.AdrithStore.backend.repository.CuentaFinancieraRepository;
import com.AdrithStore.backend.service.TesoreriaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tesoreria/cierre")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CierreController {

    private final TesoreriaService           tesoreriaService;
    private final CierreDiarioRepository     cierreRepo;
    private final CuentaFinancieraRepository cuentaRepo;

    @GetMapping("/preview")
    public List<Map<String, Object>> preview(
            @RequestParam(required = false) LocalDate fecha) {
        if (fecha == null) fecha = LocalDate.now();
        return tesoreriaService.obtenerPreviewCierre(fecha);
    }

    @PostMapping("/ejecutar")
    @Transactional
    public ResponseEntity<?> ejecutar(@RequestBody EjecutarCierreRequest req) {
        if (req.getFecha() == null)
            return ResponseEntity.badRequest().body("La fecha es obligatoria.");
        if (req.getItems() == null || req.getItems().isEmpty())
            return ResponseEntity.badRequest().body("Debe incluir al menos una cuenta.");
        try {
            tesoreriaService.ejecutarCierre(
                req.getFecha(), req.getItems(), req.getUsuario());
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

    @PutMapping("/cuentas/{id}/fondo")
    @Transactional
    public ResponseEntity<?> actualizarFondo(
            @PathVariable Integer id,
            @RequestBody Map<String, BigDecimal> body) {
        CuentaFinanciera cuenta = cuentaRepo.findById(id).orElse(null);
        if (cuenta == null)
            return ResponseEntity.notFound().build();
        BigDecimal fondo = body.get("fondoCaja");
        if (fondo == null || fondo.compareTo(BigDecimal.ZERO) < 0)
            return ResponseEntity.badRequest().body("El fondo debe ser >= 0.");
        cuenta.setFondoCaja(fondo);
        cuentaRepo.save(cuenta);
        return ResponseEntity.ok(Map.of(
            "mensaje", "Fondo actualizado a S/ " + fondo,
            "cuenta", cuenta.getNombre(),
            "fondoCaja", fondo));
    }

    @Data
    public static class EjecutarCierreRequest {
        private LocalDate fecha;
        private List<TesoreriaService.ItemCierre> items;
        private String usuario;
    }
}
