"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function JobCardsPage() {
  const [jobCards, setJobCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/job-cards')
      .then(res => res.json())
      .then(data => {
        setJobCards(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="In-House Job Cards"
        subtitle="Track production and shop-floor execution against planned orders"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Job Card No</th>
              <th>Planning Ref</th>
              <th>Item</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Planned</th>
              <th style={{ textAlign: 'right' }}>Produced</th>
              <th style={{ textAlign: 'right' }}>Rejected</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading Job Cards...</td></tr>
            ) : jobCards.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No Job Cards found. Release a Planning with in-house qty to generate a Job Card.</td></tr>
            ) : (
              jobCards.map((jc) => (
                <tr key={jc.id}>
                  <td>
                    <Link href={`/job-cards/${jc.id}`} className="table-link">
                      {jc.job_card_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/plannings/${jc.planning_id}`} className="table-link">
                      {jc.planning?.planning_number}
                    </Link>
                  </td>
                  <td>{jc.planning?.sales_order_item?.item?.name || '-'}</td>
                  <td>{jc.planning?.sales_order_item?.sales_order?.customer?.name || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{jc.planned_qty}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{jc.total_produced}</td>
                  <td style={{ textAlign: 'right', color: 'var(--danger-color)', fontWeight: 600 }}>{jc.total_rejected}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{jc.balance_qty}</td>
                  <td>
                    <StatusBadge status={jc.status} />
                  </td>
                  <td>
                    <Link href={`/job-cards/${jc.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
