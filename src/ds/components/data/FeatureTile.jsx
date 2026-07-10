'use client';
import React from 'react';
import { Badge } from '../feedback/Badge.jsx';

/**
 * Feature tile from the "Fitur Dinar App" grid: rounded icon plate,
 * label beneath, optional corner badge ("Baru" / "Segera").
 */
export function FeatureTile({ label, icon = null, tone = 'brand', badge = null, badgeTone = 'magenta', onClick = null, style = {}, ...rest }) {
  const plates = {
    brand:   'var(--color-primary-50)',
    sky:     'var(--color-sky-100)',
    magenta: 'var(--color-magenta-100)',
    green:   'var(--color-green-100)',
    amber:   'var(--color-amber-100)',
    red:     'var(--color-coral-100)',
  };
  const inks = {
    brand:   'var(--brand)',
    sky:     'var(--color-sky-600)',
    magenta: 'var(--color-magenta-600)',
    green:   'var(--color-green-600)',
    amber:   '#8a6410',
    red:     'var(--color-coral-600)',
  };
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
        border: 'none', background: 'transparent', cursor: onClick ? 'pointer' : 'default',
        padding: '4px 2px', width: '100%', fontFamily: 'var(--font-sans)', ...style,
      }}
      {...rest}
    >
      {badge && (
        <span style={{ position: 'absolute', top: -4, right: 'calc(50% - 34px)', zIndex: 2 }}>
          <Badge tone={badgeTone} variant="solid" size="xs">{badge}</Badge>
        </span>
      )}
      <span style={{
        width: 52, height: 52, borderRadius: 'var(--radius-md)',
        background: plates[tone] || plates.brand, color: inks[tone] || inks.brand,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 700,
      }}>{icon}</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-body)', textAlign: 'center', lineHeight: 1.25 }}>{label}</span>
    </button>
  );
}