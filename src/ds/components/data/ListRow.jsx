'use client';
import React from 'react';

/**
 * List row for schedules & agendas (roster kelas, agenda sekolah, prayer times).
 * Left accent bar optional, meta text, trailing slot.
 */
export function ListRow({ title, subtitle = null, meta = null, leading = null, trailing = null, accent = null, highlighted = false, style = {}, ...rest }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative', overflow: 'hidden',
      background: highlighted ? 'var(--color-primary-50)' : 'var(--surface-card)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      padding: '12px 14px', fontFamily: 'var(--font-sans)', ...style,
    }} {...rest}>
      {accent && <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }} />}
      {leading && <div style={{ flexShrink: 0, display: 'inline-flex' }}>{leading}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {meta && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', marginBottom: 2 }}>{meta}</div>}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {trailing && <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{trailing}</div>}
    </div>
  );
}