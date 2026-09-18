import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({ label, value, subtext, color, icon }: MetricCardProps) {
  return (
    <div
      style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span
          style={{
            fontSize: '0.725rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          {label}
        </span>
        {icon && <span style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>{icon}</span>}
      </div>
      <div>
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            lineHeight: 1.1,
            color: color || 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
