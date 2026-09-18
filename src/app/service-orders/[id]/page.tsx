"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ServiceOrderDetailPage() {
  const { id } = useParams();
  const [so, setSo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Issue RGP modal state
  const [showRgpModal, setShowRgpModal] = useState(false);
  const [sentQty, setSentQty] = useState<number>(0);
  const [challanDate, setChallanDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [issuingRgp, setIssuingRgp] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchServiceOrder = async () => {
    try {
      const res = await fetch(`/api/service-orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSo(data);
        setSentQty(data.remaining_to_send || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchServiceOrder();
  }, [id]);

  const handleIssueRgp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const qty = parseFloat(String(sentQty)) || 0;
    if (qty <= 0) {
      setErrorMsg('Sent quantity must be greater than 0');
      return;
    }

    if (qty > so.remaining_to_send + 0.0001) {
      setErrorMsg(`Cannot send more than remaining un-sent quantity (${so.remaining_to_send})`);
      return;
    }

    setIssuingRgp(true);
    try {
      const res = await fetch(`/api/service-orders/${id}/rgp-challans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sent_qty: qty,
          challan_date: challanDate || null,
          expected_return_date: expectedReturnDate || null
        })
      });

      if (res.ok) {
        setShowRgpModal(false);
        await fetchServiceOrder();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to issue RGP');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setIssuingRgp(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Service Order...</div>;
  if (!so) return <div style={{ padding: '2rem' }}>Service Order not found.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{so.service_order_number}</h1>
            <span className={`badge ${so.status === 'Completed' || so.status === 'Closed' ? 'badge-closed' : so.status === 'In Progress' || so.status === 'Partially Received' ? 'badge-partially' : 'badge-open'}`}>
              {so.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Vendor: <strong>{so.supplier?.name}</strong> • Process: <strong>{so.process}</strong> • Item: <strong>{so.jobwork_rfq?.planning?.sales_order_item?.item?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/service-orders" className="btn btn-secondary">
            Back to Orders
          </Link>
          {so.status !== 'Closed' && so.remaining_to_send > 0 && (
            <button onClick={() => setShowRgpModal(true)} className="btn btn-primary">
              + Issue RGP Challan
            </button>
          )}
        </div>
      </div>

      {/* Progress Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Contract Qty</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{so.ordered_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Dispatched via RGP</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{so.total_sent_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Accepted Return GRN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{so.total_accepted_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Remaining to Send</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: so.remaining_to_send === 0 ? 'var(--text-secondary)' : 'var(--warning-color)' }}>
            {so.remaining_to_send} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span>
          </div>
        </div>
      </div>

      {/* Commercial Details */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Commercial Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Job Work Rate:</span>
            <div style={{ fontWeight: 600 }}>₹{so.rate.toFixed(2)} / unit</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Total Contract Value:</span>
            <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>₹{so.amount.toFixed(2)}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Expected Completion:</span>
            <div>{so.expected_date ? new Date(so.expected_date).toLocaleDateString() : 'Not specified'}</div>
          </div>
        </div>
      </div>

      {/* Issued RGP Challans */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Returnable Gate Pass (RGP) Challans</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{so.rgpChallans?.length || 0} challan(s) issued</span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>RGP Number</th>
                <th>Challan Date</th>
                <th style={{ textAlign: 'right' }}>Sent Qty</th>
                <th style={{ textAlign: 'right' }}>Returned</th>
                <th style={{ textAlign: 'right' }}>Pending</th>
                <th>Exp. Return Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {so.rgpChallans?.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                    No RGP Challans issued yet. Click "+ Issue RGP Challan" to send material to {so.supplier?.name}.
                  </td>
                </tr>
              ) : (
                so.rgpChallans.map((rgp: any) => {
                  const returned = rgp.returns?.reduce((s: number, r: any) => s + r.received_qty, 0) || 0;
                  const pending = Math.max(0, rgp.sent_qty - returned);

                  return (
                    <tr key={rgp.id}>
                      <td><strong>{rgp.rgp_number}</strong></td>
                      <td>{new Date(rgp.challan_date).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{rgp.sent_qty}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{returned}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{pending}</td>
                      <td>{rgp.expected_return_date ? new Date(rgp.expected_return_date).toLocaleDateString() : '-'}</td>
                      <td><span className={`badge ${rgp.status === 'Closed' ? 'badge-closed' : rgp.status === 'Partially Returned' ? 'badge-partially' : 'badge-open'}`}>{rgp.status}</span></td>
                      <td>
                        <Link href={`/rgp-challans/${rgp.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                          View & Return GRN
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

      {/* Issue RGP Modal */}
      {showRgpModal && (
        <div className="modal-overlay" onClick={() => setShowRgpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Issue Returnable Gate Pass (RGP)</h3>

            {errorMsg && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <div>Vendor: <strong>{so.supplier?.name}</strong></div>
              <div>Max allowable to dispatch: <strong>{so.remaining_to_send}</strong> units</div>
            </div>

            <form onSubmit={handleIssueRgp}>
              <div className="form-group">
                <label>Sent Quantity *</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max={so.remaining_to_send}
                  className="form-control"
                  value={sentQty}
                  onChange={(e) => setSentQty(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Challan Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Expected Return Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRgpModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={issuingRgp || sentQty <= 0 || sentQty > so.remaining_to_send}
                >
                  {issuingRgp ? 'Issuing...' : 'Issue RGP Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
