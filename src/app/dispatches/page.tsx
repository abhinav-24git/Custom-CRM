"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

export default function DispatchesPage() {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dispatches')
      .then(res => res.json())
      .then(data => {
        setDispatches(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Delivery Dispatches & Challans"
        subtitle="Manage document-backed customer dispatches, logistics, and delivery notes"
        action={
          <Link href="/dispatches/new" className="btn btn-primary">
            + New Dispatch
          </Link>
        }
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Dispatch No</th>
              <th>SO Ref</th>
              <th>Customer</th>
              <th>Dispatch Date</th>
              <th>Transporter</th>
              <th>Vehicle No</th>
              <th style={{ textAlign: 'right' }}>Total Units</th>
              <th>Invoice / Ref</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading dispatches...</td></tr>
            ) : dispatches.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No dispatches created yet. Click "+ New Dispatch" to generate a delivery note against QC-approved stock.</td></tr>
            ) : (
              dispatches.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/dispatches/${d.id}`} className="table-link">
                      {d.dispatch_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/sales-orders/${d.sales_order_id}`} className="table-link">
                      {d.sales_order?.so_number}
                    </Link>
                  </td>
                  <td>{d.sales_order?.customer?.name || '-'}</td>
                  <td>{new Date(d.dispatch_date).toLocaleDateString()}</td>
                  <td>{d.transporter || '-'}</td>
                  <td>{d.vehicle_number || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success-color)' }}>
                    {d.total_qty}
                  </td>
                  <td>{d.invoice_reference || '-'}</td>
                  <td>
                    <Link href={`/dispatches/${d.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
