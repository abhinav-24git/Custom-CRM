"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function RGPChallanDetailPage() {
  const { id } = useParams();
  const [rgp, setRgp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Return GRN modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [challanRef, setChallanRef] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [savingReturn, setSavingReturn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRGP = async () => {
    try {
      const res = await fetch(`/api/rgp-challans/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRgp(data);
        setReceivedQty(data.pending_return_qty || 0);
        setAcceptedQty(data.pending_return_qty || 0);
        setRejectedQty(0);
        setReworkQty(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRGP();
  }, [id]);

  const handleRecordReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rec = parseFloat(String(receivedQty)) || 0;
    const acc = parseFloat(String(acceptedQty)) || 0;
    const rej = parseFloat(String(rejectedQty)) || 0;
    const rew = parseFloat(String(reworkQty)) || 0;

    if (rec <= 0) {
      setErrorMsg('Received quantity must be > 0');
      return;
    }

    if (Math.abs((acc + rej + rew) - rec) > 0.0001) {
      setErrorMsg(`Reconciliation mismatch: Accepted (${acc}) + Rejected (${rej}) + Rework (${rew}) = ${acc + rej + rew}, must equal Received (${rec})`);
      return;
    }

    if (rec > rgp.pending_return_qty + 0.0001) {
      setErrorMsg(`Cannot return more than remaining pending quantity (${rgp.pending_return_qty})`);
      return;
    }

    setSavingReturn(true);
    try {
      const res = await fetch(`/api/rgp-challans/${id}/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_qty: rec,
          accepted_qty: acc,
          rejected_qty: rej,
          rework_qty: rew,
          return_date: returnDate,
          challan_ref: challanRef || null,
          remarks: remarks || null
        })
      });

      if (res.ok) {
        setShowReturnModal(false);
        await fetchRGP();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to record Return GRN');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSavingReturn(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading RGP Challan...</div>;
  if (!rgp) return <div style={{ padding: '2rem' }}>RGP Challan not found.</div>;

  const sumBreakdown = (parseFloat(String(acceptedQty)) || 0) + (parseFloat(String(rejectedQty)) || 0) + (parseFloat(String(reworkQty)) || 0);
  const recNum = parseFloat(String(receivedQty)) || 0;
  const isReconciled = Math.abs(sumBreakdown - recNum) <= 0.0001 && recNum > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{rgp.rgp_number}</h1>
            <span className={`badge ${rgp.status === 'Closed' ? 'badge-closed' : rgp.status === 'Partially Returned' ? 'badge-partially' : 'badge-open'}`}>
              {rgp.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Vendor: <strong>{rgp.vendor?.name}</strong> • Service Order: <Link href={`/service-orders/${rgp.service_order_id}`} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>{rgp.service_order?.service_order_number}</Link>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/rgp-challans" className="btn btn-secondary">
            Back to RGPs
          </Link>
          {rgp.status !== 'Closed' && rgp.pending_return_qty > 0 && (
            <button onClick={() => setShowReturnModal(true)} className="btn btn-primary">
              + Record Return GRN
            </button>
          )}
        </div>
      </div>

      {/* Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Sent on Challan</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{rgp.sent_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Returned</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{rgp.total_returned_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Accepted Qty</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{rgp.total_accepted_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Pending Return</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: rgp.pending_return_qty === 0 ? 'var(--text-secondary)' : 'var(--danger-color)' }}>
            {rgp.pending_return_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Challan Info</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Challan Date:</span>
            <div>{new Date(rgp.challan_date).toLocaleDateString()}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Expected Return Date:</span>
            <div>{rgp.expected_return_date ? new Date(rgp.expected_return_date).toLocaleDateString() : 'N/A'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Days Outstanding:</span>
            <div style={{ fontWeight: 600 }}>{rgp.status === 'Closed' ? 'Completed' : `${rgp.days_outstanding} day(s)`}</div>
          </div>
        </div>
      </div>

      {/* Return GRN History */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Return GRN Receipts</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{rgp.returns?.length || 0} receipt(s)</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Return Date</th>
                <th>Vendor Challan Ref</th>
                <th style={{ textAlign: 'right' }}>Received Qty</th>
                <th style={{ textAlign: 'right' }}>Accepted</th>
                <th style={{ textAlign: 'right' }}>Rejected</th>
                <th style={{ textAlign: 'right' }}>Rework</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rgp.returns?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No return receipts recorded yet. Click "+ Record Return GRN" when material returns from {rgp.vendor?.name}.
                  </td>
                </tr>
              ) : (
                rgp.returns.map((ret: any) => (
                  <tr key={ret.id}>
                    <td>{new Date(ret.return_date).toLocaleDateString()}</td>
                    <td>{ret.challan_ref || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{ret.received_qty}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>+{ret.accepted_qty}</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger-color)', fontWeight: 600 }}>{ret.rejected_qty > 0 ? `-${ret.rejected_qty}` : '0'}</td>
                    <td style={{ textAlign: 'right', color: 'var(--warning-color)', fontWeight: 600 }}>{ret.rework_qty > 0 ? `${ret.rework_qty}` : '0'}</td>
                    <td>{ret.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Return Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Record Return GRN</h3>

            {errorMsg && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <div>Vendor: <strong>{rgp.vendor?.name}</strong></div>
              <div>Max returnable against this RGP: <strong>{rgp.pending_return_qty}</strong> units</div>
            </div>

            <form onSubmit={handleRecordReturn}>
              <div className="form-group">
                <label>Total Received Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={rgp.pending_return_qty}
                  className="form-control"
                  value={receivedQty}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setReceivedQty(val);
                    setAcceptedQty(val);
                    setRejectedQty(0);
                    setReworkQty(0);
                  }}
                  required
                />
              </div>

              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>Inspection Quality Split (Must sum to Received Qty)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Accepted *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      value={acceptedQty}
                      onChange={(e) => setAcceptedQty(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rejected</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      value={rejectedQty}
                      onChange={(e) => setRejectedQty(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rework</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="form-control"
                      value={reworkQty}
                      onChange={(e) => setReworkQty(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', color: isReconciled ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
                  <span>Sum of Breakdown: {sumBreakdown}</span>
                  <span>{isReconciled ? '✓ Reconciled' : `⚠️ Must equal Received (${recNum})`}</span>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Return Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Vendor Challan Ref / Bill No</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. DC-2026-99"
                    value={challanRef}
                    onChange={(e) => setChallanRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Remarks</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Plating inspection passed"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingReturn || !isReconciled || recNum <= 0 || recNum > rgp.pending_return_qty}
                >
                  {savingReturn ? 'Saving...' : 'Post Return GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
