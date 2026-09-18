"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import FilterCard from '@/components/ui/FilterCard';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ControlTowerSearchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sales-orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return (
      o.so_number?.toLowerCase().includes(term) ||
      o.customer?.name?.toLowerCase().includes(term) ||
      o.quotation?.enquiry?.enquiry_number?.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <PageHeader
        title="Order Control Tower"
        subtitle="End-to-end operational radar tracking order journeys from Enquiry to Customer Feedback"
      />

      <FilterCard title="Search & Filter Orders">
        <div style={{ flex: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by Sales Order No, Customer Name, or Enquiry Reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </FilterCard>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SO Number</th>
              <th>Customer</th>
              <th>Order Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Total Value</th>
              <th style={{ textAlign: 'right' }}>Ordered</th>
              <th style={{ textAlign: 'right' }}>Dispatched</th>
              <th style={{ textAlign: 'center' }}>Control Tower</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading active orders...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No orders found matching '{searchTerm}'.</td></tr>
            ) : (
              filtered.map((o) => {
                const ordered = o.lines?.reduce((s: number, l: any) => s + l.ordered_qty, 0) || 0;
                const dispatched = o.lines?.reduce((s: number, l: any) => s + l.dispatched_qty, 0) || 0;

                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/sales-orders/${o.id}`} className="table-link">
                        {o.so_number}
                      </Link>
                    </td>
                    <td>{o.customer?.name}</td>
                    <td>{new Date(o.order_date).toLocaleDateString()}</td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{o.total_amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{ordered}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{dispatched}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Link
                        href={`/control-tower/${o.id}`}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.8125rem' }}
                      >
                        Launch Tower
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
