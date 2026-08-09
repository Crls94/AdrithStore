package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.CuentaFinanciera;
import com.AdrithStore.backend.model.TransaccionFinanciera;
import com.AdrithStore.backend.repository.CuentaFinancieraRepository;
import com.AdrithStore.backend.repository.TransaccionFinancieraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import lombok.Data;
import org.springframework.http.ResponseEntity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tesoreria")
@RequiredArgsConstructor

public class TesoreriaController {

    private final CuentaFinancieraRepository      cuentaRepo;
    private final TransaccionFinancieraRepository txRepo;

    
    @GetMapping("/cuentas")
    public List<CuentaFinanciera> cuentas() {
        return cuentaRepo.findByActivaTrue();
    }

    
    @Transactional(readOnly = true)
    @GetMapping("/resumen")
    public Map<String, Object> resumen() {
        String periodo = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyy-MM"));

        List<CuentaFinanciera> cuentas = cuentaRepo.findByActivaTrue();
        BigDecimal totalGeneral = cuentas.stream()
            .map(c -> c.getSaldoActual() != null ? c.getSaldoActual() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        
        LocalDateTime inicioPeriodo = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        List<TransaccionFinanciera> movimientos = txRepo
            .findByFechaBetweenOrderByFechaDesc(inicioPeriodo, LocalDateTime.now());

        BigDecimal totalIngresos = movimientos.stream()
            .filter(t -> t.getSigno() != null && t.getSigno() == 1
                      && !"APERTURA".equals(t.getTipoMov()))
            .map(t -> t.getMonto() != null ? t.getMonto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalGastos = movimientos.stream()
            .filter(t -> t.getSigno() != null && t.getSigno() == -1)
            .map(t -> t.getMonto() != null ? t.getMonto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saldoApertura = movimientos.stream()
            .filter(t -> "APERTURA".equals(t.getTipoMov()))
            .map(t -> t.getMonto() != null ? t.getMonto() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("cuentas",              cuentas);
        res.put("totalGeneral",         totalGeneral);
        res.put("periodo",              periodo);
        res.put("movimientosPeriodo",   (long) movimientos.size());
        res.put("totalIngresosPeriodo", totalIngresos);
        res.put("totalGastosPeriodo",   totalGastos);
        res.put("saldoApertura",        saldoApertura);
        return res;
    }

    
    @Transactional(readOnly = true)
    @GetMapping("/movimientos")
    public List<TransaccionFinanciera> movimientos(
            @RequestParam(defaultValue = "30") int dias) {
        LocalDateTime desde = LocalDateTime.now().minusDays(dias);
        return txRepo.findByFechaBetweenOrderByFechaDesc(desde, LocalDateTime.now());
    }

    
    
    @PostMapping("/gasto")
    @Transactional
    public ResponseEntity<?> registrarGasto(@RequestBody GastoRequest req) {
        if (req.getConcepto() == null || req.getConcepto().isBlank())
            return ResponseEntity.badRequest().body("El concepto es obligatorio.");
        if (req.getMonto() == null || req.getMonto().compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body("El monto debe ser mayor a 0.");

        
        String nombreCuenta = req.getCuenta() != null ? req.getCuenta() : "Caja Fisica";
        CuentaFinanciera cuenta = cuentaRepo.findByNombreIgnoreCase(nombreCuenta)
            .orElseGet(() -> cuentaRepo.findByActivaTrue().stream().findFirst()
                .orElse(null));

        if (cuenta == null)
            return ResponseEntity.badRequest().body("No se encontró la cuenta: " + nombreCuenta);

        
        BigDecimal nuevoSaldo = (cuenta.getSaldoActual() != null ? cuenta.getSaldoActual() : BigDecimal.ZERO)
            .subtract(req.getMonto());

        if (nuevoSaldo.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(
                "Saldo insuficiente en " + cuenta.getNombre()
                + " (disponible: S/ " + cuenta.getSaldoActual()
                + "). No se puede registrar un gasto de S/ " + req.getMonto() + "."
            );
        }

        cuenta.setSaldoActual(nuevoSaldo);
        cuentaRepo.save(cuenta);

        
        TransaccionFinanciera tx = new TransaccionFinanciera();
        tx.setCuenta(cuenta);
        tx.setMonto(req.getMonto());
        tx.setSigno(-1);
        tx.setTipoMov("GASTO");
        tx.setConcepto(req.getTipo() + ": " + req.getConcepto());
        tx.setFecha(LocalDateTime.now());
        tx.setPeriodo(java.time.LocalDateTime.now()
            .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM")));
        txRepo.save(tx);

        return ResponseEntity.ok(java.util.Map.of(
            "mensaje",     "Gasto registrado correctamente.",
            "nuevoSaldo",  nuevoSaldo,
            "cuenta",      cuenta.getNombre()
        ));
    }

    @Data
    public static class GastoRequest {
        private String     concepto;
        private String     tipo;
        private BigDecimal monto;
        private String     cuenta;
    }

}