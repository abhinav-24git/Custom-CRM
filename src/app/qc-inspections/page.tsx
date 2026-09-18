"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import PageTabs from '@/components/ui/PageTabs';
import StatusBadge from '@/components/ui/StatusBadge';

export default function QCInspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'All' ? '/api/qc-inspections' : `/api/qc-inspections?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInspections(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [statusFilter]);

  const tabs = [
    { id: 'All', label: 'All Inspections', badge: inspections.length },
    { id: 'Pending', label: 'Pending Inspection' },
    { id: 'Completed', label: 'Completed' },
  ];

  return (
    <div>
      <PageHeader
        title="Quality Control (QC) Worklist"
        subtitle="Inspect completed in-house production and outsourced vendor return receipts"
      />

      <PageTabs
        tabs={tabs}
        activeTab={statusFilter}
        onChange={setStatusFilter}
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>QC No</th>
              <th>Source Type</th>
              <th>Source Ref</th>
              <th>Item</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Inspected Qty</th>
              <th style={{ textAlign: 'right' }}>Accepted</th>
              <th style={{ textAlign: 'right' }}>Rejected</th>
              <th style={{ textAlign: 'right' }}>Rework</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading QC inspections...</td></tr>
            ) : inspections.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No QC inspections found in this view.</td></tr>
            ) : (
              inspections.map((qc) => (
                <tr key={qc.id}>
                  <td>
                    <Link href={`/qc-inspections/${qc.id}`} className="table-link">
                      {qc.qc_number}
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-open">
                      {qc.source_type}
                    </span>
                  </td>
                  <td>
                    {qc.source_type === 'Job Card' ? (
                      <Link href={`/job-cards/${qc.source_id}`} className="table-link">
                        {qc.source_ref?.number || 'View Job Card'}
                      </Link>
                    ) : (
                      <span>
                        {qc.source_ref?.number} {qc.source_ref?.vendor_name ? `(${qc.source_ref.vendor_name})` : ''}
                      </span>
                    )}
                  </td>
                  <td>{qc.sales_order_item?.item?.name || '-'}</td>
                  <td>{qc.sales_order_item?.sales_order?.customer?.name || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{qc.inspected_qty}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>
                    {qc.status === 'Completed' ? `+${qc.accepted_qty}` : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--danger-color)', fontWeight: 600 }}>
                    {qc.status === 'Completed' && qc.rejected_qty > 0 ? `-${qc.rejected_qty}` : qc.status === 'Completed' ? '0' : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--warning-color)', fontWeight: 600 }}>
                    {qc.status === 'Completed' && qc.rework_qty > 0 ? `${qc.rework_qty}` : qc.status === 'Completed' ? '0' : '-'}
                  </td>
                  <td>
                    <StatusBadge status={qc.status} />
                  </td>
                  <td>
                    <Link
                      href={`/qc-inspections/${qc.id}`}
                      className={`btn ${qc.status === 'Pending' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}
                    >
                      {qc.status === 'Pending' ? 'Inspect' : 'Open'}
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
