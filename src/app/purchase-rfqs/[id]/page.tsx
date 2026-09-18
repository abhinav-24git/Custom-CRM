"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RFQDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rfq, setRfq] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quoteSupplier, setQuoteSupplier] = useState('');
  const [quoteLines, setQuoteLines] = useState<any[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const fetchRFQ = async () => {
    const [rfqRes, supRes] = await Promise.all([fetch(`/api/purchase-rfqs/${id}`), fetch('/api/suppliers')]);
    if (rfqRes.ok) { const data = await rfqRes.json(); setRfq(data); setQuoteLines(data.items?.map((i: any) => ({ purchase_rfq_item_id: i.id, rate: '', lead_time_days: '' })) || []); }
    if (supRes.ok) setSuppliers(await supRes.json());
  };

  useEffect(() => { if (id) fetchRFQ(); }, [id]);

  const action = async (actionName: string, payload: any = {}) => {
    const res = await fetch(`/api/purchase-rfqs/${id}/${actionName}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (res.ok) { fetchRFQ(); return res.json(); }
    else { alert((await res.json()).error); return null; }
  };

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await action('submit-quote', { supplier_id: quoteSupplier, lines: quoteLines });
    if (ok) setShowQuoteForm(false);
  };

  const generatePO = async () => {
    const result = await action('generate-po');
    if (result && result.length > 0) router.push(`/purchase-orders/${result[0].id}`);
  };

  if (!rfq) return <div>Loading...</div>;

  // Build comparison matrix: rfqItem -> supplier -> quoteItem
  const comparisonMatrix: Record<string, any[]> = {};
  for (const item of rfq.items || []) {
    comparisonMatrix[item.id] = [];
    for (const quote of rfq.SupplierQuotes || []) {
      const qi = quote.items?.find((qi: any) => qi.purchase_rfq_item_id === item.id);
      comparisonMatrix[item.id].push({ supplier: quote.supplier, quoteItem: qi || null });
    }
  }

  const allLinesSelected = rfq.items?.length > 0 && rfq.items.every((item: any) =>
    rfq.SupplierQuotes?.some((q: any) => q.items?.some((qi: any) => qi.purchase_rfq_item_id === item.id && qi.is_selected))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{rfq.rfq_number} <span className="badge">{rfq.status}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>MR: {rfq.material_requirement?.mr_number}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {rfq.status === 'Draft' && <button className="btn btn-secondary" onClick={() => action('mark-sent')}>Mark Sent</button>}
          {rfq.PurchaseOrders?.length === 0 && allLinesSelected && <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={generatePO}>Generate PO</button>}
          {rfq.PurchaseOrders?.length > 0 && <Link href={`/purchase-orders/${rfq.PurchaseOrders[0].id}`} className="btn btn-secondary">View PO</Link>}
          <button className="btn btn-primary" onClick={() => setShowQuoteForm(true)}>Enter Supplier Quote</button>
        </div>
      </div>

      {/* Comparison Matrix */}
      <h3>Quote Comparison</h3>
      <div className="table-container" style={{ marginTop: '1rem', marginBottom: '2rem', overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Required Qty</th>
              {rfq.SupplierQuotes?.map((q: any) => <th key={q.id} style={{ textAlign: 'center' }}>{q.supplier?.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rfq.items?.map((item: any) => {
              const cols = comparisonMatrix[item.id] || [];
              const amounts = cols.filter(c => c.quoteItem).map(c => c.quoteItem.amount);
              const minAmount = amounts.length ? Math.min(...amounts) : null;
              return (
                <tr key={item.id}>
                  <td>{item.material?.name}</td>
                  <td>{item.required_qty}</td>
                  {cols.map((col, i) => {
                    const qi = col.quoteItem;
                    const isLowest = qi && qi.amount === minAmount;
                    const isSelected = qi?.is_selected;
                    return (
                      <td key={i} style={{ textAlign: 'center', background: isSelected ? 'rgba(16, 185, 129, 0.15)' : isLowest ? 'rgba(245, 158, 11, 0.1)' : '' }}>
                        {qi ? (
                          <div>
                            <div style={{ fontWeight: 'bold' }}>₹{qi.rate} {isLowest && !isSelected && <span style={{ color: 'var(--warning-color)', fontSize: '0.75rem' }}>★ Lowest</span>}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{qi.lead_time_days ? `${qi.lead_time_days}d` : '-'} | ₹{qi.amount.toFixed(2)}</div>
                            {rfq.PurchaseOrders?.length === 0 && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', marginTop: '0.25rem', background: isSelected ? 'var(--success-color)' : '' }}
                                onClick={() => action('select-quote', { purchase_rfq_item_id: item.id, supplier_quote_item_id: qi.id })}
                              >
                                {isSelected ? '✓ Selected' : 'Select'}
                              </button>
                            )}
                          </div>
                        ) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quote Entry Form */}
      {showQuoteForm && (
        <div className="modal-overlay" onClick={() => setShowQuoteForm(false)}>
          <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <h3>Enter Supplier Quote</h3>
            <form onSubmit={submitQuote}>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Supplier *</label>
                <select required className="form-control" value={quoteSupplier} onChange={e => setQuoteSupplier(e.target.value)}>
                  <option value="">-- Select Supplier --</option>
                  {rfq.suppliers?.map((s: any) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier?.name}</option>)}
                </select>
              </div>
              <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                <thead><tr><th style={{ textAlign: 'left', padding: '0.5rem' }}>Material</th><th style={{ padding: '0.5rem' }}>Req Qty</th><th style={{ padding: '0.5rem' }}>Rate *</th><th style={{ padding: '0.5rem' }}>Lead Days</th></tr></thead>
                <tbody>
                  {rfq.items?.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      <td style={{ padding: '0.5rem' }}>{item.material?.name}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>{item.required_qty}</td>
                      <td style={{ padding: '0.5rem' }}><input required type="number" min="0" step="0.01" className="form-control" value={quoteLines[idx]?.rate || ''} onChange={e => { const n = [...quoteLines]; n[idx].rate = e.target.value; setQuoteLines(n); }} /></td>
                      <td style={{ padding: '0.5rem' }}><input type="number" min="0" className="form-control" value={quoteLines[idx]?.lead_time_days || ''} onChange={e => { const n = [...quoteLines]; n[idx].lead_time_days = e.target.value; setQuoteLines(n); }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuoteForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Quote</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
