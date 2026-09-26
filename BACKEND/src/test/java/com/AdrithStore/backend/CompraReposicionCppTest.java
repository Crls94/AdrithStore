package com.AdrithStore.backend;

import com.AdrithStore.backend.controller.CompraController;
import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// Issue #8: política de reposición desde stock cero/negativo y reemplazo de CPP.
// no usa BD; verifica reglas de negocio puras a través del controlador.
class CompraReposicionCppTest {
    ProductoRepository productos = mock(ProductoRepository.class);
    CompraRepository compras = mock(CompraRepository.class);
    ProveedorRepository proveedores = mock(ProveedorRepository.class);
    CompraAjusteRepository ajustes = mock(CompraAjusteRepository.class);
    LogService logService = mock(LogService.class);
    TesoreriaService tesoreria = mock(TesoreriaService.class);
    CompraController controller;

    @BeforeEach void preparar() {
        reset(productos, compras, proveedores, ajustes, logService, tesoreria);
        controller = new CompraController(compras, proveedores, productos, ajustes, logService, tesoreria);
        when(proveedores.findById(1)).thenReturn(Optional.of(new Proveedor()));
        when(compras.save(any(Compra.class))).thenAnswer(i -> i.getArgument(0));
    }

    Producto producto(int id, String stock, String cpp) {
        Producto p = new Producto();
        p.setIdProducto(id); p.setNombre("Producto " + id);
        p.setStock(new BigDecimal(stock)); p.setCpp(new BigDecimal(cpp));
        p.setPrecioVenta(new BigDecimal("15")); p.setUnidadMedida("UNIDAD");
        when(productos.findById(id)).thenReturn(Optional.of(p));
        return p;
    }

    CompraRequest compra(String cantidad, String costoU, String descuento) {
        return compra(cantidad, costoU, descuento, false, "0", "0");
    }

    CompraRequest compra(String cantidad, String costoU, String descuento,
                         boolean activa, String percepcion, String global) {
        CompraRequest r = new CompraRequest();
        r.setIdProveedor(1);
        r.setAplicaPercepcion(activa);
        r.setPercepcion(new BigDecimal(percepcion));
        r.setDescuentoGlobal(new BigDecimal(global));
        r.setMedioPago("Efectivo");
        var d = new CompraRequest.DetalleItem();
        d.setIdProducto(1); d.setCantidad(new BigDecimal(cantidad));
        d.setCostoUnitario(new BigDecimal(costoU)); d.setDescuentoPct(new BigDecimal(descuento));
        r.setDetalles(List.of(d));
        return r;
    }

    @Test void stockPositivoPromediaCppConInventarioAnterior() {
        Producto p = producto(1, "5", "4");
        var respuesta = controller.crear(compra("10", "10", "0"));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("15");
        assertThat(p.getCpp()).isEqualByComparingTo("8");
    }

    @Test void stockCeroIniciaDesdeElLoteNuevo() {
        Producto p = producto(1, "0", "4");
        var respuesta = controller.crear(compra("10", "10", "0"));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("10");
        assertThat(p.getCpp()).isEqualByComparingTo("10");
    }

    @Test void stockNegativoPequenoIniciaDesdeElLoteNuevoNoDesdeDeuda() {
        // -5 + 10 = 10 (no 5): el negativo no se arrastra como deuda física.
        Producto p = producto(1, "-5", "4");
        var respuesta = controller.crear(compra("10", "10", "0"));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("10");
        assertThat(p.getCpp()).isEqualByComparingTo("10");
        verify(logService).log(eq(LogService.STOCK_AJUSTADO), eq("PRODUCTO"), eq(1),
            contains("stock previo negativo"), isNull());
    }

    @Test void stockNegativoGrandeIniciaDesdeElLoteNuevoNoDesdeDeuda() {
        // -100 + 30 = 30 (no -70).
        Producto p = producto(1, "-100", "4");
        var respuesta = controller.crear(compra("30", "10", "0"));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("30");
        assertThat(p.getCpp()).isEqualByComparingTo("10");
        verify(logService).log(eq(LogService.STOCK_AJUSTADO), eq("PRODUCTO"), eq(1),
            contains("CPP histórico 4 reemplazado"), isNull());
    }

    @Test void stockNegativoConDescuentoDeLineaUsaCostoEfectivoDelLote() {
        Producto p = producto(1, "-5", "4");
        var respuesta = controller.crear(compra("10", "10", "20"));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("10");
        assertThat(p.getCpp()).isEqualByComparingTo("8");
    }

    @Test void stockNegativoConPercepcionUsaCostoEfectivoConPercepcion() {
        Producto p = producto(1, "-5", "4");
        var respuesta = controller.crear(compra("10", "10", "0", true, "2.00", "0"));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("10");
        assertThat(p.getCpp()).isEqualByComparingTo("10.20");
    }

    @Test void stockNegativoBonificacionMismoProductoUsaCantidadTotalDiluida() {
        Producto p = producto(1, "-5", "4");
        var r = compra("10", "10", "0");
        r.getDetalles().getFirst().setUnidadesBonificacion(new BigDecimal("2"));
        var respuesta = controller.crear(r);
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(p.getStock()).isEqualByComparingTo("12");
        assertThat(p.getCpp()).isEqualByComparingTo("8.3333");
    }

    @Test void stockNegativoBonificacionDistintoIniciaDesdeRecibidoYConservaCpp() {
        Producto principal = producto(1, "-5", "4");
        Producto regalo = producto(2, "-7", "3.5");
        var r = compra("10", "10", "0");
        var d = r.getDetalles().getFirst();
        d.setIdProductoBonif(2); d.setCantidadBonif(new BigDecimal("2"));
        var respuesta = controller.crear(r);
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(regalo.getStock()).isEqualByComparingTo("2");
        assertThat(regalo.getCpp()).isEqualByComparingTo("3.5");
        assertThat(principal.getStock()).isEqualByComparingTo("10");
        assertThat(principal.getCpp()).isEqualByComparingTo("10");
        verify(logService).log(eq(LogService.STOCK_AJUSTADO), eq("PRODUCTO"), eq(2),
            contains("stock previo negativo"), isNull());
        Compra compra = (Compra) respuesta.getBody();
        assertThat(compra.getDetalles()).hasSize(2);
        assertThat(compra.getDetalles().getFirst().getProducto()).isEqualTo(regalo);
        assertThat(compra.getDetalles().getFirst().getSubtotal()).isEqualByComparingTo("0");
    }

    @Test void stockPositivoEnBonificacionDistintoConservaCppYSumaStock() {
        Producto principal = producto(1, "5", "4");
        Producto regalo = producto(2, "5", "3.5");
        var r = compra("10", "10", "0");
        var d = r.getDetalles().getFirst();
        d.setIdProductoBonif(2); d.setCantidadBonif(new BigDecimal("2"));
        var respuesta = controller.crear(r);
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(regalo.getStock()).isEqualByComparingTo("7");
        assertThat(regalo.getCpp()).isEqualByComparingTo("3.5");
        assertThat(principal.getStock()).isEqualByComparingTo("15");
        assertThat(principal.getCpp()).isEqualByComparingTo("8");
    }
}