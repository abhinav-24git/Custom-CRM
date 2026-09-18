"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PODetailPage() {
  const { id } = useParams();
  const [po, setPo] = useState<any>(null);
  const [showGRN, setShowGRN] = useState(false);
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [challan, setChallan] = useState('');
  const [grnLines, setGrnLines] = useState<any[]>([]);

  const fetchPO = async () => {
    const res = await fetch(`/api/purchase-orders/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPo(data);
      setGrnLines(
        data.lines
          .filter((l: any) => l.pending_qty > 0.0001)
          .map((l: any) => ({ purchase_order_item_id: l.id, material: l.material?.name, pending_qty: l.pending_qty, received_qty: '', accepted_qty: '', rejected_qty: '', remarks: '' }))
      );
    }
  };

  useEffect(() => { if (id) fetchPO(); }, [id]);

  const submitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    const linesToSubmit = grnLines.filter(l => parseFloat(l.received_qty) > 0);
    if (!linesToSubmit.length) { alert('Enter at least one received quantity'); return; }

    const res = await fetch('/api/grns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase_order_id: id, grn_date: grnDate, supplier_challan_ref: challan, lines: linesToSubmit })
    });
    if (res.ok) { setShowGRN(false); fetchPO(); }
    else alert((await res.json()).error);
  };

  if (!po) return <div>Loading...</div>;

  const statusColors: Record<string, string> = { Issued: 'badge badge-open', 'Partially Received': 'badge badge-partially', Closed: 'badge badge-closed' };
  const hasPending = po.lines?.some((l: any) => l.pending_qty > 0.0001);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{po.po_number} <span className={statusColors[po.status] || 'badge'}>{po.status}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>{po.supplier?.name} • {new Date(po.po_date).toLocaleDateString()}</p>
          {po.purchase_rfq_id && <p style={{ marginTop: '0.25rem' }}><Link href={`/purchase-rfqs/${po.purchase_rfq_id}`} style={{ color: 'var(--primary-color)', fontSize: '0.875rem' }}>← View Source RFQ</Link></p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ color: 'var(--primary-color)' }}>₹{po.total_amount.toFixed(2)}</h2>
          {hasPending && <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => setShowGRN(true)}>Record GRN</button>}
        </div>
      </div>

      <h3>Line Items</h3>
      <div className="table-container" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        <table>
          <thead><tr><th>Material</th><th style={{ textAlign: 'right' }}>Ordered</th><th style={{ textAlign: 'right' }}>Received</th><th style={{ textAlign: 'right' }}>Pending</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {po.lines?.map((line: any) => (
              <tr key={line.id}>
                <td>{line.material?.name}</td>
                <td style={{ textAlign: 'right' }}>{line.ordered_qty}</td>
                <td style={{ textAlign: 'right', color: 'var(--success-color)' }}>{line.received_qty}</td>
                <td style={{ textAlign: 'right', color: line.pending_qty > 0 ? 'var(--warning-color)' : '' }}>{line.pending_qty.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>₹{line.rate.toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{line.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>GRN History</h3>
      <div className="table-container" style={{ marginTop: '1rem' }}>
        {po.GRNs?.length === 0 ? <p style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No GRNs recorded yet</p> : po.GRNs?.map((grn: any) => (
          <div key={grn.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{grn.grn_number} — {new Date(grn.grn_date).toLocaleDateString()} {grn.supplier_challan_ref && `(Challan: ${grn.supplier_challan_ref})`}</div>
            <table style={{ width: '100%' }}>
              <thead><tr><th>Material</th><th>Received</th><th style={{ color: 'var(--success-color)' }}>Accepted</th><th style={{ color: 'var(--danger-color)' }}>Rejected</th></tr></thead>
              <tbody>
                {grn.items?.map((gi: any) => (
                  <tr key={gi.id}><td>{gi.purchase_order_item?.material?.name}</td><td>{gi.received_qty}</td><td style={{ color: 'var(--success-color)' }}>{gi.accepted_qty}</td><td style={{ color: 'var(--danger-color)' }}>{gi.rejected_qty}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {showGRN && (
        <div className="modal-overlay" onClick={() => setShowGRN(false)}>
          <div className="modal-content" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <h3>Record Goods Receipt Note</h3>
            <form onSubmit={submitGRN}>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}><label>GRN Date</label><input type="date" className="form-control" value={grnDate} onChange={e => setGrnDate(e.target.value)} /></div>
                <div className="form-group" style={{ flex: 1 }}><label>Supplier Challan Ref</label><input className="form-control" value={challan} onChange={e => setChallan(e.target.value)} /></div>
              </div>
              <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>Material</th>
                    <th style={{ padding: '0.5rem' }}>Pending</th>
                    <th style={{ padding: '0.5rem' }}>Received</th>
                    <th style={{ padding: '0.5rem' }}>Accepted</th>
                    <th style={{ padding: '0.5rem' }}>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {grnLines.map((line, idx) => {
                    const rec = parseFloat(line.received_qty) || 0;
                    const acc = parseFloat(line.accepted_qty) || 0;
                    const rej = parseFloat(line.rejected_qty) || 0;
                    const valid = Math.abs((acc + rej) - rec) < 0.001;
                    return (
                      <tr key={idx}>
                        <td style={{ padding: '0.5rem' }}>{line.material}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--warning-color)' }}>{line.pending_qty.toFixed(2)}</td>
                        <td style={{ padding: '0.25rem' }}><input type="number" min="0" step="0.01" max={line.pending_qty} className="form-control" value={line.received_qty} onChange={e => { const n = [...grnLines]; n[idx].received_qty = e.target.value; setGrnLines(n); }} /></td>
                        <td style={{ padding: '0.25rem' }}><input type="number" min="0" step="0.01" className="form-control" value={line.accepted_qty} onChange={e => { const n = [...grnLines]; n[idx].accepted_qty = e.target.value; setGrnLines(n); }} /></td>
                        <td style={{ padding: '0.25rem' }}>
                          <input type="number" min="0" step="0.01" className="form-control" value={line.rejected_qty} onChange={e => { const n = [...grnLines]; n[idx].rejected_qty = e.target.value; setGrnLines(n); }}
                            style={{ borderColor: rec > 0 && !valid ? 'var(--danger-color)' : '' }} />
                          {rec > 0 && !valid && <div style={{ fontSize: '0.7rem', color: 'var(--danger-color)' }}>Must = {rec - acc}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGRN(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post GRN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
