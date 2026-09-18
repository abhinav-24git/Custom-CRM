"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quotations')
      .then(r => r.json())
      .then(data => {
        setQuotations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Manage commercial quotations, revisions, customer approvals, and conversion to Sales Orders"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Quotation No</th>
              <th>Date</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading quotations...</td></tr>
            ) : quotations.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No quotations found.</td></tr>
            ) : (
              quotations.map((q: any) => (
                <tr key={q.id}>
                  <td>
                    <Link href={`/quotations/${q.id}`} className="table-link">
                      {q.quotation_number} (Rev {q.revision_number})
                    </Link>
                  </td>
                  <td>{new Date(q.quotation_date).toLocaleDateString()}</td>
                  <td>{q.customer?.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${q.total_amount?.toFixed(2)}</td>
                  <td>
                    <StatusBadge status={q.status} />
                  </td>
                  <td>
                    <Link href={`/quotations/${q.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
