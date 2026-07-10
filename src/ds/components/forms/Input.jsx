'use client';
import React from 'react';

/**
 * Text input / field used in Dinar forms (login, search, data entry).
 */
export function Input({
  label = null,
  hint = null,
  error = null,
  leadingIcon = null,
  size = 'md',
  style = {},
  id,
  ...rest
}) {
  const pad = size === 'lg' ? '13px 14px' : '11px 13px';
  const fieldId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label htmlFor={fieldId} style={{ display: 'block', fontFamily: 'var(--font-sans)' }}>
      {label && (
        <span style={{
          display: 'block', fontSize: 13, fontWeight: 600,
          color: 'var(--text-heading)', marginBottom: 6,
        }}>{label}</span>
      )}
      <span style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface-card)',
        border: `1px solid ${error ? 'var(--state-danger)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        padding: pad,
        transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      }}>
        {leadingIcon && <span style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>{leadingIcon}</span>}
        <input
          id={fieldId}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-heading)',
            minWidth: 0, ...style,
          }}
          onFocus={(e) => { const w = e.currentTarget.parentElement; w.style.borderColor = 'var(--brand)'; w.style.boxShadow = 'var(--ring-brand)'; }}
          onBlur={(e) => { const w = e.currentTarget.parentElement; w.style.borderColor = error ? 'var(--state-danger)' : 'var(--border-subtle)'; w.style.boxShadow = 'none'; }}
          {...rest}
        />
      </span>
      {(error || hint) && (
        <span style={{
          display: 'block', fontSize: 12, marginTop: 5,
          color: error ? 'var(--state-danger)' : 'var(--text-muted)',
        }}>{error || hint}</span>
      )}
    </label>
  );
}