"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/service-orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Service Orders (Job Work)"
        subtitle="Manage outsource purchase contracts, send material via RGP, and receive processed goods"
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Service Order No</th>
              <th>Vendor / Supplier</th>
              <th>Process</th>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Ordered</th>
              <th style={{ textAlign: 'right' }}>Sent (RGP)</th>
              <th style={{ textAlign: 'right' }}>Accepted</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading Service Orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No Service Orders found. Select an awarded quote on a Job Work RFQ to issue a Service Order.</td></tr>
            ) : (
              orders.map((so) => (
                <tr key={so.id}>
                  <td>
                    <Link href={`/service-orders/${so.id}`} className="table-link">
                      {so.service_order_number}
                    </Link>
                  </td>
                  <td>{so.supplier?.name}</td>
                  <td>{so.process}</td>
                  <td>{so.jobwork_rfq?.planning?.sales_order_item?.item?.name || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{so.ordered_qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{so.total_sent_rgp}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{so.total_accepted_return}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${so.amount.toFixed(2)}</td>
                  <td>
                    <StatusBadge status={so.status} />
                  </td>
                  <td>
                    <Link href={`/service-orders/${so.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
