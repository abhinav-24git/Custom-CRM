"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import PageTabs from '@/components/ui/PageTabs';
import StatusBadge from '@/components/ui/StatusBadge';

export default function QCActionsPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Open' | 'All'>('Open');

  const fetchActions = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'Open' ? '/api/qc-actions?status=Open' : '/api/qc-actions';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [activeTab]);

  const handleCloseAction = async (id: string) => {
    try {
      const res = await fetch(`/api/qc-actions/${id}/close`, { method: 'POST' });
      if (res.ok) {
        await fetchActions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to close action');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  const tabs = [
    { id: 'Open' as const, label: 'Open Actions Only', badge: actions.filter(a => a.status === 'Open').length },
    { id: 'All' as const, label: 'All Actions' },
  ];

  return (
    <div>
      <PageHeader
        title="QC Action Tracker"
        subtitle="Track scrap, rework, and return-to-vendor actions arising from QC inspections"
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
              <th>Action Type</th>
              <th>QC Ref</th>
              <th>Item</th>
              <th>Owner</th>
              <th>Due Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading QC actions...</td></tr>
            ) : actions.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No actions found in this view.</td></tr>
            ) : (
              actions.map((act) => {
                const isOverdue = act.status === 'Open' && act.due_date && new Date(act.due_date) < new Date();
                return (
                  <tr key={act.id}>
                    <td>
                      <span className="badge badge-rejected" style={{ fontWeight: 700 }}>
                        {act.action_type}
                      </span>
                    </td>
                    <td>
                      <Link href={`/qc-inspections/${act.qc_inspection_item?.qc_inspection_id}`} className="table-link">
                        {act.qc_inspection_item?.qc_inspection?.qc_number || 'View QC'}
                      </Link>
                    </td>
                    <td>{act.qc_inspection_item?.qc_inspection?.sales_order_item?.item?.name || '-'}</td>
                    <td>{act.owner}</td>
                    <td>
                      {act.due_date ? (
                        <span style={{ color: isOverdue ? 'var(--danger-color)' : 'inherit', fontWeight: isOverdue ? 700 : 'normal' }}>
                          {new Date(act.due_date).toLocaleDateString()} {isOverdue ? '⚠️ (Overdue)' : ''}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <StatusBadge status={act.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {act.status === 'Open' ? (
                        <button
                          onClick={() => handleCloseAction(act.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}
                        >
                          Mark Closed
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Closed</span>
                      )}
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
