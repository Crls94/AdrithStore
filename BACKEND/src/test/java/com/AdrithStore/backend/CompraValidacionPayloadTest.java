package com.AdrithStore.backend;

import com.AdrithStore.backend.controller.CompraController;
import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// Issue #9: el backend valida el payload por sí mismo y rechaza toda la compra
// ante cualquier línea inválida, sin depender del frontend.
class CompraValidacionPayloadTest {
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

    Producto producto(int id, String unidad) {
        Producto p = new Producto();
        p.setIdProducto(id); p.setNombre("Producto " + id);
        p.setStock(new BigDecimal("0")); p.setCpp(new BigDecimal("4"));
        p.setPrecioVenta(new BigDecimal("15")); p.setUnidadMedida(unidad);
        when(productos.findById(id)).thenReturn(Optional.of(p));
        return p;
    }

    CompraRequest.DetalleItem linea(Integer id, String cantidad, String costoU, String descuento) {
        var d = new CompraRequest.DetalleItem();
        d.setIdProducto(id); d.setCantidad(new BigDecimal(cantidad));
        d.setCostoUnitario(new BigDecimal(costoU)); d.setDescuentoPct(new BigDecimal(descuento));
        return d;
    }

    CompraRequest compra(CompraRequest.DetalleItem... lineas) {
        CompraRequest r = new CompraRequest();
        r.setIdProveedor(1);
        r.setAplicaPercepcion(false); r.setPercepcion(BigDecimal.ZERO);
        r.setDescuentoGlobal(BigDecimal.ZERO); r.setMedioPago("Efectivo");
        r.setDetalles(List.of(lineas));
        return r;
    }

    private void sinEscrituras() {
        verify(productos, never()).save(any());
        verify(compras, never()).save(any());
        verify(tesoreria, never()).registrar(anyString(), anyString(),
            any(BigDecimal.class), anyInt(), anyString(), any(), any(), anyString());
    }

    @Test void compraValidaConProductosDistintosSeRegistraNormal() {
        producto(1, "UNIDAD"); producto(2, "UNIDAD");
        var respuesta = controller.crear(compra(
            linea(1, "10", "10", "0"), linea(2, "5", "20", "0")));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        verify(compras).save(any(Compra.class));
    }

    @ParameterizedTest @CsvSource({"2", "3"})
    void productoPrincipalRepetidoRechazaTodaLaCompra(int veces) {
        producto(1, "UNIDAD");
        var lineas = new java.util.ArrayList<CompraRequest.DetalleItem>();
        for (int i = 0; i < veces; i++) lineas.add(linea(1, "1", "10", "0"));
        var respuesta = controller.crear(compra(lineas.toArray(new CompraRequest.DetalleItem[0])));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        assertThat(respuesta.getBody().toString()).contains("repetido");
        sinEscrituras();
    }

    @Test void productoPrincipalInexistenteRechazaTodaLaCompra() {
        producto(1, "UNIDAD");
        var respuesta = controller.crear(compra(linea(1, "1", "10", "0"), linea(999, "1", "10", "0")));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        assertThat(respuesta.getBody().toString()).contains("Producto no encontrado");
        sinEscrituras();
    }

    @Test void productoBonificadoInexistenteRechazaTodaLaCompra() {
        producto(1, "UNIDAD");
        var d = linea(1, "1", "10", "0");
        d.setIdProductoBonif(999); d.setCantidadBonif(BigDecimal.ONE);
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
    }

    @ParameterizedTest @CsvSource({"0", "-5"})
    void cantidadCeroONegativaRechaza(String cantidad) {
        producto(1, "UNIDAD");
        var respuesta = controller.crear(compra(linea(1, cantidad, "10", "0")));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
    }

    @Test void unidadUNIDADConFraccionEsRechazada() {
        producto(1, "UNIDAD");
        var respuesta = controller.crear(compra(linea(1, "2.5", "10", "0")));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
    }

