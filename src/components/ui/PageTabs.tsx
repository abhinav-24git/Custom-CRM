import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface PageTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
}

export default function PageTabs<T extends string = string>({ tabs, activeTab, onChange }: PageTabsProps<T>) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '0.35rem',
        overflowX: 'auto',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem',
        marginBottom: '1.5rem',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '0.375rem',
              border: 'none',
              background: isActive ? 'var(--primary-color)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '9999px',
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--surface-hover)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  marginLeft: '0.2rem',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
