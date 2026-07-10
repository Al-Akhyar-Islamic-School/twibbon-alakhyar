'use client';
import React from 'react';

/**
 * Colored feature-screen header used across the Dinar app.
 * Back button + title/subtitle on the left, school logo on the right,
 * rounded bottom corners. Header color follows the feature.
 */
export function AppHeader({ title, subtitle = null, tone = 'brand', onBack = null, logo = null, style = {}, ...rest }) {
  const tones = {
    brand:   'var(--feature-header-blue)',
    sky:     'var(--feature-header-sky)',
    red:     'var(--feature-header-red)',
    magenta: 'var(--feature-header-magenta)',
  };
  return (
    <div style={{
      background: tones[tone] || tones.brand, color: '#fff',
      padding: '16px 18px 20px',
      borderBottomLeftRadius: 'var(--radius-xl)', borderBottomRightRadius: 'var(--radius-xl)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      fontFamily: 'var(--font-sans)', ...style,
    }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {onBack !== null && (
          <button onClick={onBack} aria-label="Kembali" style={{
            border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff',
            width: 30, height: 30, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
          }}>‹</button>
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {logo && <div style={{ flexShrink: 0, opacity: 0.95 }}>{logo}</div>}
    </div>
  );
}