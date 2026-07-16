import api from './axiosConfig';

export const getReporteVentas    = (params) => api.get('/reportes/ventas', { params });
export const getReporteCompras   = (params) => api.get('/reportes/compras', { params });
export const getAjustesCompra    = (params) => api.get('/reportes/ajustes-compra', { params });
export const getMovimientos      = (params) => api.get('/reportes/movimientos', { params });
export const getCierres          = (params) => api.get('/reportes/cierres', { params });
export const getReporteProductos = (params) => api.get('/reportes/productos', { params });
export const getReporteClientes  = (params) => api.get('/reportes/clientes', { params });
export const getReporteProveedores = (params) => api.get('/reportes/proveedores', { params });
export const getReporteCuentas   = ()      => api.get('/reportes/cuentas');
export const getReporteUsuarios  = (params) => api.get('/reportes/usuarios', { params });
export const getReporteEventos   = (params) => api.get('/reportes/eventos', { params });
