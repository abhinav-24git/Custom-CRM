"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import PageTabs from '@/components/ui/PageTabs';
import StatusBadge from '@/components/ui/StatusBadge';

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'All' ? '/api/feedbacks' : `/api/feedbacks?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter]);

  const tabs = [
    { id: 'All', label: 'All Feedback', badge: feedbacks.length },
    { id: 'Action Open', label: 'Action Open' },
    { id: 'Received', label: 'Received' },
  ];

  return (
    <div>
      <PageHeader
        title="Customer Feedback"
        subtitle="Review post-delivery customer satisfaction, ratings, and resolution tickets"
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
              <th>Feedback No</th>
              <th>Dispatch No</th>
              <th>Customer</th>
              <th>Requested Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Rating</th>
              <th>Comments</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading feedbacks...</td></tr>
            ) : feedbacks.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No feedback records found in this view.</td></tr>
            ) : (
              feedbacks.map((fb) => (
                <tr key={fb.id}>
                  <td>
                    <Link href={`/feedbacks/${fb.id}`} className="table-link">
                      {fb.feedback_number}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/dispatches/${fb.dispatch_id}`} className="table-link">
                      {fb.dispatch?.dispatch_number}
                    </Link>
                  </td>
                  <td>{fb.customer?.name}</td>
                  <td>{new Date(fb.requested_at).toLocaleDateString()}</td>
                  <td>
                    <StatusBadge status={fb.status} />
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {fb.rating ? (
                      <span style={{ color: fb.rating <= 2 ? 'var(--danger-color)' : fb.rating >= 4 ? 'var(--success-color)' : 'var(--warning-color)' }}>
                        ★ {fb.rating}/5
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                    )}
                  </td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fb.comments || '-'}
                  </td>
                  <td>
                    <Link
                      href={`/feedbacks/${fb.id}`}
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}
                    >
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
