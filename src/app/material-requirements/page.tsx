"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function MRPage() {
  const [mrs, setMrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/material-requirements')
      .then(r => r.json())
      .then(data => {
        setMrs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const summarizeShortage = (items: any[]) => {
    if (!items || items.length === 0) return 'No lines';
    const shortCount = items.filter(i => i.shortage_qty > 0).length;
    if (shortCount === 0) return <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>All clear</span>;
    return <span style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{shortCount} item(s) short</span>;
  };

  return (
    <div>
      <PageHeader
        title="Material Requirements"
        subtitle="Manage BOM component shortages, stock allocations, and procurement readiness"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>MR Number</th>
              <th>SO Number</th>
              <th>Required Date</th>
              <th>Shortage Summary</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading material requirements...</td></tr>
            ) : mrs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No material requirements found.</td></tr>
            ) : (
              mrs.map((mr: any) => (
                <tr key={mr.id}>
                  <td>
                    <Link href={`/material-requirements/${mr.id}`} className="table-link">
                      {mr.mr_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/sales-orders/${mr.sales_order_id}`} className="table-link">
                      {mr.sales_order?.so_number || '-'}
                    </Link>
                  </td>
                  <td>{mr.required_date ? new Date(mr.required_date).toLocaleDateString() : '-'}</td>
                  <td>{summarizeShortage(mr.items)}</td>
                  <td>
                    <StatusBadge status={mr.status} />
                  </td>
                  <td>
                    <Link href={`/material-requirements/${mr.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
