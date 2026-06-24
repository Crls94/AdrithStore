package com.AdrithStore.backend.service;

import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TesoreriaService {

    private final CuentaFinancieraRepository          cuentaRepo;
    private final TransaccionFinancieraRepository     txRepo;
    private final PeriodoContableRepository           periodoRepo;

    private static final DateTimeFormatter PERIODO_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    public String periodoActual() {
        return LocalDateTime.now().format(PERIODO_FMT);
    }

    // ── Registrar una transacción financiera ─────────────────────────────
    @Transactional
    public TransaccionFinanciera registrar(String tipoMov, String nombreCuenta,
                                            BigDecimal monto, int signo,
                                            String concepto,
                                            Integer idVenta, Integer idCompra,
                                            String creadaPor) {
        CuentaFinanciera cuenta = cuentaRepo.findByNombreIgnoreCase(nombreCuenta)
            .orElseThrow(() -> new IllegalArgumentException("Cuenta no encontrada: " + nombreCuenta));

        TransaccionFinanciera tx = new TransaccionFinanciera();
        tx.setTipoMov(tipoMov);
        tx.setCuenta(cuenta);
        tx.setMonto(monto.abs().setScale(2, RoundingMode.HALF_UP));
        tx.setSigno(signo);
        tx.setConcepto(concepto);
        tx.setIdVenta(idVenta);
        tx.setIdCompra(idCompra);
        tx.setPeriodo(periodoActual());
        tx.setCreadaPor(creadaPor);
        tx.setFecha(LocalDateTime.now());

        return txRepo.save(tx);
    }

    // ── Procesar venta: genera TX financieras según medio de pago ────────
    @Transactional
    public void procesarVenta(Venta venta, List<VentaDetalle> detalles,
                               List<VentaPago> pagos, String usuario) {

        // TX por cada medio de pago
        for (VentaPago pago : pagos) {
            String nombreCuenta = resolverCuenta(pago.getMedioPago());
            registrar("VENTA", nombreCuenta,
                pago.getMonto(), +1,
                "Cobro venta #" + venta.getIdVenta() + " - " + pago.getMedioPago(),
                venta.getIdVenta(), null, usuario);
        }

        // TX adicionales para SERVICIO_COMIS (cambio Plin) — pendiente implementación completa
        // VentaDetalle actual no tiene montoOperacion ni comisionCobrada
        // Esta rama se activará cuando se agregue soporte para cambio digital
    }

    /**
     * Flujo Cambio Plin:
     *   Cliente transfiere (monto + comisión) al Plin → cajero entrega monto en efectivo
     *   TX1: Plin  INGRESO  +(monto + comision)
     *   TX2: Caja  EGRESO   -monto
     */
    @Transactional
    public void procesarCambioDigital(Venta venta, VentaDetalle det, String usuario) {
        // Usar subtotal como base — montoOperacion se implementará en v2
        BigDecimal montoOp  = det.getSubtotal() != null ? det.getSubtotal() : BigDecimal.ZERO;
        BigDecimal comision = det.getSubtotal() != null ? det.getSubtotal() : BigDecimal.ZERO;

        // TX 1: ingreso total al Plin
        registrar("CAMBIO_DIGITAL", "Plin",
            montoOp.add(comision), +1,
            "Plin INGRESO - cambio digital venta #" + venta.getIdVenta()
                + " (S/" + montoOp + " entregado + S/" + comision + " comision)",
            venta.getIdVenta(), null, usuario);

        // TX 2: egreso de caja
        registrar("CAMBIO_DIGITAL", "Caja Fisica",
            montoOp, -1,
            "Caja EGRESO - efectivo entregado cambio digital venta #" + venta.getIdVenta(),
            venta.getIdVenta(), null, usuario);
    }

    // ── Registrar gasto operativo (luz, tóner, etc.) ──────────────────────
    @Transactional
    public TransaccionFinanciera registrarGasto(String nombreCuenta, BigDecimal monto,
                                                String concepto, String usuario) {
        return registrar("GASTO", nombreCuenta, monto, -1,
            "GASTO: " + concepto, null, null, usuario);
    }

    // ── Apertura de período mensual ───────────────────────────────────────
    @Transactional
    public PeriodoContable abrirPeriodo(String periodo, List<SaldoApertura> saldos,
                                         String notas, String usuario) {
        if (periodoRepo.existsByPeriodo(periodo))
            throw new IllegalStateException("El periodo " + periodo + " ya fue abierto.");

        PeriodoContable pc = new PeriodoContable();
        pc.setPeriodo(periodo);
        pc.setNotas(notas);
        periodoRepo.save(pc);

        for (SaldoApertura sa : saldos) {
            if (sa.getMonto().compareTo(BigDecimal.ZERO) > 0) {
                registrar("APERTURA", sa.getNombreCuenta(), sa.getMonto(), +1,
                    "Saldo apertura " + periodo, null, null, usuario);
            }
        }

        recalcularSaldos();
        return pc;
    }

    // ── Recalcular saldos (SELECT FOR UPDATE para evitar race condition) ──
    @Transactional
    public void recalcularSaldos() {
        List<CuentaFinanciera> cuentas = cuentaRepo.findAllForUpdate();
        for (CuentaFinanciera cuenta : cuentas) {
            BigDecimal saldo = txRepo.calcularSaldoTotal(cuenta.getIdCuenta())
                .orElse(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);
            cuenta.setSaldoActual(saldo);
            cuentaRepo.save(cuenta);
        }
    }

    // ── Resolver cuenta por medio de pago ────────────────────────────────
    private String resolverCuenta(String medioPago) {
        if (medioPago == null) return "Caja Fisica";
        switch (medioPago.toLowerCase().trim()) {
            case "efectivo":       return "Caja Fisica";
            case "yape/plin":
            case "plin":
            case "yape":           return "Plin";
            case "tarjeta":        return "Tarjeta POS";
            case "transferencia":  return "Transferencia";
            default:               return "Caja Fisica";
        }
    }

    // ── DTO: saldo de apertura ────────────────────────────────────────────
    // Clase normal (no record) para compatibilidad con Java 11
    public static class SaldoApertura {
        private final String nombreCuenta;
        private final BigDecimal monto;

        public SaldoApertura(String nombreCuenta, BigDecimal monto) {
            this.nombreCuenta = nombreCuenta;
            this.monto = monto;
        }

        public String getNombreCuenta() { return nombreCuenta; }
        public BigDecimal getMonto()    { return monto; }
    }
}