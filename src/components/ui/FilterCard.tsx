import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  title?: string;
  onSearch?: () => void;
  onReset?: () => void;
}

export default function FilterCard({ children, title, onSearch, onReset }: FilterBarProps) {
  return (
    <div
      style={{
        background: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      {title && (
        <label
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'block',
            marginBottom: '0.75rem',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
        </label>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', flex: 1, alignItems: 'center' }}>
          {children}
        </div>
        {(onSearch || onReset) && (
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {onReset && (
              <button type="button" onClick={onReset} className="btn btn-secondary">
                Reset
              </button>
            )}
            {onSearch && (
              <button type="button" onClick={onSearch} className="btn btn-primary">
                Apply Filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
