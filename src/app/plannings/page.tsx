"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function PlanningsPage() {
  const [plannings, setPlannings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/plannings')
      .then(res => res.json())
      .then(data => {
        setPlannings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Production Planning"
        subtitle="Allocate confirmed Sales Orders between In-house and Outsource execution"
        action={
          <Link href="/plannings/new" className="btn btn-primary">
            + New Planning
          </Link>
        }
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Planning No</th>
              <th>SO Number</th>
              <th>Customer</th>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>In-House Qty</th>
              <th style={{ textAlign: 'right' }}>Outsource Qty</th>
              <th style={{ textAlign: 'right' }}>Total Planned</th>
              <th>Status</th>
              <th>Execution</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading plannings...</td></tr>
            ) : plannings.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No plannings found. Click "+ New Planning" to create one.</td></tr>
            ) : (
              plannings.map((p) => {
                const total = p.inhouse_qty + p.outsource_qty;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/plannings/${p.id}`} className="table-link">
                        {p.planning_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/sales-orders/${p.sales_order_item?.sales_order_id}`} className="table-link">
                        {p.sales_order_item?.sales_order?.so_number || '-'}
                      </Link>
                    </td>
                    <td>{p.sales_order_item?.sales_order?.customer?.name || '-'}</td>
                    <td>{p.sales_order_item?.item?.name || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.inhouse_qty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.outsource_qty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{total}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {p.JobCards?.length > 0 && (
                          <span className="badge badge-open">
                            {p.JobCards.length} JC
                          </span>
                        )}
                        {p.JobWorkRFQs?.length > 0 && (
                          <span className="badge badge-partially">
                            {p.JobWorkRFQs.length} Outsource
                          </span>
                        )}
                        {(!p.JobCards?.length && !p.JobWorkRFQs?.length) && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Link href={`/plannings/${p.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
