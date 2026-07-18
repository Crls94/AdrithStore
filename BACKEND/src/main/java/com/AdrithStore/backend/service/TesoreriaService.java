package com.AdrithStore.backend.service;

import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TesoreriaService {

    private final CuentaFinancieraRepository          cuentaRepo;
    private final TransaccionFinancieraRepository     txRepo;
    private final PeriodoContableRepository           periodoRepo;
    private final CierreDiarioRepository              cierreRepo;

    private static final DateTimeFormatter PERIODO_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    public String periodoActual() {
        return LocalDateTime.now().format(PERIODO_FMT);
    }

    
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

    
    @Transactional
    public void procesarVenta(Venta venta, List<VentaDetalle> detalles,
                               List<VentaPago> pagos, String usuario) {

        
        for (VentaPago pago : pagos) {
            String nombreCuenta = resolverCuenta(pago.getMedioPago());
            registrar("VENTA", nombreCuenta,
                pago.getMonto(), +1,
                "Cobro venta #" + venta.getIdVenta() + " - " + pago.getMedioPago(),
                venta.getIdVenta(), null, usuario);
        }

        
        
        
    }

     
    @Transactional
    public void procesarCambioDigital(Venta venta, VentaDetalle det, String usuario) {
        
        BigDecimal montoOp  = det.getSubtotal() != null ? det.getSubtotal() : BigDecimal.ZERO;
        BigDecimal comision = det.getSubtotal() != null ? det.getSubtotal() : BigDecimal.ZERO;

        
        registrar("CAMBIO_DIGITAL", "Plin",
            montoOp.add(comision), +1,
            "Plin INGRESO - cambio digital venta #" + venta.getIdVenta()
                + " (S/" + montoOp + " entregado + S/" + comision + " comision)",
            venta.getIdVenta(), null, usuario);

        
        registrar("CAMBIO_DIGITAL", "Caja Fisica",
            montoOp, -1,
            "Caja EGRESO - efectivo entregado cambio digital venta #" + venta.getIdVenta(),
            venta.getIdVenta(), null, usuario);
    }

     
    @Transactional
    public void procesarCambioDigital(Venta venta, VentaDetalleServicio det, String usuario) {
        BigDecimal montoOp   = det.getMonto() != null ? det.getMonto() : BigDecimal.ZERO;
        BigDecimal comision  = det.getComision() != null ? det.getComision() : BigDecimal.ZERO;
        BigDecimal total     = montoOp.add(comision);
        String nombreProd = det.getProducto() != null ? det.getProducto().getNombre() : "Producto";
        String concepto   = "Cambio: " + nombreProd
                           + (det.getDescripcion() != null ? " - " + det.getDescripcion() : "");

        
        if (det.getOrigen() != null && !det.getOrigen().isBlank()) {
            registrar("CAMBIO_DIGITAL", det.getOrigen(), montoOp, -1,
                concepto + " (origen)", venta.getIdVenta(), null, usuario);
        }

        
        if (det.getDestino() != null && !det.getDestino().isBlank()) {
            registrar("CAMBIO_DIGITAL", det.getDestino(), total, 1,
                concepto + " (destino)", venta.getIdVenta(), null, usuario);
        }
    }

    
    @Transactional
    public TransaccionFinanciera registrarGasto(String nombreCuenta, BigDecimal monto,
                                                String concepto, String usuario) {
        return registrar("GASTO", nombreCuenta, monto, -1,
            "GASTO: " + concepto, null, null, usuario);
    }

    
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

    
    public List<Map<String, Object>> obtenerPreviewCierre(LocalDate fecha) {
        List<CuentaFinanciera> cuentas = cuentaRepo.findByActivaTrue();
        List<Map<String, Object>> preview = new ArrayList<>();
        for (CuentaFinanciera c : cuentas) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idCuenta", c.getIdCuenta());
            item.put("nombre", c.getNombre());
            item.put("saldoSistema", c.getSaldoActual());
            item.put("fondoCaja", c.getFondoCaja() != null ? c.getFondoCaja() : BigDecimal.ZERO);
            item.put("retiroSugerido",
                c.getSaldoActual().subtract(c.getFondoCaja() != null ? c.getFondoCaja() : BigDecimal.ZERO));

            boolean yaCerrado = cierreRepo
                .findByFechaCierreAndCuenta_IdCuenta(fecha, c.getIdCuenta()).isPresent();
            item.put("yaCerrado", yaCerrado);

            if (yaCerrado) {
                CierreDiario cd = cierreRepo
                    .findByFechaCierreAndCuenta_IdCuenta(fecha, c.getIdCuenta()).get();
                item.put("saldoContado", cd.getSaldoContado());
                item.put("diferencia", cd.getDiferencia());
                item.put("cerradoEn", cd.getCerradoEn());
            }

            preview.add(item);
        }
        return preview;
    }

    
    @Transactional
    public void ejecutarCierre(LocalDate fecha, List<ItemCierre> items, String usuario) {
        for (ItemCierre item : items) {
            CuentaFinanciera cuenta = cuentaRepo.findById(item.getIdCuenta())
                .orElseThrow(() -> new IllegalArgumentException(
                    "Cuenta no encontrada: " + item.getIdCuenta()));

            
            if (cierreRepo.findByFechaCierreAndCuenta_IdCuenta(fecha, cuenta.getIdCuenta()).isPresent())
                throw new IllegalStateException(
                    "La cuenta " + cuenta.getNombre() + " ya fue cerrada para el día " + fecha);

            BigDecimal saldoSistema = cuenta.getSaldoActual();
            BigDecimal saldoContado = item.getSaldoContado();
            BigDecimal diferencia = saldoContado.subtract(saldoSistema);
            BigDecimal fondo = cuenta.getFondoCaja() != null ? cuenta.getFondoCaja() : BigDecimal.ZERO;
            BigDecimal retiro = saldoContado.subtract(fondo);
            boolean ajusteRegistrado = false;

            
            if (diferencia.compareTo(BigDecimal.ZERO) != 0) {
                int signo = diferencia.compareTo(BigDecimal.ZERO) > 0 ? 1 : -1;
                registrar("AJUSTE", cuenta.getNombre(), diferencia.abs(), signo,
                    "AJUSTE cierre " + fecha + " (contado=" + saldoContado + ", sistema=" + saldoSistema + ")",
                    null, null, usuario);
                ajusteRegistrado = true;
                cuenta.setSaldoActual(saldoContado);
            }

            
            if (retiro.compareTo(BigDecimal.ZERO) > 0) {
                registrar("RETIRO", cuenta.getNombre(), retiro, -1,
                    "RETIRO cierre " + fecha + " (contado=" + saldoContado + ", fondo=" + fondo + ")",
                    null, null, usuario);
                cuenta.setSaldoActual(fondo);
            }

            cuentaRepo.save(cuenta);

            
            CierreDiario cd = new CierreDiario();
            cd.setFechaCierre(fecha);
            cd.setCuenta(cuenta);
            cd.setSaldoSistema(saldoSistema);
            cd.setSaldoContado(saldoContado);
            cd.setDiferencia(diferencia);
            cd.setFondoDejado(fondo);
            cd.setRetiro(retiro);
            cd.setAjusteRegistrado(ajusteRegistrado);
            cd.setObservacion(item.getObservacion());
            cd.setCerradoPor(usuario);
            cd.setCerradoEn(LocalDateTime.now());
            cd.setEstado("cerrado");
            cierreRepo.save(cd);
        }
    }

    
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

    
    public static class ItemCierre {
        private final Integer    idCuenta;
        private final BigDecimal saldoContado;
        private final String     observacion;

        public ItemCierre(Integer idCuenta, BigDecimal saldoContado, String observacion) {
            this.idCuenta    = idCuenta;
            this.saldoContado = saldoContado;
            this.observacion  = observacion;
        }

        public Integer    getIdCuenta()    { return idCuenta; }
        public BigDecimal getSaldoContado() { return saldoContado; }
        public String     getObservacion()  { return observacion; }
    }

    
    
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