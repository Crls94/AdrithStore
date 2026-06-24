// src/api/productosApi.js
// Centraliza todas las llamadas al backend para Productos y Categorías
import api from './axiosConfig';

// ── PRODUCTOS ──────────────────────────────────────────
export const getProductos      = ()        => api.get('/productos');
export const buscarProductos   = (nombre)  => api.get(`/productos/buscar?nombre=${encodeURIComponent(nombre)}`);
export const getProducto       = (id)      => api.get(`/productos/${id}`);
export const getStockBajo      = ()        => api.get('/productos/stock-bajo');
export const crearProducto     = (data)    => api.post('/productos', data);
export const actualizarProducto = (id, data) => api.put(`/productos/${id}`, data);
export const eliminarProducto  = (id)      => api.delete(`/productos/${id}`);

// ── CATEGORÍAS ─────────────────────────────────────────
export const getCategorias     = ()        => api.get('/categorias');
export const crearCategoria    = (data)    => api.post('/categorias', data);
export const actualizarCategoria = (id, data) => api.put(`/categorias/${id}`, data);
export const eliminarCategoria = (id)      => api.delete(`/categorias/${id}`);