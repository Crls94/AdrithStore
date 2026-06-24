import axios from 'axios';

// ── Cambia esta IP por la de tu PC cuando uses red local ──────────────────────
// En desarrollo local:          http://localhost:8080/api
// Desde celular u otro equipo:  http://192.168.18.28:8080/api
const BASE_URL = 'http://192.168.18.28:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default api;