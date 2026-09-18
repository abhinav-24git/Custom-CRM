"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FeedbackDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Response Form
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState<string>('');
  const [actionOwner, setActionOwner] = useState<string>('Customer Success Lead');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resolution Form
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolving, setResolving] = useState(false);

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`/api/feedbacks/${id}`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data);
        if (data.rating) setRating(data.rating);
        if (data.comments) setComments(data.comments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchFeedback();
  }, [id]);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/feedbacks/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comments,
          action_owner: actionOwner
        })
      });

      if (res.ok) {
        await fetchFeedback();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to submit response');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolveAction = async (actionId: string) => {
    setResolving(true);
    try {
      const res = await fetch(`/api/feedback-actions/${actionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: resolutionNotes })
      });

      if (res.ok) {
        setShowResolveModal(false);
        setResolutionNotes('');
        await fetchFeedback();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to resolve action');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading customer feedback...</div>;
  if (!feedback) return <div style={{ padding: '2rem' }}>Feedback record not found.</div>;

  const isRequested = feedback.status === 'Requested';
  const openAction = feedback.actions?.find((a: any) => a.status === 'Open');

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{feedback.feedback_number}</h1>
            <span className={`badge ${feedback.status === 'Resolved' ? 'badge-closed' : feedback.status === 'Action Open' ? 'badge-partially' : 'badge-open'}`}>
              {feedback.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Customer: <strong>{feedback.customer?.name}</strong> • Dispatch: <Link href={`/dispatches/${feedback.dispatch_id}`} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>{feedback.dispatch?.dispatch_number}</Link>
          </p>
        </div>

        <Link href="/feedbacks" className="btn btn-secondary">
          Back to Feedbacks
        </Link>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Delivery Summary Banner */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Delivery Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Sales Order:</span>
            <div><strong>{feedback.dispatch?.sales_order?.so_number}</strong></div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Dispatch Date:</span>
            <div>{new Date(feedback.dispatch?.dispatch_date).toLocaleDateString()}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Transporter:</span>
            <div>{feedback.dispatch?.transporter || 'Direct Delivery'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Requested On:</span>
            <div>{new Date(feedback.requested_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Record Feedback Response Form */}
      {isRequested ? (
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Record Customer Response</h2>
          <form onSubmit={handleSubmitResponse}>
            <div className="form-group">
              <label><strong>Overall Satisfaction Rating (1 to 5 Stars) *</strong></label>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '0.5rem',
                      border: rating === val ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      background: rating === val ? 'var(--primary-color)' : 'var(--surface-hover)',
                      color: rating === val ? '#fff' : 'inherit',
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ★ {val} {val === 5 ? '(Excellent)' : val === 4 ? '(Good)' : val === 3 ? '(Average)' : val === 2 ? '(Poor)' : '(Critical)'}
                  </button>
                ))}
              </div>
            </div>

            {rating <= 2 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ color: 'var(--danger-color)', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  ⚠️ Low Rating Alert: This rating will automatically generate a high-priority CS Action Ticket.
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Assign CS Action Owner</label>
                  <input
                    type="text"
                    className="form-control"
                    value={actionOwner}
                    onChange={(e) => setActionOwner(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Customer Comments / Feedback Notes</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g. Delivered on time. Packaging quality was great."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <Link href="/feedbacks" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Save Feedback'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {/* Display Recorded Rating */}
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Customer Rating</span>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: feedback.rating >= 4 ? 'var(--success-color)' : feedback.rating === 3 ? 'var(--warning-color)' : 'var(--danger-color)' }}>
                  ★ {feedback.rating} / 5
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Received At</span>
                <div>{feedback.received_at ? new Date(feedback.received_at).toLocaleString() : '-'}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Customer Remarks:</span>
              <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>{feedback.comments || 'No written comments provided.'}</p>
            </div>
          </div>

          {/* Action Tickets Panel */}
          {feedback.actions?.length > 0 && (
            <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Customer Resolution Tickets</h3>

              {feedback.actions.map((act: any) => (
                <div
                  key={act.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    background: act.status === 'Open' ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
                    marginBottom: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div>
                      <strong>Owner: {act.owner}</strong> • Due: {act.due_date ? new Date(act.due_date).toLocaleDateString() : 'Immediate'}
                    </div>
                    <span className={`badge ${act.status === 'Resolved' ? 'badge-closed' : 'badge-partially'}`}>
                      {act.status}
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', whiteSpace: 'pre-line' }}>
                    {act.action_notes}
                  </p>

                  {act.status === 'Open' && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="btn btn-primary"
                      style={{ background: 'var(--success-color)' }}
                    >
                      ✓ Mark Ticket Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && openAction && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Resolve Customer Action Ticket</h3>
            <div className="form-group">
              <label>Resolution Summary / Corrective Notes *</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="e.g. Contacted customer, replaced damaged accessories, customer satisfied."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'var(--success-color)' }}
                disabled={resolving || !resolutionNotes.trim()}
                onClick={() => handleResolveAction(openAction.id)}
              >
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
