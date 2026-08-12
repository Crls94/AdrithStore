package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.CuentaFinanciera;
import com.AdrithStore.backend.model.TransaccionFinanciera;
import com.AdrithStore.backend.repository.CuentaFinancieraRepository;
import com.AdrithStore.backend.repository.TransaccionFinancieraRepository;
import com.AdrithStore.backend.security.AuthenticatedUser;
import com.AdrithStore.backend.service.LogService;
import com.AdrithStore.backend.service.TesoreriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final TesoreriaService                tesoreriaService;
    private final LogService                      logService;

    
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

    // Espejo de "gasto": no hay "fondo" que dejar en caja, así que inyectar plata a
    // una cuenta (aporte de capital, inversión, reponer caja) es un movimiento
    // explícito que el admin registra él mismo, no un objetivo que el sistema
    // reponga solo. Puramente movimiento de caja: no toca Venta ni las
    // estadísticas de ingresos/ganancia del dashboard (DashboardController solo
    // suma Venta.total).
    @PostMapping("/ingreso-capital")
    @Transactional
    public ResponseEntity<?> registrarIngresoCapital(@RequestBody GastoRequest req,
            @AuthenticationPrincipal AuthenticatedUser me) {
        if (req.getConcepto() == null || req.getConcepto().isBlank())
            return ResponseEntity.badRequest().body("El concepto es obligatorio.");
        if (req.getMonto() == null || req.getMonto().compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body("El monto debe ser mayor a 0.");

        String nombreCuenta = req.getCuenta() != null ? req.getCuenta() : "Caja Fisica";
        if (!cuentaRepo.findByNombreIgnoreCase(nombreCuenta).isPresent())
            return ResponseEntity.badRequest().body("No se encontró la cuenta: " + nombreCuenta);

        String concepto = (req.getTipo() != null ? req.getTipo() + ": " : "") + req.getConcepto();
        TransaccionFinanciera tx = tesoreriaService.registrar(
            "APORTE", nombreCuenta, req.getMonto(), 1, concepto,
            null, null, me.username());

        logService.log(LogService.INGRESO_CAPITAL_REGISTRADO, "TESORERIA", tx.getIdTransaccion(),
            "Ingreso de capital de S/ " + req.getMonto() + " en " + nombreCuenta
                + " — " + concepto + " (registrado por " + me.username() + ")", null);

        return ResponseEntity.ok(java.util.Map.of(
            "mensaje",    "Ingreso de capital registrado correctamente.",
            "nuevoSaldo", tx.getCuenta().getSaldoActual(),
            "cuenta",     tx.getCuenta().getNombre()
        ));
    }

    // Dinero saliendo de una cuenta que NO es un gasto operativo: sueldo del mes,
    // retorno de inversión, etc. A diferencia de ingreso-capital, acá sí hay que
    // validar que no se retire más de lo que hay en la cuenta.
    @PostMapping("/retiro")
    @Transactional
    public ResponseEntity<?> registrarRetiro(@RequestBody GastoRequest req,
            @AuthenticationPrincipal AuthenticatedUser me) {
        if (req.getConcepto() == null || req.getConcepto().isBlank())
            return ResponseEntity.badRequest().body("El concepto es obligatorio.");
        if (req.getMonto() == null || req.getMonto().compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body("El monto debe ser mayor a 0.");

        String nombreCuenta = req.getCuenta() != null ? req.getCuenta() : "Caja Fisica";
        CuentaFinanciera cuenta = cuentaRepo.findByNombreIgnoreCase(nombreCuenta).orElse(null);
        if (cuenta == null)
            return ResponseEntity.badRequest().body("No se encontró la cuenta: " + nombreCuenta);

        BigDecimal saldoActual = cuenta.getSaldoActual() != null ? cuenta.getSaldoActual() : BigDecimal.ZERO;
        if (saldoActual.subtract(req.getMonto()).compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(
                "Saldo insuficiente en " + cuenta.getNombre()
                + " (disponible: S/ " + saldoActual
                + "). No se puede retirar S/ " + req.getMonto() + "."
            );
        }

        String concepto = (req.getTipo() != null ? req.getTipo() + ": " : "") + req.getConcepto();
        TransaccionFinanciera tx = tesoreriaService.registrar(
            "RETIRO", nombreCuenta, req.getMonto(), -1, concepto,
            null, null, me.username());

        logService.log(LogService.RETIRO_REGISTRADO, "TESORERIA", tx.getIdTransaccion(),
            "Retiro de S/ " + req.getMonto() + " de " + nombreCuenta
                + " — " + concepto + " (registrado por " + me.username() + ")", null);

        return ResponseEntity.ok(java.util.Map.of(
            "mensaje",    "Retiro registrado correctamente.",
            "nuevoSaldo", tx.getCuenta().getSaldoActual(),
            "cuenta",     tx.getCuenta().getNombre()
        ));
    }

    // Mover plata propia entre dos cuentas propias (ej. Yape -> Efectivo). No es una
    // venta ni un gasto: el dinero sigue siendo del negocio, solo cambia de cuenta.
    // "TRANSFERENCIA" ya estaba en la whitelist de ck_transaccion_tipo_mov desde el
    // baseline pero nunca se usó (no confundir con la categoría de producto
    // "TRANSFERENCIA" del POS para cambio de divisa con comisión a un cliente -
    // esto es un movimiento interno de tesorería, sin comisión ni cliente).
    @PostMapping("/transferencia")
    @Transactional
    public ResponseEntity<?> registrarTransferencia(@RequestBody TransferenciaRequest req,
            @AuthenticationPrincipal AuthenticatedUser me) {
        if (req.getCuentaOrigen() == null || req.getCuentaOrigen().isBlank())
            return ResponseEntity.badRequest().body("La cuenta de origen es obligatoria.");
        if (req.getCuentaDestino() == null || req.getCuentaDestino().isBlank())
            return ResponseEntity.badRequest().body("La cuenta destino es obligatoria.");
        if (req.getCuentaOrigen().equalsIgnoreCase(req.getCuentaDestino()))
            return ResponseEntity.badRequest().body("Elige dos cuentas distintas.");
        if (req.getMonto() == null || req.getMonto().compareTo(BigDecimal.ZERO) <= 0)
            return ResponseEntity.badRequest().body("El monto debe ser mayor a 0.");

        CuentaFinanciera origen = cuentaRepo.findByNombreIgnoreCase(req.getCuentaOrigen()).orElse(null);
        if (origen == null)
            return ResponseEntity.badRequest().body("No se encontró la cuenta: " + req.getCuentaOrigen());
        if (!cuentaRepo.findByNombreIgnoreCase(req.getCuentaDestino()).isPresent())
            return ResponseEntity.badRequest().body("No se encontró la cuenta: " + req.getCuentaDestino());

        BigDecimal saldoOrigen = origen.getSaldoActual() != null ? origen.getSaldoActual() : BigDecimal.ZERO;
        if (saldoOrigen.subtract(req.getMonto()).compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(
                "Saldo insuficiente en " + origen.getNombre()
                + " (disponible: S/ " + saldoOrigen
                + "). No se puede transferir S/ " + req.getMonto() + "."
            );
        }

        String detalle = req.getConcepto() != null && !req.getConcepto().isBlank()
            ? " — " + req.getConcepto() : "";

        tesoreriaService.registrar("TRANSFERENCIA", req.getCuentaOrigen(), req.getMonto(), -1,
            "Transferencia a " + req.getCuentaDestino() + detalle, null, null, me.username());
        TransaccionFinanciera txDestino = tesoreriaService.registrar(
            "TRANSFERENCIA", req.getCuentaDestino(), req.getMonto(), 1,
            "Transferencia desde " + req.getCuentaOrigen() + detalle, null, null, me.username());

        logService.log(LogService.TRANSFERENCIA_REGISTRADA, "TESORERIA", txDestino.getIdTransaccion(),
            "Transferencia de S/ " + req.getMonto() + " de " + req.getCuentaOrigen()
                + " a " + req.getCuentaDestino() + detalle + " (registrado por " + me.username() + ")", null);

        return ResponseEntity.ok(java.util.Map.of(
            "mensaje", "Transferencia registrada correctamente."
        ));
    }

    @Data
    public static class GastoRequest {
        private String     concepto;
        private String     tipo;
        private BigDecimal monto;
        private String     cuenta;
    }

    @Data
    public static class TransferenciaRequest {
        private String     cuentaOrigen;
        private String     cuentaDestino;
        private BigDecimal monto;
        private String     concepto;
    }

}