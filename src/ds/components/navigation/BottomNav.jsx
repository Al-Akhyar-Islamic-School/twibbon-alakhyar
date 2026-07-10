'use client';
import React from 'react';

/**
 * Bottom tab bar for the Dinar app. Center item can be emphasized.
 */
export function BottomNav({ items = [], activeId = null, onSelect = null, style = {}, ...rest }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)',
      padding: '8px 6px 10px', fontFamily: 'var(--font-sans)', ...style,
    }} {...rest}>
      {items.map((it) => {
        const active = it.id === activeId;
        if (it.emphasized) {
          return (
            <button key={it.id} onClick={() => onSelect && onSelect(it.id)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 0,
            }}>
              <span style={{
                width: 46, height: 46, marginTop: -22, borderRadius: '50%',
                background: 'var(--brand)', color: '#fff', boxShadow: 'var(--shadow-brand)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              }}>{it.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--brand)' : 'var(--text-muted)' }}>{it.label}</span>
            </button>
          );
        }
        return (
          <button key={it.id} onClick={() => onSelect && onSelect(it.id)} style={{
            border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '2px 4px',
            color: active ? 'var(--brand)' : 'var(--text-muted)',
          }}>
            <span style={{ fontSize: 19, lineHeight: 1 }}>{it.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}