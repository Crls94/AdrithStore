package com.AdrithStore.backend;

import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.service.CalculoCompra;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.math.BigDecimal;
import java.util.List;
import static org.assertj.core.api.Assertions.*;

class CalculoCompraTest {
    static CompraRequest solicitud(boolean activa, String percepcion, String global) {
        CompraRequest r = new CompraRequest();
        r.setAplicaPercepcion(activa); r.setPercepcion(new BigDecimal(percepcion));
        r.setDescuentoGlobal(new BigDecimal(global));
        CompraRequest.DetalleItem d = new CompraRequest.DetalleItem();
        d.setIdProducto(1); d.setCantidad(new BigDecimal("10"));
        d.setCostoUnitario(new BigDecimal("10")); d.setDescuentoPct(new BigDecimal("20"));
        r.setDetalles(List.of(d));
        return r;
    }

    @ParameterizedTest
    @CsvSource({"false,0,0,80,8", "true,1.60,0,81.60,8.16",
                "false,0,5,75,8", "true,1.60,5,76.60,8.16"})
    void descuentosPercepcionYGlobal(boolean activa, String percepcion, String global, String total, String cpp) {
        var c = CalculoCompra.calcular(solicitud(activa, percepcion, global));
        assertThat(c.subtotalNeto()).isEqualByComparingTo("80");
        assertThat(c.totalTesoreria()).isEqualByComparingTo(total);
        assertThat(c.lineas().getFirst().costoUnitario()).isEqualByComparingTo(cpp);
        assertThat(c.diferencia()).isZero();
    }
    @Test void sinDescuento() {
        var r = solicitud(false, "0", "0"); r.getDetalles().getFirst().setDescuentoPct(null);
        assertThat(CalculoCompra.calcular(r).totalTesoreria()).isEqualByComparingTo("100");
    }
    @Test void bonificacionMismoProducto() {
        var r = solicitud(true, "1.60", "0");
        r.getDetalles().getFirst().setUnidadesBonificacion(new BigDecimal("2"));
        var c = CalculoCompra.calcular(r);
        assertThat(c.lineas().getFirst().cantidadTotal()).isEqualByComparingTo("12");
        assertThat(c.lineas().getFirst().valorizado()).isEqualByComparingTo("81.60");
        assertThat(c.lineas().getFirst().costoUnitario()).isEqualByComparingTo("6.80");
    }
    @Test void variasLineasCompensanSoloCentavosVisibles() {
        var r = solicitud(true, "0.01", "0");
        var a = r.getDetalles().getFirst(); a.setCantidad(BigDecimal.ONE);
        a.setCostoTotal(new BigDecimal("0.25")); a.setDescuentoPct(BigDecimal.ZERO);
        r.setDetalles(List.of(a, a));
        var c = CalculoCompra.calcular(r);
        assertThat(c.percepcionCalculada()).isEqualByComparingTo("0.01");
        assertThat(c.lineas().stream().map(CalculoCompra.Linea::percepcionVisible)
            .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("0.01");
        c.lineas().forEach(l -> {
            assertThat(l.percepcion()).isEqualByComparingTo("0.005");
            assertThat(l.valorizado()).isEqualByComparingTo("0.255");
        });
    }
    @Test void costoBrutoExplicitoEvitaPerdidaPorDivision() {
        var r = solicitud(false, "0", "0");
        var d = r.getDetalles().getFirst(); d.setCantidad(new BigDecimal("300"));
        d.setCostoTotal(new BigDecimal("10")); d.setCostoUnitario(new BigDecimal("0.0333"));
        d.setDescuentoPct(BigDecimal.ZERO);
        assertThat(CalculoCompra.calcular(r).subtotalNeto()).isEqualByComparingTo("10");
    }
    @ParameterizedTest @CsvSource({"true,1.604,0", "true,1.605,0.01", "false,1.60,1.60"})
    void conciliacionMonetaria(boolean activa, String importe, String diferencia) {
        assertThat(CalculoCompra.calcular(solicitud(activa, importe, "0")).diferencia())
            .isEqualByComparingTo(diferencia);
    }
    @Test void compatibilidadSinBandera() {
        var r = solicitud(true, "1.60", "0"); r.setAplicaPercepcion(null);
        assertThat(CalculoCompra.calcular(r).percepcionCalculada()).isEqualByComparingTo("1.60");
    }
    @Test void entradasInvalidas() {
        var r = solicitud(false, "0", "0");
        r.getDetalles().getFirst().setDescuentoPct(new BigDecimal("101"));
        assertThatIllegalArgumentException().isThrownBy(() -> CalculoCompra.calcular(r));
        r.setDetalles(List.of());
        assertThatIllegalArgumentException().isThrownBy(() -> CalculoCompra.calcular(r));
    }
}
