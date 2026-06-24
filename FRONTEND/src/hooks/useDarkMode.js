import { useState, useEffect } from "react";

// Hook que gestiona el modo oscuro aplicando/quitando class="dark" en <html>
// Persiste la preferencia en localStorage
export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    // Leer preferencia guardada, o usar preferencia del sistema como fallback
    const saved = localStorage.getItem("adrith_dark");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("adrith_dark", String(dark));
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return { dark, toggle };
}