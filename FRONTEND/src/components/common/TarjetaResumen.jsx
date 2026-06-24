import { T } from '../../theme';

export default function TarjetaResumen({ titulo, valor, icono, variante, sub, tendencia }) {
  const variantes = {
    gold:    { icon: T.gold,     bg: T.goldBg,      border: T.gold     },
    success: { icon: '#0d8c6e',  bg: '#0d8c6e12',   border: '#0d8c6e'  },
    danger:  { icon: '#d64545',  bg: '#d6454512',   border: '#d64545'  },
    info:    { icon: '#1a7aad',  bg: '#1a7aad12',   border: '#1a7aad'  },
    muted:   { icon: T.textSecond, bg: T.bgMuted,   border: T.border   },
  };
  const v = variantes[variante] ?? variantes.gold;

  return (
    <div style={{
      background: T.bgCard, borderRadius: T.radiusLg,
      border: `1px solid ${T.border}`, boxShadow: T.shadow,
      overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = T.shadowHover;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = T.shadow;
      }}
    >
      <div style={{ height: '3px', background: v.border }} />
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: T.textMuted, fontSize: '11px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px' }}>
              {titulo}
            </p>
            <h3 style={{ fontSize: '26px', fontWeight: 800, color: T.textPrimary, margin: '0 0 4px' }}>
              {valor}
            </h3>
            {sub && <small style={{ color: T.textMuted, fontSize: '12px' }}>{sub}</small>}
            {tendencia !== undefined && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600,
                  color: tendencia >= 0 ? '#0d8c6e' : '#d64545' }}>
                  <i className={`bi ${tendencia >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} />
                  {' '}{Math.abs(tendencia)}% vs ayer
                </span>
              </div>
            )}
          </div>
          <div style={{
            width: '46px', height: '46px', borderRadius: T.radiusMd,
            background: v.bg, border: `1px solid ${v.border}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <i className={`bi ${icono}`} style={{ fontSize: '20px', color: v.icon }} />
          </div>
        </div>
      </div>
    </div>
  );
}