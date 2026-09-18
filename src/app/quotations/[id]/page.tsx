"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [q, setQ] = useState<any>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const fetchQ = async () => {
    const res = await fetch(`/api/quotations/${id}`);
    if (res.ok) setQ(await res.json());
  };

  useEffect(() => { if (id) fetchQ(); }, [id]);

  const action = async (actionName: string, payload = {}) => {
    const res = await fetch(`/api/quotations/${id}/${actionName}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (res.ok) {
      if (actionName === 'revision') {
        const newRev = await res.json();
        router.push(`/quotations/${newRev.id}`);
      } else {
        setShowReject(false);
        fetchQ();
      }
    } else alert((await res.json()).error);
  };

  const convertToSO = async () => {
    const res = await fetch(`/api/quotations/${id}/convert-to-sales-order`, { method: 'POST' });
    if (res.ok) {
      const so = await res.json();
      router.push(`/sales-orders/${so.id}`);
    } else alert((await res.json()).error);
  };

  if (!q) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{q.quotation_number} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>(Rev {q.revision_number})</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>{q.customer?.name} • {new Date(q.quotation_date).toLocaleDateString()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '0.5rem' }}><span className="badge badge-open">{q.status}</span></div>
          <h2 style={{ color: 'var(--primary-color)' }}>₹{q.total_amount.toFixed(2)}</h2>
        </div>
      </div>

      {!q.is_latest_revision && (
        <div style={{ background: 'var(--warning-color)', color: '#fff', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <strong>Read Only:</strong> This is a past revision and cannot be edited or converted.
        </div>
      )}

      {q.is_latest_revision && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {q.status === 'Draft' && <button className="btn btn-primary" onClick={() => action('submit')}>Submit for Approval</button>}
          {q.status === 'Pending Approval' && <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={() => action('approve')}>Approve</button>}
          {q.status === 'Approved' && <button className="btn btn-primary" onClick={() => action('send')}>Mark as Sent</button>}
          {['Sent', 'Approved'].includes(q.status) && <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={() => action('accept')}>Accept</button>}
          
          {['Pending Approval', 'Sent'].includes(q.status) && <button className="btn btn-danger" onClick={() => setShowReject(true)}>Reject</button>}
          
          {q.status !== 'Draft' && <button className="btn btn-secondary" onClick={() => action('revision')}>Create Revision</button>}
          
          {q.status === 'Accepted' && <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={convertToSO}>Convert to Sales Order</button>}
        </div>
      )}

      {q.rejection_reason && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <strong style={{ color: 'var(--danger-color)' }}>Rejected:</strong> {q.rejection_reason}
        </div>
      )}

      <h3>Line Items</h3>
      <div className="table-container" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>Discount</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {q.lines.map((line: any) => (
              <tr key={line.id}>
                <td>{line.item?.name}</td>
                <td style={{ textAlign: 'right' }}>{line.qty}</td>
                <td style={{ textAlign: 'right' }}>₹{line.rate.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>₹{line.discount.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{line.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {q.revisionHistory?.length > 1 && (
        <>
          <h3>Revision History</h3>
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table>
              <thead><tr><th>Revision</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {q.revisionHistory.map((rev: any) => (
                  <tr key={rev.id}>
                    <td>Rev {rev.revision_number} {rev.is_latest_revision ? '(Current)' : ''}</td>
                    <td>{new Date(rev.createdAt).toLocaleString()}</td>
                    <td>{rev.status}</td>
                    <td>₹{rev.total_amount.toFixed(2)}</td>
                    <td>
                      {!rev.is_latest_revision && <Link href={`/quotations/${rev.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>View</Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showReject && (
        <div className="modal-overlay" onClick={() => setShowReject(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Reject Quotation</h3>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Reason *</label>
              <textarea required className="form-control" value={rejectComment} onChange={e => setRejectComment(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => action('reject', { comment: rejectComment })}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
