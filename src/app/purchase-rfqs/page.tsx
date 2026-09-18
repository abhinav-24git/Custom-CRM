"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function PurchaseRFQsPage() {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchase-rfqs')
      .then(r => r.json())
      .then(data => {
        setRfqs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Purchase RFQs"
        subtitle="Issue vendor price enquiries, compare incoming quotes, and award purchase lines"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>RFQ No</th>
              <th>MR Ref</th>
              <th>Date</th>
              <th>Invited Suppliers</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading RFQs...</td></tr>
            ) : rfqs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No RFQs found.</td></tr>
            ) : (
              rfqs.map((rfq: any) => (
                <tr key={rfq.id}>
                  <td>
                    <Link href={`/purchase-rfqs/${rfq.id}`} className="table-link">
                      {rfq.rfq_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/material-requirements/${rfq.material_requirement_id}`} className="table-link">
                      {rfq.material_requirement?.mr_number}
                    </Link>
                  </td>
                  <td>{new Date(rfq.rfq_date).toLocaleDateString()}</td>
                  <td>{rfq.suppliers?.map((s: any) => s.supplier?.name).join(', ') || '-'}</td>
                  <td>
                    <StatusBadge status={rfq.status} />
                  </td>
                  <td>
                    <Link href={`/purchase-rfqs/${rfq.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
