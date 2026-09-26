package com.AdrithStore.backend;

import com.AdrithStore.backend.controller.CompraController;
import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.BigDecimal;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

// Opt-in: nunca usa la BD de desarrollo. Ejecutar solo contra una instancia desechable.
@EnabledIfSystemProperty(named = "cpp.test.url", matches = "jdbc:postgresql://127\\.0\\.0\\.1:55437/adrith_cpp_issue7")
@ActiveProfiles("issue7-test")
@SpringBootTest(properties = {
    "spring.datasource.url=${cpp.test.url}", "spring.datasource.username=postgres",
    "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false", "spring.sql.init.mode=never",
    "app.jwt.secret=issue7-test-only-secret-long-enough-for-hmac-256",
    "app.cors.allowed-origins=http://localhost:5173"
})
class CompraIssue7IntegrationTest {
    @Autowired CompraController controller;
    @Autowired ProductoRepository productos;
    @Autowired ProveedorRepository proveedores;
    @Autowired CompraRepository compras;
    @Autowired CuentaFinancieraRepository cuentas;
    @Autowired TransaccionFinancieraRepository movimientos;
    @Autowired JdbcTemplate jdbc;
    Producto principal;
    Proveedor proveedor;

    @BeforeEach void preparar() {
        jdbc.execute("TRUNCATE compra, producto, proveedores, cuenta_financiera, evento_log RESTART IDENTITY CASCADE");
        proveedor = new Proveedor(); proveedor.setEmpresa("Proveedor prueba CPP");
        proveedor = proveedores.save(proveedor);
        principal = producto("Principal", "0", "4");
        CuentaFinanciera cuenta = new CuentaFinanciera(); cuenta.setNombre("Caja Fisica");
        cuentas.save(cuenta);
    }
    Producto producto(String nombre, String stock, String cpp) {
        Producto p = new Producto(); p.setNombre(nombre); p.setStock(new BigDecimal(stock));
        p.setCpp(new BigDecimal(cpp)); p.setPrecioVenta(new BigDecimal("15"));
        return productos.save(p);
    }
    CompraRequest solicitud(boolean activa, String percepcion, String global) {
        var r = CalculoCompraTest.solicitud(activa, percepcion, global);
        r.setIdProveedor(proveedor.getIdProveedor());
        r.getDetalles().getFirst().setIdProducto(principal.getIdProducto());
        return r;
    }
    Producto releer(Producto p) { return productos.findById(p.getIdProducto()).orElseThrow(); }

