package com.AdrithStore.backend;

import com.AdrithStore.backend.controller.DashboardController;
import com.AdrithStore.backend.controller.ReportesController;
import com.AdrithStore.backend.service.DashboardMetricasService;
import com.AdrithStore.backend.service.PeriodosDashboard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.*;

/** Opt-in estricto: base desechable, nunca la de desarrollo/producción. Cada fixture hace rollback. */
@EnabledIfSystemProperty(named = "dashboard.test.url", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55438/adrith_dashboard_issue18")
@ActiveProfiles("issue18-test")
@SpringBootTest(properties = {
    "spring.datasource.url=${dashboard.test.url}", "spring.datasource.username=postgres",
    "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=validate",
    "spring.flyway.enabled=true", "spring.sql.init.mode=never",
    "app.jwt.secret=issue18-test-only-secret-long-enough-for-hmac-256",
    "app.cors.allowed-origins=http://localhost:5173"
})
@Transactional
class DashboardIssue18IntegrationTest {
    @TestConfiguration
    static class Config {
        @Bean @Primary PeriodosDashboard calendarioPrueba() {
            return new PeriodosDashboard(Clock.fixed(Instant.parse("2026-09-18T20:00:00Z"), ZoneOffset.UTC));
        }
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired DashboardController dashboard;
    @Autowired ReportesController reportes;
    @Autowired DashboardMetricasService metricas;

    @BeforeEach void preparar() {
        jdbc.update("INSERT INTO usuario(id_usuario, username, password_hash, rol, nombres, apellidos) VALUES (18001,'issue18-a','test','VENDEDOR','Uno','Prueba'), (18002,'issue18-b','test','VENDEDOR','Dos','Prueba')");
        jdbc.update("INSERT INTO cliente(id_cliente,nombre) VALUES (18001,'Prueba')");
        jdbc.update("INSERT INTO categorias(id_categoria,nombre) VALUES (18001,'Productos prueba'), (18002,'Servicios prueba')");
        jdbc.update("INSERT INTO producto(id_producto,nombre,tipo,id_categoria,cpp,precio_venta,stock,unidad_medida) VALUES (18001,'Producto','BIEN_FISICO',18001,999,999,20,'UNIDAD'), (18002,'Servicio','SERVICIO_PURO',18002,999,999,0,'UNIDAD'), (18003,'Comisión','SERVICIO_COMIS',18002,999,999,0,'UNIDAD')");
        venta(18001, "2026-09-18T09:00:00", 18001, "confirmado", "80", "0");
        producto(18001, "2", "50", "30", "20", "80");
        venta(18002, "2026-09-18T10:00:00", 18001, "confirmado", "20", "0");
        servicio(18002, 18002, "20", "0", "7");
        venta(18003, "2026-09-18T11:00:00", 18002, "confirmado", "110", "0");
        servicio(18003, 18003, "100", "10", "2");
        venta(18004, "2026-09-17T12:00:00", 18002, "confirmado", "35", "0");
        producto(18004, "1", "30", "12", "0", "30");
        servicio(18004, 18002, "5", "0", "1");
        venta(18005, "2026-09-18T13:00:00", 18001, "anulado", "999", "0");
        producto(18005, "1", "999", "100", "0", "999");
        jdbc.update("INSERT INTO transaccion_financiera(id_transaccion,fecha,tipo_mov,monto,signo) VALUES (18001,'2026-09-18 14:00','GASTO',9,-1),(18002,'2026-09-17 14:00','GASTO',4,-1),(18003,'2026-09-18 14:00','TRANSFERENCIA',500,-1)");
        jdbc.update("INSERT INTO compra(id_compra,fecha,estado,total) VALUES (18001,'2026-09-18 08:00','confirmado',50),(18002,'2026-09-18 08:00','anulado',999)");
        jdbc.update("INSERT INTO cuenta_financiera(id_cuenta,nombre,saldo_actual,activa) VALUES (18001,'Transferencia',123.45,true),(18002,'Inactiva',999,false)");
    }

    void venta(int id, String fecha, int vendedor, String estado, String total, String global) {
        jdbc.update("INSERT INTO venta(id_venta,id_cliente,id_usuario,fecha,estado,total,descuento_global) VALUES (?,18001,?,?,?,?,?)",
                id, vendedor, LocalDateTime.parse(fecha), estado, new BigDecimal(total), new BigDecimal(global));
    }
    void producto(int venta, String cantidad, String precio, String costo, String descuento, String subtotal) {
        jdbc.update("INSERT INTO venta_detalle(id_venta,id_producto,cantidad,precio_historico,costo_historico,descuento_item,subtotal) VALUES (?,18001,?,?,?,?,?)",
                venta, new BigDecimal(cantidad), new BigDecimal(precio), new BigDecimal(costo), new BigDecimal(descuento), new BigDecimal(subtotal));
    }
    void servicio(int venta, int producto, String monto, String comision, String costo) {
        jdbc.update("INSERT INTO venta_detalle_servicio(id_venta,id_producto,monto,comision,costo,subtotal) VALUES (?,?,?,?,?,?)",
                venta, producto, new BigDecimal(monto), new BigDecimal(comision), costo == null ? null : new BigDecimal(costo), new BigDecimal(monto).add(new BigDecimal(comision)));
    }
    Map<String, Object> stats(String periodo, String tipo, Integer vendedor) { return dashboard.stats(periodo, tipo, vendedor); }
    Map<String, Object> mapa(String periodo, String tipo, Integer vendedor) { return reportes.ventasHeatmap(null, null, periodo, tipo, null, null, vendedor); }
    @SuppressWarnings("unchecked") Map<String, Object> totales(Map<String, Object> mapa) { return (Map<String, Object>) mapa.get("totales"); }
    @SuppressWarnings("unchecked") List<Map<String, Object>> filas(Map<String, Object> data, String key) { return (List<Map<String, Object>>) data.get(key); }
    BigDecimal numero(Map<String, Object> data, String key) { return new BigDecimal(data.get(key).toString()); }
    BigDecimal suma(List<Map<String, Object>> rows, String key) { return rows.stream().map(r -> numero(r, key)).reduce(BigDecimal.ZERO, BigDecimal::add); }

    @Test void diaConciliaProductosServiciosComisionAnuladasYCostosHistoricos() {
        var s = stats("hoy", "ingresos", null);
        assertThat(numero(s,"totalIngresos")).isEqualByComparingTo("110");
        assertThat(numero(s,"totalCostos")).isEqualByComparingTo("69");
        assertThat(numero(s,"ganancia")).isEqualByComparingTo("41");
        assertThat(numero(s,"totalGastos")).isEqualByComparingTo("9");
        assertThat(numero(s,"totalCompras")).isEqualByComparingTo("50");
        assertThat(s.get("totalVentas")).isEqualTo(3);
        assertThat(numero(s,"ticketPromedio")).isEqualByComparingTo("36.67");
        assertThat(numero(s,"margen")).isEqualByComparingTo("37.27");
        assertThat(numero(s,"utilidad")).isEqualByComparingTo("59.42");
        assertThat(filas(s,"serie")).hasSize(24);
        assertThat(suma(filas(s,"serie"),"totalIngresos")).isEqualByComparingTo(numero(s,"totalIngresos"));
        assertThat(suma(filas(s,"serie"),"ganancia")).isEqualByComparingTo("41");
        assertThat(suma(filas(s,"serie"),"totalGastos")).isEqualByComparingTo("9");
        var h = mapa("hoy", "ingresos", null);
        assertThat(numero(totales(h),"totalIngresos")).isEqualByComparingTo("110");
        assertThat(suma(filas(h,"content"),"monto")).isEqualByComparingTo("110");
        assertThat(numero(totales(h),"gananciaDiaMaximo")).isEqualByComparingTo("41");
    }

    @Test void vendedorYTipoCompartenUniversoGastosPermanecenGlobales() {
        var uno = stats("hoy","ingresos",18001);
        var dos = stats("hoy","ingresos",18002);
        assertThat(numero(uno,"totalIngresos")).isEqualByComparingTo("100");
        assertThat(numero(dos,"totalIngresos")).isEqualByComparingTo("10");
        assertThat(numero(dos,"totalCostos")).isEqualByComparingTo("2");
        assertThat(numero(dos,"totalGastos")).isEqualByComparingTo(numero(uno,"totalGastos"));
        for (String tipo : List.of("productos","servicios","ingresos")) {
            for (Integer vendedor : Arrays.asList(null,18001,18002)) {
                var s = stats("semana",tipo,vendedor);
                var h = mapa("semana",tipo,vendedor);
                assertThat(numero(totales(h),"totalIngresos")).isEqualByComparingTo(numero(s,"totalIngresos"));
                assertThat(suma(filas(s,"serie"),"totalIngresos")).isEqualByComparingTo(numero(s,"totalIngresos"));
                assertThat(totales(h).get("totalVentas")).isEqualTo(s.get("totalVentas"));
            }
        }
        assertThat(numero(stats("hoy","productos",null),"totalIngresos")).isEqualByComparingTo("80");
        assertThat(numero(stats("hoy","servicios",null),"totalIngresos")).isEqualByComparingTo("30");
    }

    @Test void ventaMixtaCuentaUnaVezYSusCostosNoSeMultiplican() {
        var s = stats("dia:2026-09-17","ingresos",18002);
        assertThat(s.get("totalVentas")).isEqualTo(1);
        assertThat(numero(s,"ticketPromedio")).isEqualByComparingTo("35");
        assertThat(numero(s,"totalCostos")).isEqualByComparingTo("13");
        assertThat(numero(s,"ganancia")).isEqualByComparingTo("22");
    }

    @Test void filtrosProductoCategoriaUsanMismasLineasYGanancia() {
        var p = reportes.ventasHeatmap("2026-09-17","2026-09-18","hoy","ingresos",18001,null,18002);
        assertThat(numero(totales(p),"totalIngresos")).isEqualByComparingTo("30");
        assertThat(numero(totales(p),"ganancia")).isEqualByComparingTo("18");
        var c = reportes.ventasHeatmap("2026-09-17","2026-09-18","hoy","ingresos",null,18002,18002);
        assertThat(numero(totales(c),"totalIngresos")).isEqualByComparingTo("15");
        assertThat(numero(totales(c),"ganancia")).isEqualByComparingTo("12");
        assertThat(c.get("subconjunto")).isEqualTo(true);
    }

    @Test void cerosRangosYSaldoActualIndependiente() {
        var s = stats("dia:2026-09-16","ingresos",null);
        assertThat(filas(s,"serie")).hasSize(24);
        assertThat(numero(s,"totalIngresos")).isZero();
        assertThat(numero(s,"ticketPromedio")).isZero();
        assertThat(numero(s,"margen")).isZero();
        assertThat(totales(mapa("dia:2026-09-16","ingresos",null)).get("diaMaximo")).isNull();
        for (String periodo : List.of("semana","semana:2026-09-14","semana:2026-09-07","mes","mes:2026-09","año","año:2026")) {
            var res = stats(periodo,"ingresos",null);
            assertThat(suma(filas(res,"serie"),"totalIngresos")).isEqualByComparingTo(numero(res,"totalIngresos"));
            assertThat(numero(totales(mapa(periodo,"ingresos",null)),"totalIngresos")).isEqualByComparingTo(numero(res,"totalIngresos"));
            assertThat(numero(dashboard.resumenTesoreria(),"totalGeneral")).isEqualByComparingTo("123.45");
        }
    }

    @Test void limitesExclusivosYNoIncluirVentasFuturas() {
        venta(18006,"2026-09-18T00:00:00",18001,"confirmado","1","0");
        producto(18006,"1","1","0","0","1");
        venta(18007,"2026-09-19T00:00:00",18001,"confirmado","500","0");
        producto(18007,"1","500","0","0","500");
        venta(18008,"2026-09-18T15:00:00",18001,"confirmado","200","0");
        producto(18008,"1","200","0","0","200");
        assertThat(numero(stats("hoy","ingresos",null),"totalIngresos")).isEqualByComparingTo("111");
        assertThat(numero(stats("semana:2026-09-14","ingresos",null),"totalIngresos")).isEqualByComparingTo("146");
    }

    @Test void diaMaximoEmpatadoEligeMasRecienteYNoMayorGanancia() {
        venta(18006,"2026-09-16T09:00:00",18001,"confirmado","110","0");
        producto(18006,"1","110","1","0","110");
        var t = totales(mapa("semana","ingresos",null));
        assertThat(t.get("diaMaximo")).isEqualTo(LocalDate.of(2026,9,18));
        assertThat(numero(t,"gananciaDiaMaximo")).isEqualByComparingTo("41");
    }

    @Test void snapshotsHistoricosNoSeReescribenNiSeProrrateaGlobal() {
        venta(18006,"2026-09-18T09:30:00",18001,"confirmado","25","5");
        producto(18006,"1","20","10","0","20");
        servicio(18006,18002,"10","0",null);
        var s = stats("hoy","ingresos",null);
        assertThat(numero(s,"totalIngresos")).isEqualByComparingTo("140");
        assertThat(numero(s,"descuentosGlobalesHistoricos")).isEqualByComparingTo("5");
        assertThat(s.get("costosAusentes")).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT total FROM venta WHERE id_venta=18006",BigDecimal.class)).isEqualByComparingTo("25");
        assertThat(jdbc.queryForObject("SELECT costo FROM venta_detalle_servicio WHERE id_venta=18006",BigDecimal.class)).isNull();
        assertThat(jdbc.queryForObject("SELECT cpp FROM producto WHERE id_producto=18001",BigDecimal.class)).isEqualByComparingTo("999");
    }

    @Test void validaFiltrosSinDevolverDatosDeOtroRango() {
        assertThatThrownBy(() -> stats("no-existe","ingresos",null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> stats("hoy","otro",null)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> reportes.ventasHeatmap("2026-09-18","2026-09-17","hoy","ingresos",null,null,null)).isInstanceOf(ResponseStatusException.class);
    }
}
