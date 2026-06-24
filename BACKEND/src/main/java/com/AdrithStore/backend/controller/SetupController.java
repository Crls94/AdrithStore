package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.TesoreriaService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/setup")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SetupController {

    private final SistemaConfigRepository        configRepo;
    private final ProductoRepository             productoRepo;
    private final CuentaFinancieraRepository     cuentaRepo;
    private final TransaccionFinancieraRepository txRepo;
    private final PeriodoContableRepository      periodoRepo;
    private final VentaRepository               ventaRepo;
    private final TesoreriaService              tesoreriaService;

    @GetMapping("/estado")
    public ResponseEntity<SistemaConfig> estado() {
        SistemaConfig config = configRepo.findById(1).orElseGet(() -> {
            SistemaConfig c = new SistemaConfig();
            return configRepo.save(c);
        });
        return ResponseEntity.ok(config);
    }

    @Transactional
    @PostMapping("/configurar")
    public ResponseEntity<?> configurar(@RequestBody SetupRequest req) {
        SistemaConfig config = configRepo.findById(1).orElse(new SistemaConfig());
        if (Boolean.TRUE.equals(config.getConfigurado()))
            return ResponseEntity.badRequest().body("El sistema ya esta configurado.");

        if (req.getNombreNegocio() != null && !req.getNombreNegocio().isBlank())
            config.setNombreNegocio(req.getNombreNegocio().trim());

        String periodo = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        if (!periodoRepo.existsByPeriodo(periodo)) {
            PeriodoContable pc = new PeriodoContable();
            pc.setPeriodo(periodo);
            periodoRepo.save(pc);
        }

        // ── Saldos — findFirst evita NonUniqueResultException si hay duplicados ──
        if (req.getSaldos() != null) {
            for (SetupRequest.SaldoCuenta sc : req.getSaldos()) {
                // findAllByNombreIgnoreCase retorna List → tomamos el primero
                List<CuentaFinanciera> coincidencias =
                    cuentaRepo.findAllByNombreIgnoreCase(sc.getNombreCuenta());

                if (coincidencias.isEmpty()) continue;
                CuentaFinanciera cuenta = coincidencias.get(0);

                cuenta.setSaldoActual(sc.getMonto() != null ? sc.getMonto() : BigDecimal.ZERO);
                cuentaRepo.save(cuenta);

                if (sc.getMonto() != null && sc.getMonto().compareTo(BigDecimal.ZERO) > 0) {
                    tesoreriaService.registrar(
                        "APERTURA", cuenta.getNombre(), sc.getMonto(), 1,
                        "Saldo inicial " + periodo, null, null, "setup");
                }
            }
        }

        config.setConfigurado(true);
        config.setFechaSetup(LocalDateTime.now());
        configRepo.save(config);

        return ResponseEntity.ok(Map.of(
            "ok", true,
            "nombreNegocio", config.getNombreNegocio() != null ? config.getNombreNegocio() : "",
            "mensaje", "Sistema configurado. Ya puede iniciar operaciones."
        ));
    }

    @Transactional
    @PostMapping("/reset-operaciones")
    public ResponseEntity<?> resetOperaciones(@RequestBody Map<String, String> req) {
        if (!"CONFIRMAR_RESET".equals(req.get("confirmacion")))
            return ResponseEntity.badRequest().body("Envia confirmacion: 'CONFIRMAR_RESET'");

        txRepo.deleteAll();
        ventaRepo.deleteAll();
        periodoRepo.deleteAll();

        List<Producto> productos = productoRepo.findAll();
        for (Producto p : productos)
            if ("BIEN_FISICO".equals(p.getTipo()) || "CONSUMIBLE".equals(p.getTipo()))
                p.setStock(0);
        productoRepo.saveAll(productos);

        List<CuentaFinanciera> cuentas = cuentaRepo.findAll();
        for (CuentaFinanciera c : cuentas) c.setSaldoActual(BigDecimal.ZERO);
        cuentaRepo.saveAll(cuentas);

        configRepo.findById(1).ifPresent(c -> {
            c.setConfigurado(false);
            c.setFechaSetup(null);
            configRepo.save(c);
        });

        return ResponseEntity.ok(Map.of("ok", true,
            "mensaje", "Reset completado. El sistema volvio al setup inicial."));
    }

    @Data public static class SetupRequest {
        private String nombreNegocio;
        private List<SaldoCuenta> saldos;
        private List<StockInicial> stocks;

        @Data public static class SaldoCuenta {
            private String nombreCuenta;
            private BigDecimal monto;
        }
        @Data public static class StockInicial {
            private Integer idProducto;
            private Integer cantidad;
            private BigDecimal costoPromedio;
        }
    }
}