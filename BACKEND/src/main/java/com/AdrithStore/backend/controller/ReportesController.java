package com.AdrithStore.backend.controller;

import com.AdrithStore.backend.model.*;
import com.AdrithStore.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportesController {

    private final VentaRepository                ventaRepo;
    private final CompraRepository               compraRepo;
    private final CompraAjusteRepository          compraAjusteRepo;
    private final TransaccionFinancieraRepository txRepo;
    private final CierreDiarioRepository          cierreRepo;
    private final ProductoRepository              productoRepo;
    private final ClienteRepository               clienteRepo;
    private final ProveedorRepository             proveedorRepo;
    private final CuentaFinancieraRepository      cuentaRepo;
    private final UsuarioRepository               usuarioRepo;
    private final EventoLogRepository             eventoRepo;
    private final CategoriaRepository             categoriaRepo;

    // ── helpers ──────────────────────────────────────────────────────────────

    private LocalDateTime inicioDelDia(String fecha) {
        return fecha != null ? LocalDate.parse(fecha).atStartOfDay() : LocalDate.now().atStartOfDay();
    }

    private LocalDateTime finDelDia(String fecha) {
        return fecha != null ? LocalDate.parse(fecha).atTime(LocalTime.MAX) : LocalDateTime.now();
    }

    private Sort buildSort(String sort, String dir) {
        if (sort == null || sort.isBlank()) return Sort.by(Sort.Direction.DESC, "fecha");
        return Sort.by(Sort.Direction.fromString(dir != null ? dir : "desc"), sort);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> paginaAMapa(Page page, Map<String, Object> totales) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("content",        page.getContent());
        res.put("totalElements",  page.getTotalElements());
        res.put("totalPages",     page.getTotalPages());
        res.put("totales",        totales);
        return res;
    }

    private Map<String, Object> listaAMapa(List<?> content, Map<String, Object> totales) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("content", content);
        res.put("totales", totales);
        return res;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 1 — VENTAS
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    @GetMapping("/ventas")
    public Map<String, Object> ventas(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String sort,
            @RequestParam(required = false)    String dir,
            @RequestParam(required = false)    Integer idCliente,
            @RequestParam(required = false)    Integer idVendedor,
            @RequestParam(required = false)    String estado,
            @RequestParam(required = false)    Integer idUsuario,
            @RequestParam(required = false)    String rol) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        // Forzar idVendedor si el rol del usuario logueado es VENDEDOR
        if ("VENDEDOR".equals(rol) && idUsuario != null) {
            idVendedor = idUsuario;
        }

        Page<Venta> pagina = ventaRepo.buscarPaginado(d, h, idCliente, idVendedor, estado,
                PageRequest.of(page, size, buildSort(sort, dir)));

        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("subtotal", ventaRepo.sumSubtotal(d, h, idCliente, idVendedor, estado));
        totales.put("igv", ventaRepo.sumIgv(d, h, idCliente, idVendedor, estado));
        totales.put("descuentoGlobal", ventaRepo.sumDescuento(d, h, idCliente, idVendedor, estado));
        totales.put("total", ventaRepo.sumTotal(d, h, idCliente, idVendedor, estado));

        return paginaAMapa(pagina, totales);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 2 — COMPRAS
    // ═══════════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    @GetMapping("/compras")
    public Map<String, Object> compras(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String sort,
            @RequestParam(required = false)    String dir,
            @RequestParam(required = false)    Integer idProveedor,
            @RequestParam(required = false)    String estado) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        Page<Compra> pagina = compraRepo.buscarPaginado(d, h, idProveedor, estado,
                PageRequest.of(page, size, buildSort(sort, dir)));

        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("subtotal",        compraRepo.sumSubtotal(d, h, idProveedor, estado));
        totales.put("descuentoGlobal", compraRepo.sumDescuento(d, h, idProveedor, estado));
        totales.put("percepcion",      compraRepo.sumPercepcion(d, h, idProveedor, estado));
        totales.put("total",           compraRepo.sumTotal(d, h, idProveedor, estado));

        return paginaAMapa(pagina, totales);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 3 — AJUSTES DE COMPRA
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/ajustes-compra")
    public Map<String, Object> ajustesCompra(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String tipo) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        List<CompraAjuste> lista = compraAjusteRepo.buscarPorRango(d, h, tipo);
        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 4 — MOVIMIENTOS DE TESORERÍA
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/movimientos")
    public Map<String, Object> movimientos(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String sort,
            @RequestParam(required = false)    String dir,
            @RequestParam(required = false)    String tipoMov,
            @RequestParam(required = false)    Integer idCuenta) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        Page<TransaccionFinanciera> pagina = txRepo.buscarPaginado(d, h, tipoMov, idCuenta,
                PageRequest.of(page, size, buildSort(sort, dir)));

        BigDecimal totalMov = txRepo.sumTotales(d, h, tipoMov, idCuenta);
        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("totalMovimiento", totalMov);

        return paginaAMapa(pagina, totales);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 5 — CIERRES DE CAJA
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/cierres")
    public Map<String, Object> cierres(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Integer idCuenta) {

        LocalDate d = desde != null ? LocalDate.parse(desde) : LocalDate.now();
        LocalDate h = hasta != null ? LocalDate.parse(hasta) : LocalDate.now();

        List<CierreDiario> lista;
        if (idCuenta != null) {
            // Filtrar en memoria (bajo volumen: 1 cierre por cuenta por día)
            lista = cierreRepo.findByFechaCierreBetweenOrderByFechaCierreDesc(d, h)
                    .stream()
                    .filter(c -> c.getCuenta().getIdCuenta().equals(idCuenta))
                    .toList();
        } else {
            lista = cierreRepo.findByFechaCierreBetweenOrderByFechaCierreDesc(d, h);
        }

        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 6 — INVENTARIO / PRODUCTOS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/productos")
    public Map<String, Object> productos(
            @RequestParam(required = false) Integer idCategoria,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false, defaultValue = "false") boolean soloStockBajo) {

        List<Producto> lista;

        if (soloStockBajo) {
            lista = productoRepo.findStockBajo();
        } else if (idCategoria != null) {
            lista = productoRepo.findByCategoria_IdCategoria(idCategoria);
        } else if (tipo != null && !tipo.isBlank()) {
            lista = productoRepo.findByTipo(tipo);
        } else {
            lista = productoRepo.findAll();
        }

        // Aplicar filtros adicionales en memoria (categoría + tipo combinados)
        if (idCategoria != null && tipo != null && !tipo.isBlank() && !soloStockBajo) {
            lista = lista.stream()
                    .filter(p -> p.getCategoria() != null && p.getCategoria().getIdCategoria().equals(idCategoria))
                    .filter(p -> tipo.equals(p.getTipo()))
                    .toList();
        }

        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 7 — CLIENTES
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/clientes")
    public Map<String, Object> clientes(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        List<Object[]> raw = clienteRepo.resumenPorCliente(d, h);
        List<Map<String, Object>> lista = new ArrayList<>();

        for (Object[] row : raw) {
            Cliente c = (Cliente) row[0];
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idCliente",     c.getIdCliente());
            item.put("nombre",        c.getNombre());
            item.put("apellido",      c.getApellido());
            item.put("dni",           c.getDni());
            item.put("telefono",      c.getTelefono());
            item.put("numCompras",    row[1]);
            item.put("totalComprado", row[2]);
            item.put("ultimaCompra",  row[3]);
            lista.add(item);
        }

        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 8 — PROVEEDORES
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/proveedores")
    public Map<String, Object> proveedores(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        List<Object[]> raw = proveedorRepo.resumenPorProveedor(d, h);
        List<Map<String, Object>> lista = new ArrayList<>();

        for (Object[] row : raw) {
            Proveedor p = (Proveedor) row[0];
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idProveedor",      p.getIdProveedor());
            item.put("empresa",          p.getEmpresa());
            item.put("ruc",              p.getRuc());
            item.put("contacto",         p.getContacto());
            item.put("telefono",         p.getTelefono());
            item.put("email",            p.getEmail());
            item.put("emitePercepcion",  p.getEmitePercepcion());
            item.put("numCompras",       row[1]);
            item.put("totalComprado",    row[2]);
            item.put("ultimaCompra",     row[3]);
            lista.add(item);
        }

        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 9 — CUENTAS FINANCIERAS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/cuentas")
    public Map<String, Object> cuentas() {
        List<CuentaFinanciera> lista = cuentaRepo.findByActivaTrue();
        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 10 — USUARIOS (solo ADMIN)
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/usuarios")
    public Map<String, Object> usuarios(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {

        LocalDateTime d = inicioDelDia(desde);
        LocalDateTime h = finDelDia(hasta);

        List<Object[]> raw = usuarioRepo.resumenPorUsuario(d, h);
        List<Map<String, Object>> lista = new ArrayList<>();

        for (Object[] row : raw) {
            Usuario u = (Usuario) row[0];
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("idUsuario",       u.getIdUsuario());
            item.put("nombreCompleto",  u.getNombreCompleto());
            item.put("username",        u.getUsername());
            item.put("rol",             u.getRol());
            item.put("activo",          u.getActivo());
            item.put("fechaCreacion",   u.getFechaCreacion());
            item.put("numVentas",       row[1]);
            item.put("totalVendido",    row[2]);
            lista.add(item);
        }

        return listaAMapa(lista, Map.of());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TAB 11 — LOG DE EVENTOS
    // ═══════════════════════════════════════════════════════════════════════════

    @GetMapping("/eventos")
    public Map<String, Object> eventos(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false)    String sort,
            @RequestParam(required = false)    String dir,
            @RequestParam(required = false)    String tipoEvento,
            @RequestParam(required = false)    String entidad) {

        // Si no hay rango de fecha, solo top 100
        if (desde == null && hasta == null && tipoEvento == null && entidad == null) {
            List<EventoLog> top = eventoRepo.findTop100ByOrderByFechaDesc();
            return listaAMapa(top, Map.of());
        }

        LocalDateTime d = desde != null ? LocalDate.parse(desde).atStartOfDay() : null;
        LocalDateTime h = hasta != null ? LocalDate.parse(hasta).atTime(LocalTime.MAX) : null;

        Page<EventoLog> pagina = eventoRepo.buscarPaginado(d, h, tipoEvento, entidad,
                PageRequest.of(page, size, buildSort(sort, dir)));

        return paginaAMapa(pagina, Map.of());
    }
}
