import { useState, useEffect } from "react";



export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    
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