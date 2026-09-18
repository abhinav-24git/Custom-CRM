"use client";

import { useState, useEffect } from 'react';
import { ALL_MODULES } from '@/lib/auth';
import PageHeader from '@/components/ui/PageHeader';
import FilterCard from '@/components/ui/FilterCard';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('All');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter !== 'All') params.append('module', moduleFilter);
      if (actionFilter !== 'All') params.append('action', actionFilter);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return <StatusBadge status="Create" variant="open" />;
      case 'update':
      case 'edit':
        return <StatusBadge status="Update" variant="in-progress" />;
      case 'approve':
      case 'confirm':
        return <StatusBadge status={action} variant="completed" />;
      case 'deactivate':
      case 'delete':
      case 'cancel':
        return <StatusBadge status={action} variant="rejected" />;
      default:
        return <StatusBadge status={action} variant="open" />;
    }
  };

  return (
    <div>
      <PageHeader
        title="System Audit Trail"
        subtitle="Immutable log of state transitions, approvals, dispatches, and key record actions"
      />

      {/* Filter Card */}
      <FilterCard
        title="Filter Audit Trail"
        onReset={moduleFilter !== 'All' || actionFilter !== 'All' ? () => { setModuleFilter('All'); setActionFilter('All'); } : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Module:</label>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="All">All Modules</option>
            {ALL_MODULES.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Action:</label>
          <select
            className="form-control"
            style={{ width: 'auto' }}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="All">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="confirm">Confirm</option>
            <option value="approve">Approve</option>
            <option value="dispatch">Dispatch</option>
            <option value="resolve">Resolve</option>
            <option value="deactivate">Deactivate</option>
          </select>
        </div>
      </FilterCard>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Module</th>
              <th>Action</th>
              <th>Entity Ref</th>
              <th style={{ textAlign: 'right' }}>Payload Diff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading audit log events...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No audit events found matching filters.</td></tr>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const hasDiff = log.old_values || log.new_values;

                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.user_name}</td>
                    <td>
                      <span className="badge badge-open">
                        {log.module.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {log.entity_id}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {hasDiff ? (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Payload Inspector */}
      {expandedId && (
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>State Transition Payload</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Old Values</span>
              <pre style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', overflowX: 'auto', marginTop: '0.35rem' }}>
                {logs.find(l => l.id === expandedId)?.old_values || 'null'}
              </pre>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>New Values</span>
              <pre style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', overflowX: 'auto', marginTop: '0.35rem' }}>
                {logs.find(l => l.id === expandedId)?.new_values || 'null'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
