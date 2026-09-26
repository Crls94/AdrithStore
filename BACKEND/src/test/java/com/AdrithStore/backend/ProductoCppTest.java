package com.AdrithStore.backend;

import com.AdrithStore.backend.controller.ProductoController;
import com.AdrithStore.backend.model.Producto;
import com.AdrithStore.backend.repository.CategoriaRepository;
import com.AdrithStore.backend.repository.ProductoRepository;
import com.AdrithStore.backend.service.LogService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import java.math.BigDecimal;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ProductoCppTest {
    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"0", "-2", "0.10", "5"})
    void costoPositivoReemplazaCppAnterior(String anterior) {
        ProductoRepository repo = mock(ProductoRepository.class);
        ProductoController controller = new ProductoController(repo,
                mock(CategoriaRepository.class), mock(LogService.class));
        Producto existente = new Producto();
        existente.setCpp(anterior == null ? null : new BigDecimal(anterior));
        when(repo.findById(1)).thenReturn(Optional.of(existente));
        when(repo.save(existente)).thenReturn(existente);
        Producto entrada = new Producto();
        entrada.setNombre("Producto corregido");
        entrada.setTipo("BIEN_FISICO");
        entrada.setCpp(new BigDecimal("8.00"));
        entrada.setPrecioVenta(new BigDecimal("10"));

        var respuesta = controller.actualizar(1, entrada);

        assertThat(respuesta.getStatusCode().value()).isEqualTo(200);
        assertThat(((Producto) respuesta.getBody()).getCpp()).isEqualByComparingTo("8.00");
        assertThat(existente.getCpp()).isEqualByComparingTo("8.00");
        verify(repo).save(existente);
    }
}
