"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function JobCardDetailPage() {
  const { id } = useParams();
  const [jobCard, setJobCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Record production modal state
  const [showModal, setShowModal] = useState(false);
  const [producedQty, setProducedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchJobCard = async () => {
    try {
      const res = await fetch(`/api/job-cards/${id}`);
      if (res.ok) {
        const data = await res.json();
        setJobCard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchJobCard();
  }, [id]);

  const handleStart = async () => {
    try {
      const res = await fetch(`/api/job-cards/${id}/start`, { method: 'POST' });
      if (res.ok) {
        await fetchJobCard();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start Job Card');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleRecordProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const p = parseFloat(String(producedQty)) || 0;
    const r = parseFloat(String(rejectedQty)) || 0;

    if (p < 0 || r < 0) {
      setErrorMsg('Produced and rejected quantities cannot be negative');
      return;
    }

    if (p + r <= 0) {
      setErrorMsg('Please enter a quantity for produced or rejected');
      return;
    }

    if (p + r > jobCard.balance_qty + 0.0001) {
      setErrorMsg(`Total entry (${p + r}) exceeds remaining open quantity (${jobCard.balance_qty})`);
      return;
    }

    setSavingEntry(true);
    try {
      const res = await fetch(`/api/job-cards/${id}/production-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produced_qty: p,
          rejected_qty: r,
          entry_date: entryDate,
          remarks: remarks || null
        })
      });

      if (res.ok) {
        setShowModal(false);
        setProducedQty(0);
        setRejectedQty(0);
        setRemarks('');
        await fetchJobCard();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to record entry');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSavingEntry(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Job Card...</div>;
  if (!jobCard) return <div style={{ padding: '2rem' }}>Job Card not found.</div>;

  const pct = jobCard.planned_qty > 0 ? Math.min(100, (jobCard.total_produced / jobCard.planned_qty) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{jobCard.job_card_number}</h1>
            <span className={`badge ${jobCard.status === 'Completed' || jobCard.status === 'Closed' ? 'badge-closed' : jobCard.status === 'In Progress' ? 'badge-partially' : 'badge-open'}`}>
              {jobCard.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Planning: <Link href={`/plannings/${jobCard.planning_id}`} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>{jobCard.planning?.planning_number}</Link> • Item: <strong>{jobCard.planning?.sales_order_item?.item?.name}</strong> • Customer: <strong>{jobCard.planning?.sales_order_item?.sales_order?.customer?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/job-cards" className="btn btn-secondary">
            Back to Job Cards
          </Link>
          {jobCard.status === 'Released' && (
            <button onClick={handleStart} className="btn btn-primary" style={{ background: 'var(--warning-color)' }}>
              Start Job Card
            </button>
          )}
          {jobCard.status !== 'Closed' && jobCard.balance_qty > 0 && (
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              + Record Production
            </button>
          )}
        </div>
      </div>

      {/* Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Planned Target</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{jobCard.planned_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Good Production</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{jobCard.total_produced} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Scrap / Rejected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-color)' }}>{jobCard.total_rejected} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Remaining / Balance</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: jobCard.balance_qty === 0 ? 'var(--text-secondary)' : 'var(--primary-color)' }}>
            {jobCard.balance_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <span><strong>Production Completion</strong></span>
          <span style={{ fontWeight: 600 }}>{pct.toFixed(1)}%</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--success-color)', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Production Entries Ledger */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Production Log</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{jobCard.productionEntries?.length || 0} entries recorded</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Good Output</th>
                <th style={{ textAlign: 'right' }}>Rejected</th>
                <th style={{ textAlign: 'right' }}>Total Qty</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {jobCard.productionEntries?.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No production recorded yet. Click "+ Record Production" to post production output.</td></tr>
              ) : (
                jobCard.productionEntries.map((e: any) => (
                  <tr key={e.id}>
                    <td>{new Date(e.entry_date).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>+{e.produced_qty}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger-color)', fontWeight: 600 }}>{e.rejected_qty > 0 ? `-${e.rejected_qty}` : '0'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{e.produced_qty + e.rejected_qty}</td>
                    <td>{e.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Production Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Record Production Output</h3>

            {errorMsg && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <div>Max allowable production: <strong>{jobCard.balance_qty}</strong> units</div>
            </div>

            <form onSubmit={handleRecordProduction}>
              <div className="form-group">
                <label>Good Produced Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={jobCard.balance_qty}
                  className="form-control"
                  value={producedQty}
                  onChange={(e) => setProducedQty(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Scrap / Rejected Quantity</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="form-control"
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label>Entry Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Remarks / Batch Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Shift 1 - Batch #4"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEntry || (producedQty + rejectedQty <= 0) || (producedQty + rejectedQty > jobCard.balance_qty)}
                >
                  {savingEntry ? 'Saving...' : 'Post Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