    @ParameterizedTest
    @CsvSource({"false,0,0,80,8", "true,1.60,0,81.60,8.16",
        "false,0,5,75,8", "true,1.60,5,76.60,8.16"})
    void persisteCostosYFinanzas(boolean activa, String percepcion, String global, String pago, String cpp) {
        assertThat(controller.crear(solicitud(activa, percepcion, global)).getStatusCode().value()).isEqualTo(200);
        assertThat(releer(principal).getCpp()).isEqualByComparingTo(cpp);
        assertThat(releer(principal).getStock()).isEqualByComparingTo("10");
        assertThat(releer(principal).getPrecioVenta()).isEqualByComparingTo("15");
        Compra compra = compras.findAll().getFirst();
        assertThat(compra.getSubtotal()).isEqualByComparingTo("80");
        assertThat(compra.getPercepcion()).isEqualByComparingTo(percepcion);
        assertThat(compra.getTotal()).isEqualByComparingTo(pago);
        assertThat(movimientos.findAll()).hasSize(1);
        assertThat(movimientos.findAll().getFirst().getMonto()).isEqualByComparingTo(pago);
        assertThat(cuentas.findAll().getFirst().getSaldoActual()).isEqualByComparingTo(new BigDecimal(pago).negate());
    }
    @Test void promedioConStockPrevio() {
        principal.setStock(new BigDecimal("10")); productos.save(principal);
        controller.crear(solicitud(true, "1.60", "0"));
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("6.08");
    }
    @Test void mismoProductoDilucion() {
        var r = solicitud(true, "1.60", "0");
        r.getDetalles().getFirst().setUnidadesBonificacion(new BigDecimal("2"));
        controller.crear(r);
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("6.80");
        assertThat(releer(principal).getStock()).isEqualByComparingTo("12");
    }
    @Test void regaloDistintoConservaCppSinReducirPrincipal() {
        Producto regalo = producto("Regalo", "5", "3.1234");
        var r = solicitud(true, "1.60", "0"); var d = r.getDetalles().getFirst();
        d.setIdProductoBonif(regalo.getIdProducto()); d.setCantidadBonif(new BigDecimal("2"));
        d.setCostoBonifTotal(new BigDecimal("999")); // Campo legado: ya no distribuye costo.
        controller.crear(r);
        assertThat(releer(regalo).getStock()).isEqualByComparingTo("7");
        assertThat(releer(regalo).getCpp()).isEqualByComparingTo("3.1234");
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("8.16");
        assertThat(compras.findAll().getFirst().getDetalles()).hasSize(2);
        assertThat(compras.findAll().getFirst().getTotal()).isEqualByComparingTo("81.60");
    }
    @Test void stockNegativoIniciaDesdeRecibidoSinDeuda() {
        principal.setStock(new BigDecimal("-5")); productos.save(principal);
        controller.crear(solicitud(false, "0", "0"));
        assertThat(releer(principal).getStock()).isEqualByComparingTo("10");
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("8");
    }
    @Test void stockNegativoGrandeNoSeArrastraComoDeuda() {
        principal.setStock(new BigDecimal("-100")); productos.save(principal);
        controller.crear(solicitud(false, "0", "0"));
        assertThat(releer(principal).getStock()).isEqualByComparingTo("10");
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("8");
    }
    @Test void regaloDistintoConStockNegativoIniciaDesdeRecibido() {
        Producto regalo = producto("Regalo", "-7", "3.1234");
        var r = solicitud(true, "1.60", "0"); var d = r.getDetalles().getFirst();
        d.setIdProductoBonif(regalo.getIdProducto()); d.setCantidadBonif(new BigDecimal("2"));
        controller.crear(r);
        assertThat(releer(regalo).getStock()).isEqualByComparingTo("2");
        assertThat(releer(regalo).getCpp()).isEqualByComparingTo("3.1234");
    }
    @Test void productoPrincipalRepetidoRechazadoSinEscrituras() {
        var r = solicitud(false, "0", "0");
        var otra = CalculoCompraTest.solicitud(false, "0", "0").getDetalles().getFirst();
        otra.setIdProducto(principal.getIdProducto());
        r.setDetalles(List.of(r.getDetalles().getFirst(), otra));
        assertThat(controller.crear(r).getStatusCode().value()).isEqualTo(400);
        assertThat(releer(principal).getStock()).isZero();
        assertThat(compras.count()).isZero(); assertThat(movimientos.count()).isZero();
    }
    @Test void productoBonificadoInexistenteRechazaTodaLaCompra() {
        var r = solicitud(false, "0", "0");
        r.getDetalles().getFirst().setIdProductoBonif(999999);
        r.getDetalles().getFirst().setCantidadBonif(BigDecimal.ONE);
        assertThat(controller.crear(r).getStatusCode().value()).isEqualTo(400);
        assertThat(compras.count()).isZero(); assertThat(movimientos.count()).isZero();
        assertThat(releer(principal).getStock()).isZero();
    }
    @ParameterizedTest @CsvSource({"true,2.00", "false,1.60"})
    void percepcionIncorrectaNoEscribe(boolean activa, String importe) {
        assertThat(controller.crear(solicitud(activa, importe, "0")).getStatusCode().value()).isEqualTo(400);
        assertThat(releer(principal).getStock()).isZero();
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("4");
        assertThat(compras.count()).isZero(); assertThat(movimientos.count()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from evento_log", Long.class)).isZero();
        assertThat(cuentas.findAll().getFirst().getSaldoActual()).isZero();
    }
    @Test void segundaLineaInexistenteNoModificaPrimera() {
        var r = solicitud(false, "0", "0");
        var otra = CalculoCompraTest.solicitud(false, "0", "0").getDetalles().getFirst();
        otra.setIdProducto(999999); r.setDetalles(List.of(r.getDetalles().getFirst(), otra));
        assertThat(controller.crear(r).getStatusCode().value()).isEqualTo(400);
        assertThat(releer(principal).getStock()).isZero();
        assertThat(compras.count()).isZero(); assertThat(movimientos.count()).isZero();
    }
    @Test void previsualizarNoEscribe() {
        assertThat(controller.calcular(solicitud(true, "9", "0")).getStatusCode().value()).isEqualTo(200);
        assertThat(compras.count()).isZero(); assertThat(movimientos.count()).isZero();
        assertThat(releer(principal).getStock()).isZero();
    }
    @Test void variasLineasPersistenPercepcionYCostosPrecisos() {
        Producto otro = producto("Otro", "0", "0");
        var r = solicitud(true, "0.01", "0");
        var a = r.getDetalles().getFirst(); a.setCantidad(BigDecimal.ONE);
        a.setCostoTotal(new BigDecimal("0.25")); a.setDescuentoPct(BigDecimal.ZERO);
        var b = new CompraRequest.DetalleItem(); b.setIdProducto(otro.getIdProducto());
        b.setCantidad(BigDecimal.ONE); b.setCostoTotal(new BigDecimal("0.25"));
        r.setDetalles(List.of(a, b));
        assertThat(controller.crear(r).getStatusCode().value()).isEqualTo(200);
        assertThat(releer(principal).getCpp()).isEqualByComparingTo("0.2550");
        assertThat(releer(otro).getCpp()).isEqualByComparingTo("0.2550");
        assertThat(compras.findAll().getFirst().getPercepcion()).isEqualByComparingTo("0.01");
        assertThat(movimientos.findAll().getFirst().getMonto()).isEqualByComparingTo("0.51");
    }
    @Test void contratoHttpPrevisualizacionYRechazo() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        String body = """
            {"idProveedor":%d,"aplicaPercepcion":true,"percepcion":2,
             "detalles":[{"idProducto":%d,"cantidad":10,"costoTotal":100,"descuentoPct":20}]}
            """.formatted(proveedor.getIdProveedor(), principal.getIdProducto());
        mvc.perform(post("/api/compras/calcular").contentType("application/json").content(body))
            .andExpect(status().isOk()).andExpect(jsonPath("percepcionCalculada").value(1.6))
            .andExpect(jsonPath("diferencia").value(0.4))
            .andExpect(jsonPath("lineas[0].costoUnitario").value(8.16));
        mvc.perform(post("/api/compras").contentType("application/json").content(body))
            .andExpect(status().isBadRequest());
        assertThat(compras.count()).isZero(); assertThat(movimientos.count()).isZero();
        assertThat(releer(principal).getStock()).isZero();
    }
}
