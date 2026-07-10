'use client';
import React from 'react';

/**
 * Section header row: bold title on the left, optional "Lihat semua →" action.
 * Matches the "Fitur Dinar App" / "Jadwal Sholat" section headers.
 */
export function SectionHeader({ title, icon = null, actionLabel = null, onAction = null, style = {}, ...rest }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, ...style }} {...rest}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ display: 'inline-flex', color: 'var(--brand)' }}>{icon}</span>}
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--text-heading)' }}>{title}</span>
      </div>
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
            color: 'var(--text-link)', display: 'inline-flex', alignItems: 'center', gap: 3, padding: 0,
          }}
        >
          {actionLabel} <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}