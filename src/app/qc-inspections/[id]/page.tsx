"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QCInspectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [qc, setQc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [acceptedQty, setAcceptedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');

  // Next action states
  const [actionType, setActionType] = useState<string>('Scrap');
  const [actionOwner, setActionOwner] = useState<string>('');
  const [actionDueDate, setActionDueDate] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchQC = async () => {
    try {
      const res = await fetch(`/api/qc-inspections/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQc(data);
        const lineItem = data.items?.[0];
        if (data.status === 'Pending' && lineItem) {
          setAcceptedQty(lineItem.inspected_qty || 0);
          setRejectedQty(0);
          setReworkQty(0);
        } else if (lineItem) {
          setAcceptedQty(lineItem.accepted_qty || 0);
          setRejectedQty(lineItem.rejected_qty || 0);
          setReworkQty(lineItem.rework_qty || 0);
          setRemarks(lineItem.remarks || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchQC();
  }, [id]);

  const lineItem = qc?.items?.[0];
  const inspectedQty = lineItem?.inspected_qty || 0;

  const sumBreakdown = (parseFloat(String(acceptedQty)) || 0) + (parseFloat(String(rejectedQty)) || 0) + (parseFloat(String(reworkQty)) || 0);
  const isReconciled = Math.abs(sumBreakdown - inspectedQty) <= 0.0001;

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const acc = parseFloat(String(acceptedQty)) || 0;
    const rej = parseFloat(String(rejectedQty)) || 0;
    const rew = parseFloat(String(reworkQty)) || 0;

    if (acc < 0 || rej < 0 || rew < 0) {
      setErrorMsg('Accepted, rejected, and rework quantities must be non-negative');
      return;
    }

    if (Math.abs(acc + rej + rew - inspectedQty) > 0.0001) {
      setErrorMsg(`Reconciliation mismatch: Accepted (${acc}) + Rejected (${rej}) + Rework (${rew}) = ${acc + rej + rew}, which must equal Inspected Qty (${inspectedQty})`);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        accepted_qty: acc,
        rejected_qty: rej,
        rework_qty: rew,
        remarks: remarks || null
      };

      if ((rej > 0 || rew > 0) && actionOwner.trim()) {
        payload.action = {
          action_type: actionType,
          owner: actionOwner.trim(),
          due_date: actionDueDate || null
        };
      }

      const res = await fetch(`/api/qc-inspections/${id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchQC();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to submit QC inspection');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading QC Inspection...</div>;
  if (!qc) return <div style={{ padding: '2rem' }}>QC Inspection not found.</div>;

  const isCompleted = qc.status === 'Completed';

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{qc.qc_number}</h1>
            <span className={`badge ${isCompleted ? 'badge-closed' : 'badge-partially'}`}>
              {qc.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Source: <strong>{qc.source_type}</strong> • Item: <strong>{qc.sales_order_item?.item?.name}</strong> • SO: <strong>{qc.sales_order_item?.sales_order?.so_number}</strong>
          </p>
        </div>

        <Link href="/qc-inspections" className="btn btn-secondary">
          Back to QC List
        </Link>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Source Info Banner */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Inspection Origin</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Source Reference:</span>
            <div style={{ fontWeight: 600 }}>{qc.source_details?.number || qc.source_type}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Customer:</span>
            <div>{qc.sales_order_item?.sales_order?.customer?.name}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Item & UOM:</span>
            <div>{qc.sales_order_item?.item?.name} ({qc.sales_order_item?.item?.uom})</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Total To Inspect:</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-color)' }}>{inspectedQty} units</div>
          </div>
        </div>
      </div>

      {/* Inspection Form or Completed Display */}
      {!isCompleted ? (
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Record QC Decision</h2>

          <form onSubmit={handleSubmitInspection}>
            <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Quantity Split (Must exactly sum to {inspectedQty} units)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label><strong>Accepted Qty *</strong> (Passed)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={inspectedQty}
                    className="form-control"
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(parseFloat(e.target.value) || 0)}
                    required
                  />
                  <small style={{ color: 'var(--success-color)', fontSize: '0.75rem' }}>Eligible for customer dispatch</small>
                </div>

                <div className="form-group">
                  <label><strong>Scrap / Rejected Qty</strong></label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={inspectedQty}
                    className="form-control"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(parseFloat(e.target.value) || 0)}
                  />
                  <small style={{ color: 'var(--danger-color)', fontSize: '0.75rem' }}>Unusable / scrap</small>
                </div>

                <div className="form-group">
                  <label><strong>Rework Qty</strong></label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={inspectedQty}
                    className="form-control"
                    value={reworkQty}
                    onChange={(e) => setReworkQty(parseFloat(e.target.value) || 0)}
                  />
                  <small style={{ color: 'var(--warning-color)', fontSize: '0.75rem' }}>Requires correction</small>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', color: isReconciled ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
                <span>Sum: {sumBreakdown} / {inspectedQty}</span>
                <span>{isReconciled ? '✓ Quantities Reconciled' : `⚠️ Must equal ${inspectedQty}`}</span>
              </div>
            </div>

            {/* Next Action Tracker for Rejected / Rework */}
            {(rejectedQty > 0 || reworkQty > 0) && (
              <div style={{ border: '1px dashed var(--border-color)', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(245, 158, 11, 0.04)' }}>
                <h3 style={{ fontSize: '0.9375rem', color: 'var(--warning-color)', marginBottom: '0.75rem' }}>
                  Next Action Indicator (Non-Conformance)
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Assign responsibility for {rejectedQty + reworkQty} units requiring scrap or rework action.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Action Type</label>
                    <select
                      className="form-control"
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                    >
                      <option value="Scrap">Scrap / Disposal</option>
                      <option value="Rework">In-house Rework</option>
                      <option value="Return to Vendor">Return to Vendor</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Assigned Owner / Responsible Person</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mike Tyson (Production Lead)"
                      value={actionOwner}
                      onChange={(e) => setActionOwner(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Target Resolution Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={actionDueDate}
                      onChange={(e) => setActionDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>QC Remarks / Inspection Notes</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="e.g. Dimensions verified per drawing #A102. Visual surface finish acceptable."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <Link href="/qc-inspections" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !isReconciled}
              >
                {submitting ? 'Submitting...' : 'Submit QC Result'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {/* Completed Metrics Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>QC Accepted Qty</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success-color)' }}>+{acceptedQty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
            </div>

            <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>QC Rejected Qty</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger-color)' }}>{rejectedQty > 0 ? `-${rejectedQty}` : '0'} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
            </div>

            <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>QC Rework Qty</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning-color)' }}>{reworkQty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
            </div>
          </div>

          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Inspection Remarks</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{remarks || 'No remarks provided.'}</p>
          </div>

          {/* Action Log if any */}
          {lineItem?.actions?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>QC Action Log</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Action Type</th>
                      <th>Owner</th>
                      <th>Due Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItem.actions.map((act: any) => (
                      <tr key={act.id}>
                        <td><strong>{act.action_type}</strong></td>
                        <td>{act.owner}</td>
                        <td>{act.due_date ? new Date(act.due_date).toLocaleDateString() : '-'}</td>
                        <td>
                          <span className={`badge ${act.status === 'Closed' ? 'badge-closed' : 'badge-partially'}`}>
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