    @Test void kilogramoRespetaPrecisionPermitida() {
        producto(3, "KG");
        var exceso = controller.crear(compra(linea(3, "1.2345", "10", "0")));
        assertThat(exceso.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
        var valido = controller.crear(compra(linea(3, "1.234", "10", "0")));
        assertThat(valido.getStatusCode().value()).isEqualTo(200);
    }

    @ParameterizedTest @CsvSource({"0", "-5"})
    void costoCeroONegativoRechaza(String costo) {
        producto(1, "UNIDAD");
        var d = linea(1, "10", "10", "0");
        d.setCostoUnitario(new BigDecimal(costo));
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
    }

    @ParameterizedTest @CsvSource({"-1,400", "101,400", "0,200", "100,200"})
    void descuentoDebeEstarEntreCeroY100(String descuento, String estado) {
        producto(1, "UNIDAD");
        var respuesta = controller.crear(compra(linea(1, "10", "10", descuento)));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(Integer.parseInt(estado));
        if ("400".equals(estado)) sinEscrituras();
    }

    @Test void bonificacionMismaNegativaEsRechazada() {
        producto(1, "UNIDAD");
        var d = linea(1, "10", "10", "0");
        d.setUnidadesBonificacion(new BigDecimal("-1"));
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
    }

    @Test void bonificacionDistintaSinCantidadValidaEsRechazada() {
        producto(1, "UNIDAD"); producto(2, "UNIDAD");
        var d = linea(1, "10", "10", "0");
        d.setIdProductoBonif(2); d.setCantidadBonif(BigDecimal.ZERO);
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        sinEscrituras();
    }

    @Test void cantidadBonificadaDistintaSinProductoEsRechazada() {
        producto(1, "UNIDAD");
        var d = linea(1, "10", "10", "0");
        d.setCantidadBonif(new BigDecimal("5"));
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        assertThat(respuesta.getBody().toString()).contains("Selecciona el producto regalado");
        sinEscrituras();
    }

    @Test void idProductoBonifIgualAlPrincipalEsRechazado() {
        producto(1, "UNIDAD");
        var d = linea(1, "10", "10", "0");
        d.setIdProductoBonif(1); d.setCantidadBonif(BigDecimal.ONE);
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(400);
        assertThat(respuesta.getBody().toString()).contains("unidades de bonificación");
        sinEscrituras();
    }

    @Test void payloadLegadoCostoBonifTotalNoCreaValorArtificialEnCpp() {
        Producto principal = producto(1, "UNIDAD");
        Producto regalo = producto(2, "UNIDAD");
        var d = linea(1, "10", "10", "0");
        d.setIdProductoBonif(2); d.setCantidadBonif(new BigDecimal("2"));
        d.setCostoBonifTotal(new BigDecimal("999"));
        var respuesta = controller.crear(compra(d));
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(regalo.getStock()).isEqualByComparingTo("2");
        assertThat(regalo.getCpp()).isEqualByComparingTo("4");
        assertThat(principal.getCpp()).isEqualByComparingTo("10");
        Compra compra = (Compra) respuesta.getBody();
        assertThat(compra.getTotal()).isEqualByComparingTo("100");
        assertThat(compra.getDetalles().getFirst().getSubtotal()).isEqualByComparingTo("0");
    }

    @Test void regresionPercepcionDescuentoGlobalYBonificaciones() {
        Producto principal = producto(1, "UNIDAD");
        var r = compra(linea(1, "10", "10", "20"));
        r.setAplicaPercepcion(true); r.setPercepcion(new BigDecimal("1.60"));
        r.setDescuentoGlobal(new BigDecimal("5"));
        r.getDetalles().getFirst().setUnidadesBonificacion(new BigDecimal("2"));
        var respuesta = controller.crear(r);
        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(principal.getStock()).isEqualByComparingTo("12");
        assertThat(principal.getCpp()).isEqualByComparingTo("6.80");
        Compra compra = (Compra) respuesta.getBody();
        assertThat(compra.getSubtotal()).isEqualByComparingTo("80");
        assertThat(compra.getTotal()).isEqualByComparingTo("76.60");
    }
}