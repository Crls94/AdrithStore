package com.AdrithStore.backend.service;

import com.AdrithStore.backend.model.EventoLog;
import com.AdrithStore.backend.repository.EventoLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LogService {

    public static final String VENTA_CREADA     = "VENTA_CREADA";
    public static final String VENTA_ANULADA    = "VENTA_ANULADA";
    public static final String COMPRA_CREADA    = "COMPRA_CREADA";
    public static final String COMPRA_ANULADA   = "COMPRA_ANULADA";
    public static final String COMPRA_AJUSTE    = "COMPRA_AJUSTE";   // ← faltaba
    public static final String STOCK_AJUSTADO   = "STOCK_AJUSTADO";
    public static final String STOCK_NEGATIVO   = "STOCK_NEGATIVO";
    public static final String PRODUCTO_CREADO  = "PRODUCTO_CREADO";
    public static final String GASTO_REGISTRADO = "GASTO_REGISTRADO";

    private final EventoLogRepository logRepo;

    public void log(String tipoEvento, String entidad, Integer idEntidad,
                    String descripcion, String datosJson) {
        try {
            EventoLog ev = new EventoLog();
            ev.setTipoEvento(tipoEvento);
            ev.setEntidad(entidad);
            ev.setIdEntidad(idEntidad);
            ev.setDescripcion(descripcion);
            ev.setDatosJson(datosJson);
            logRepo.save(ev);
        } catch (Exception e) {
            System.err.println("[LogService] Error al guardar log: " + e.getMessage());
        }
    }
}