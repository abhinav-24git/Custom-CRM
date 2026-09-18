"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function PurchaseOrdersPage() {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then(r => r.json())
      .then(data => {
        setPos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Track committed supplier purchase orders, receipts against GRNs, and material delivery status"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th style={{ textAlign: 'right' }}>Pending Qty</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading purchase orders...</td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No purchase orders found.</td></tr>
            ) : (
              pos.map((po: any) => {
                const pending = po.lines?.reduce((s: number, l: any) => s + l.pending_qty, 0) || 0;
                return (
                  <tr key={po.id}>
                    <td>
                      <Link href={`/purchase-orders/${po.id}`} className="table-link">
                        {po.po_number}
                      </Link>
                    </td>
                    <td>{po.supplier?.name}</td>
                    <td>{new Date(po.po_date).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{po.total_amount?.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: pending > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
                      {pending.toFixed(2)}
                    </td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                    <td>
                      <Link href={`/purchase-orders/${po.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
