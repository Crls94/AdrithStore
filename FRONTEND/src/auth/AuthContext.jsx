import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API = "http://192.168.18.28:8080/api";

export function AuthProvider({ children }) {
  const [usuario,  setUsuario]  = useState(null);
  const [cargando, setCargando] = useState(true);
  const [estado,   setEstado]   = useState(null);

  useEffect(() => {
    // Restaurar sesión guardada
    const sesion = localStorage.getItem("adrith_usuario");
    if (sesion) {
      try { setUsuario(JSON.parse(sesion)); } catch {}
    }
    verificarEstado();
  }, []);

  const verificarEstado = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/estado`);
      setEstado(data);
    } catch {
      setEstado({ hayUsuarios: false, configurado: false, nombreNegocio: "" });
    } finally {
      setCargando(false);
    }
  };

  const login = async (username, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { username, password });

    // Cargar datos completos del usuario (incluyendo dni, telefono)
    let datosCompletos = {
      idUsuario:      data.idUsuario,
      username:       data.username,
      rol:            data.rol,
      nombres:        data.nombres,
      apellidos:      data.apellidos,
      nombreCompleto: data.nombreCompleto,
    };

    // Intentar cargar perfil completo con todos los campos
    try {
      const perfil = await axios.get(`${API}/usuarios/${data.idUsuario}`);
      datosCompletos = {
        ...datosCompletos,
        dni:      perfil.data.dni      || "",
        telefono: perfil.data.telefono || "",
      };
    } catch {}

    setUsuario(datosCompletos);
    localStorage.setItem("adrith_usuario", JSON.stringify(datosCompletos));

    // Actualizar estado del sistema
    await verificarEstado();

    return data; // incluye data.configurado
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem("adrith_usuario");
    setEstado(prev => prev); // mantener estado del sistema
  };

  const registrarPrimerAdmin = async (datos) => {
    await axios.post(`${API}/auth/primer-admin`, datos);
    await verificarEstado();
  };

  // Recargar datos del perfil del usuario actual desde la BD
  const recargarPerfil = async () => {
    if (!usuario?.idUsuario) return;
    try {
      const { data } = await axios.get(`${API}/usuarios/${usuario.idUsuario}`);
      const actualizado = {
        ...usuario,
        nombres:   data.nombres   || usuario.nombres,
        apellidos: data.apellidos || usuario.apellidos,
        dni:       data.dni       || "",
        telefono:  data.telefono  || "",
      };
      setUsuario(actualizado);
      localStorage.setItem("adrith_usuario", JSON.stringify(actualizado));
    } catch {}
  };

  const esAdmin    = () => usuario?.rol === "ADMIN";
  const esVendedor = () => usuario?.rol === "VENDEDOR";

  return (
    <AuthContext.Provider value={{
      usuario, cargando, estado,
      login, logout, registrarPrimerAdmin,
      esAdmin, esVendedor,
      recargarEstado: verificarEstado,
      recargarPerfil,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);