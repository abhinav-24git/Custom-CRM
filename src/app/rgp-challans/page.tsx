"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import PageTabs from '@/components/ui/PageTabs';
import StatusBadge from '@/components/ui/StatusBadge';

export default function RGPChallansPage() {
  const [rgps, setRgps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'outstanding'>('all');

  const fetchRgps = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'outstanding' ? '/api/rgp-challans?outstanding=true' : '/api/rgp-challans';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRgps(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRgps();
  }, [activeTab]);

  const tabs = [
    { id: 'all' as const, label: 'All RGPs', badge: rgps.length },
    { id: 'outstanding' as const, label: 'Outstanding Returns Only' },
  ];

  return (
    <div>
      <PageHeader
        title="Returnable Gate Pass (RGP) Challans"
        subtitle="Track outgoing material sent to job work vendors and return receipts (Return GRN)"
      />

      <PageTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>RGP Number</th>
              <th>Service Order</th>
              <th>Vendor</th>
              <th>Challan Date</th>
              <th>Expected Return</th>
              <th style={{ textAlign: 'right' }}>Sent Qty</th>
              <th style={{ textAlign: 'right' }}>Returned</th>
              <th style={{ textAlign: 'right' }}>Pending</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading RGP Challans...</td></tr>
            ) : rgps.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No RGP Challans found in this view.</td></tr>
            ) : (
              rgps.map((rgp) => (
                <tr key={rgp.id}>
                  <td>
                    <Link href={`/rgp-challans/${rgp.id}`} className="table-link">
                      {rgp.rgp_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/service-orders/${rgp.service_order_id}`} className="table-link">
                      {rgp.service_order?.service_order_number}
                    </Link>
                  </td>
                  <td>{rgp.vendor?.name}</td>
                  <td>{new Date(rgp.challan_date).toLocaleDateString()}</td>
                  <td>{rgp.expected_return_date ? new Date(rgp.expected_return_date).toLocaleDateString() : '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{rgp.sent_qty}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{rgp.total_returned}</td>
                  <td style={{ textAlign: 'right', color: rgp.pending_qty > 0 ? 'var(--warning-color)' : 'var(--text-secondary)', fontWeight: 600 }}>
                    {rgp.pending_qty}
                  </td>
                  <td>
                    <StatusBadge status={rgp.status} />
                  </td>
                  <td>
                    <Link href={`/rgp-challans/${rgp.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
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
