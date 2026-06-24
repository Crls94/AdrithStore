// theme.js — Paleta unificada AdrithStore
// Desde el Lote 4 los valores apuntan a CSS variables definidas en index.css
// Eso permite que dark mode cambie todos los colores automáticamente
// sin modificar cada página individualmente

export const T = {
  // Fondos
  bgPage:     "var(--c-bg)",
  bgCard:     "var(--c-bg-card)",
  bgMuted:    "var(--c-bg-muted)",
  bgInput:    "var(--c-bg-input)",
  bgHeader:   "var(--c-bg-header)",
  bgCardHover:"var(--c-bg-muted)",

  // Texto
  textPrimary:"var(--c-text)",
  textSecond: "var(--c-text-sec)",
  textMuted:  "var(--c-text-muted)",

  // Bordes y sombras
  border:     "var(--c-border)",
  shadow:     "var(--c-shadow)",
  shadowHover:"var(--c-shadow-h)",
  shadowModal:"var(--c-shadow-modal)",

  // Acento (naranja → en pages internas era "gold")
  gold:       "var(--c-gold)",
  goldLight:  "var(--c-gold)",
  goldDark:   "#0D5E4F",        // hover del botón principal → verde
  goldBg:     "var(--c-gold-bg)",
  goldBorder: "var(--c-gold-border)",

  // Border radius
  radius:     "10px",
  radiusLg:   "14px",
};

// Estilos reutilizables — los componentes los importan directamente
export const inputStyle = {
  width: "100%",
  padding: "9px 13px",
  border: "1.5px solid var(--c-border)",
  borderRadius: "10px",
  fontSize: "13px",
  outline: "none",
  background: "var(--c-bg-input)",
  color: "var(--c-text)",
  fontFamily: "'Inter','DM Sans','Segoe UI',system-ui,sans-serif",
  boxSizing: "border-box",
};

export const labelStyle = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: "var(--c-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  marginBottom: "5px",
};

export const btnPrimary = {
  padding: "9px 20px",
  borderRadius: "10px",
  border: "none",
  background: "linear-gradient(135deg, #E07A2F, #c96010)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "7px",
  fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
  transition: "opacity 0.15s",
};

export const cardStyle = {
  background: "var(--c-bg-card)",
  borderRadius: "14px",
  border: "1px solid var(--c-border)",
  boxShadow: "var(--c-shadow)",
};