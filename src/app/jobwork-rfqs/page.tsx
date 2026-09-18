"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function JobWorkRFQsPage() {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/jobwork-rfqs')
      .then(res => res.json())
      .then(data => {
        setRfqs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Job Work RFQs"
        subtitle="Send outsource requirements to vendors, compare quotes, and generate Service Orders"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>RFQ No</th>
              <th>Planning Ref</th>
              <th>Process / Operation</th>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th>Material Resp.</th>
              <th>Vendors</th>
              <th style={{ textAlign: 'center' }}>Quotes</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading Job Work RFQs...</td></tr>
            ) : rfqs.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No Job Work RFQs found. Release an outsource planning line to create an RFQ.</td></tr>
            ) : (
              rfqs.map((rfq) => (
                <tr key={rfq.id}>
                  <td>
                    <Link href={`/jobwork-rfqs/${rfq.id}`} className="table-link">
                      {rfq.rfq_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/plannings/${rfq.planning_id}`} className="table-link">
                      {rfq.planning?.planning_number}
                    </Link>
                  </td>
                  <td>{rfq.process}</td>
                  <td>{rfq.planning?.sales_order_item?.item?.name || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{rfq.qty}</td>
                  <td>{rfq.material_responsibility}</td>
                  <td>
                    {rfq.suppliers?.map((s: any) => s.supplier?.name).join(', ') || '-'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>
                    {rfq.quotes?.length || 0}
                  </td>
                  <td>
                    <StatusBadge status={rfq.status} />
                  </td>
                  <td>
                    <Link href={`/jobwork-rfqs/${rfq.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
