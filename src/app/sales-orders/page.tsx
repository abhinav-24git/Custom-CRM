"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/sales-orders');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Manage customer orders, commercial status, and fulfillment tracking"
        action={
          <Link href="/sales-orders/new" className="btn btn-primary">
            + New Sales Order
          </Link>
        }
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SO Number</th>
              <th>Customer</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Total Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading sales orders...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No sales orders found.</td></tr>
            ) : (
              orders.map((o: any) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/sales-orders/${o.id}`} className="table-link">
                      {o.so_number}
                    </Link>
                  </td>
                  <td>{o.customer?.name}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${o.total_amount?.toFixed(2)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                  <td>
                    <Link href={`/sales-orders/${o.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
