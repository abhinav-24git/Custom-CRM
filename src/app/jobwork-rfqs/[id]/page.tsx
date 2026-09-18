"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JobWorkRFQDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal for quote submission
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSupplierId, setQuoteSupplierId] = useState('');
  const [quoteRate, setQuoteRate] = useState<number>(0);
  const [quoteLeadTime, setQuoteLeadTime] = useState<number>(0);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Generate Service Order modal/state
  const [generatingSo, setGeneratingSo] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRFQ = async () => {
    try {
      const res = await fetch(`/api/jobwork-rfqs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRfq(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchRFQ();
  }, [id]);

  const handleSend = async () => {
    try {
      const res = await fetch(`/api/jobwork-rfqs/${id}/send`, { method: 'POST' });
      if (res.ok) {
        await fetchRFQ();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send RFQ');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!quoteSupplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }

    if (quoteRate <= 0) {
      setErrorMsg('Rate must be greater than 0');
      return;
    }

    setSubmittingQuote(true);
    try {
      const res = await fetch(`/api/jobwork-rfqs/${id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: quoteSupplierId,
          rate: quoteRate,
          lead_time_days: quoteLeadTime || null
        })
      });

      if (res.ok) {
        setShowQuoteModal(false);
        setQuoteRate(0);
        setQuoteLeadTime(0);
        await fetchRFQ();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to submit quote');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleSelectQuote = async (quoteId: string) => {
    try {
      const res = await fetch(`/api/jobwork-rfqs/${id}/select-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId })
      });

      if (res.ok) {
        await fetchRFQ();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to select quote');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    }
  };

  const handleGenerateServiceOrder = async () => {
    if (!confirm('Generate Service Order for the selected winning quote?')) return;

    setGeneratingSo(true);
    try {
      const res = await fetch(`/api/jobwork-rfqs/${id}/service-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_date: expectedDate || null
        })
      });

      if (res.ok) {
        const so = await res.json();
        router.push(`/service-orders/${so.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to generate Service Order');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setGeneratingSo(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading RFQ...</div>;
  if (!rfq) return <div style={{ padding: '2rem' }}>Job Work RFQ not found.</div>;

  const selectedQuote = rfq.quotes?.find((q: any) => q.is_selected);
  const invitedSupplierIds = rfq.suppliers?.map((s: any) => s.supplier_id) || [];
  const quotedSupplierIds = rfq.quotes?.map((q: any) => q.supplier_id) || [];
  const pendingSupplierIds = invitedSupplierIds.filter((id: string) => !quotedSupplierIds.includes(id));

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{rfq.rfq_number}</h1>
            <span className={`badge ${rfq.status === 'Closed' ? 'badge-closed' : rfq.status === 'Compared' || rfq.status === 'Quotes Received' ? 'badge-partially' : 'badge-open'}`}>
              {rfq.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Process: <strong>{rfq.process}</strong> • Item: <strong>{rfq.planning?.sales_order_item?.item?.name}</strong> • Customer: <strong>{rfq.planning?.sales_order_item?.sales_order?.customer?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/jobwork-rfqs" className="btn btn-secondary">
            Back to RFQs
          </Link>
          {rfq.status === 'Draft' && (
            <button onClick={handleSend} className="btn btn-primary">
              Mark as Sent
            </button>
          )}
          {rfq.status !== 'Closed' && pendingSupplierIds.length > 0 && (
            <button onClick={() => setShowQuoteModal(true)} className="btn btn-primary">
              + Enter Supplier Quote
            </button>
          )}
          {selectedQuote && rfq.status !== 'Closed' && (
            <button
              onClick={handleGenerateServiceOrder}
              disabled={generatingSo}
              className="btn btn-primary"
              style={{ background: 'var(--success-color)' }}
            >
              {generatingSo ? 'Generating...' : 'Generate Service Order'}
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Process / Operation</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{rfq.process}</div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Job Work Quantity</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning-color)' }}>{rfq.qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>units</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Material Responsibility</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{rfq.material_responsibility} ({rfq.material_responsibility === 'Company' ? 'RGP Sent' : 'Vendor Supplied'})</div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Required By Date</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{rfq.required_date ? new Date(rfq.required_date).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>

      {/* Quotes Comparison Matrix */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2>Supplier Quotes & Comparison Matrix</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Select the preferred vendor quote to generate the official Service Order</p>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Supplier</th>
                <th style={{ textAlign: 'right' }}>Rate / Unit</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
                <th style={{ textAlign: 'right' }}>Lead Time</th>
                <th>Quote Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rfq.quotes?.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No quotes received yet. Click "+ Enter Supplier Quote" to record vendor pricing.
                  </td>
                </tr>
              ) : (
                rfq.quotes.map((quote: any) => (
                  <tr
                    key={quote.id}
                    style={{
                      background: quote.is_selected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      fontWeight: quote.is_selected ? 600 : 'normal'
                    }}
                  >
                    <td>
                      {rfq.status !== 'Closed' ? (
                        <input
                          type="radio"
                          name="selected_quote"
                          checked={quote.is_selected}
                          onChange={() => handleSelectQuote(quote.id)}
                          style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                        />
                      ) : quote.is_selected ? (
                        <span className="badge badge-closed">Selected</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <strong>{quote.supplier?.name}</strong>
                      {quote.supplier?.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{quote.supplier.phone}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${quote.rate.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>${quote.amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{quote.lead_time_days ? `${quote.lead_time_days} days` : 'N/A'}</td>
                    <td>{new Date(quote.quote_date).toLocaleDateString()}</td>
                    <td>
                      {quote.is_selected ? (
                        <span className="badge badge-closed">Winning Quote</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Submitted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated Service Orders */}
      {rfq.ServiceOrders?.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>Generated Service Orders</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Service Order No</th>
                  <th>Supplier</th>
                  <th>Process</th>
                  <th style={{ textAlign: 'right' }}>Ordered Qty</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rfq.ServiceOrders.map((so: any) => (
                  <tr key={so.id}>
                    <td><strong>{so.service_order_number}</strong></td>
                    <td>{so.supplier?.name}</td>
                    <td>{so.process}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{so.ordered_qty}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${so.amount.toFixed(2)}</td>
                    <td><span className="badge badge-open">{so.status}</span></td>
                    <td>
                      <Link href={`/service-orders/${so.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                        Open Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {showQuoteModal && (
        <div className="modal-overlay" onClick={() => setShowQuoteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Record Supplier Quote</h3>

            {errorMsg && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddQuote}>
              <div className="form-group">
                <label>Select Supplier *</label>
                <select
                  className="form-control"
                  value={quoteSupplierId}
                  onChange={(e) => setQuoteSupplierId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Supplier --</option>
                  {rfq.suppliers?.map((s: any) => {
                    const alreadyQuoted = quotedSupplierIds.includes(s.supplier_id);
                    return (
                      <option key={s.supplier_id} value={s.supplier_id} disabled={alreadyQuoted}>
                        {s.supplier?.name} {alreadyQuoted ? '(Quote Already Logged)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Rate / Unit ($) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-control"
                    value={quoteRate}
                    onChange={(e) => setQuoteRate(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={quoteLeadTime}
                    onChange={(e) => setQuoteLeadTime(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                Total calculated: <strong>${((quoteRate || 0) * rfq.qty).toFixed(2)}</strong> for {rfq.qty} units
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuoteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingQuote}>
                  {submittingQuote ? 'Saving...' : 'Submit Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
