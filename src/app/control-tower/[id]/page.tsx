"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function SingleOrderControlTowerPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchControlTower = async () => {
    try {
      const res = await fetch(`/api/orders/${id}/control-tower`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchControlTower();
  }, [id]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Connecting to Order Control Tower...</div>;
  if (!data) return <div style={{ padding: '3rem', textAlign: 'center' }}>Control Tower data not found.</div>;

  const { sales_order, health, blockers, metrics, stages } = data;

  const healthColor = health === 'Green' ? 'var(--success-color)' : health === 'Amber' ? 'var(--warning-color)' : 'var(--danger-color)';
  const healthBg = health === 'Green' ? 'rgba(16, 185, 129, 0.1)' : health === 'Amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>Control Tower: {sales_order.so_number}</h1>
            <span
              className="badge"
              style={{
                background: healthBg,
                color: healthColor,
                border: `1px solid ${healthColor}`,
                fontWeight: 700
              }}
            >
              Health: {health.toUpperCase()}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Customer: <strong>{sales_order.customer_name}</strong> • Ordered On: {new Date(sales_order.order_date).toLocaleDateString()} • Value: <strong>₹{sales_order.total_amount.toFixed(2)}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/control-tower" className="btn btn-secondary">
            Search Another Order
          </Link>
          <Link href={`/sales-orders/${sales_order.id}`} className="btn btn-primary">
            Open Sales Order
          </Link>
        </div>
      </div>

      {/* Summary Metrics Band */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ordered Qty</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{metrics.total_ordered_qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Produced Output</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{metrics.total_produced_qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>QC Cleared Stock</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{metrics.total_qc_accepted_qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dispatched Units</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{metrics.total_dispatched_qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Remaining Backlog</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: metrics.balance_qty > 0 ? 'var(--warning-color)' : 'var(--text-secondary)' }}>{metrics.balance_qty} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>
      </div>

      {/* Completion Progress Bar */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <span><strong>Fulfillment Delivery Progress</strong></span>
          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{metrics.completion_pct}%</span>
        </div>
        <div style={{ width: '100%', height: '12px', background: 'var(--surface-hover)', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${metrics.completion_pct}%`, height: '100%', background: metrics.completion_pct === 100 ? 'var(--success-color)' : 'var(--primary-color)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Blockers & Action Radar */}
      {blockers?.length > 0 && (
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--warning-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--warning-color)', marginBottom: '0.5rem' }}>
            ⚠️ Active Bottlenecks & Pending Actions ({blockers.length})
          </h3>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
            {blockers.map((b: string, i: number) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 10-Stage Visual Lifecycle Journey */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>End-to-End Lifecycle Journey</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {stages.map((stg: any, index: number) => {
            const isDone = stg.status === 'Completed' || stg.status === 'Closed';
            const isInProg = stg.status === 'In Progress' || stg.status === 'Partially Dispatched' || stg.status === 'In Inspection' || stg.status === 'Started';

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  background: isDone ? 'rgba(16, 185, 129, 0.04)' : isInProg ? 'rgba(59, 130, 246, 0.04)' : 'var(--surface-hover)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      background: isDone ? 'var(--success-color)' : isInProg ? 'var(--primary-color)' : 'var(--border-color)',
                      color: '#fff'
                    }}
                  >
                    {isDone ? '✓' : index + 1}
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                      {stg.stage_name}
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 400 }}>
                        ({stg.ref_number})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {stg.details} {stg.date && `• ${new Date(stg.date).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    className={`badge ${isDone ? 'badge-closed' : isInProg ? 'badge-open' : 'badge-partially'}`}
                  >
                    {stg.status}
                  </span>

                  {stg.link && (
                    <Link
                      href={stg.link}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}
                    >
                      Open Document ↗
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
