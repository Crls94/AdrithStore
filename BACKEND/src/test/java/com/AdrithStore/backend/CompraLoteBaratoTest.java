package com.AdrithStore.backend;

import com.AdrithStore.backend.controller.CompraController;
import com.AdrithStore.backend.dto.CompraRequest;
import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import com.AdrithStore.backend.service.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CompraLoteBaratoTest {
    @ParameterizedTest
    @CsvSource({"10,2,0,false,0,0,6", "30,2,0,false,0,0,4",
        "10,0.10,0,false,0,0,5.05", "10,2,0,true,0.40,0,6.02",
        "10,2,0,false,0,5,6", "10,2,50,false,0,0,5.50"})
    void loteBaratoReduceCppPonderado(String cantidad, String costo, String descuento,
                                    boolean percepcion, String importe, String global, String esperado) {
        var productos = mock(ProductoRepository.class);
        var proveedores = mock(ProveedorRepository.class);
        var compras = mock(CompraRepository.class);
        var controller = new CompraController(compras, proveedores, productos,
                mock(CompraAjusteRepository.class), mock(LogService.class), mock(TesoreriaService.class));
        Producto producto = new Producto();
        producto.setStock(new BigDecimal("10"));
        producto.setCpp(new BigDecimal("10"));
        producto.setPrecioVenta(new BigDecimal("15"));
        when(productos.findById(1)).thenReturn(Optional.of(producto));
        when(proveedores.findById(1)).thenReturn(Optional.of(new Proveedor()));
        when(compras.save(any(Compra.class))).thenAnswer(i -> i.getArgument(0));
        CompraRequest req = new CompraRequest();
        req.setIdProveedor(1);
        req.setAplicaPercepcion(percepcion);
        req.setPercepcion(new BigDecimal(importe));
        req.setDescuentoGlobal(new BigDecimal(global));
        var linea = new CompraRequest.DetalleItem();
        linea.setIdProducto(1);
        linea.setCantidad(new BigDecimal(cantidad));
        linea.setCostoUnitario(new BigDecimal(costo));
        linea.setDescuentoPct(new BigDecimal(descuento));
        req.setDetalles(List.of(linea));

        var respuesta = controller.crear(req);

        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(producto.getCpp()).isEqualByComparingTo(esperado);
        assertThat(producto.getStock()).isEqualByComparingTo(new BigDecimal("10").add(new BigDecimal(cantidad)));
        assertThat(producto.getPrecioVenta()).isEqualByComparingTo("15");
        var compra = (Compra) respuesta.getBody();
        assertThat(compra.getDetalles().getFirst().getCostoAnterior()).isEqualByComparingTo("10");
        verify(productos).save(producto);
    }
}
