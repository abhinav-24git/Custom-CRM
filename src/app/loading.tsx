export default function RootLoading() {
  return (
    <div style={{ width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ height: '28px', width: '220px', background: 'var(--surface-color)', borderRadius: '6px' }} />
          <div style={{ height: '16px', width: '340px', background: 'var(--surface-color)', borderRadius: '4px' }} />
        </div>
        <div style={{ height: '36px', width: '120px', background: 'var(--surface-color)', borderRadius: '6px' }} />
      </div>

      {/* KPI Cards / Stats Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '90px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
        ))}
      </div>

      {/* Table Skeleton */}
      <div style={{ height: '320px', background: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ height: '32px', width: '100%', background: 'var(--surface-hover)', borderRadius: '4px' }} />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: '40px', width: '100%', background: 'var(--surface-hover)', borderRadius: '4px', opacity: 0.5 }} />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
