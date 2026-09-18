"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MRDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [mr, setMr] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [selectedShortageLines, setSelectedShortageLines] = useState<Set<string>>(new Set());
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [showRFQModal, setShowRFQModal] = useState(false);

  const fetchData = async () => {
    const [mrRes, matRes, supRes] = await Promise.all([
      fetch(`/api/material-requirements/${id}`),
      fetch('/api/materials'),
      fetch('/api/suppliers')
    ]);
    if (mrRes.ok && matRes.ok) {
      const mrData = await mrRes.json();
      setMr(mrData);
      setMaterials(await matRes.json());
      setLines(mrData.items.length > 0 ? mrData.items.map((i: any) => ({ ...i })) : [{ material_id: '', required_qty: 1, notes: '' }]);
    }
    if (supRes.ok) setSuppliers(await supRes.json());
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const toggleShortage = (lineId: string) => {
    const next = new Set(selectedShortageLines);
    if (next.has(lineId)) next.delete(lineId); else next.add(lineId);
    setSelectedShortageLines(next);
  };

  const raiseRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShortageLines.size || !selectedSuppliers.length) { alert('Select shortage lines and at least one supplier'); return; }
    const res = await fetch('/api/purchase-rfqs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material_requirement_id: id, mr_line_ids: Array.from(selectedShortageLines), supplier_ids: selectedSuppliers })
    });
    if (res.ok) { const rfq = await res.json(); router.push(`/purchase-rfqs/${rfq.id}`); }
    else alert((await res.json()).error);
  };

  const addLine = () => setLines([...lines, { material_id: '', required_qty: 1, notes: '' }]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const saveLines = async () => {
    const res = await fetch(`/api/material-requirements/${id}/lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines: lines.filter(l => l.material_id) })
    });
    if (res.ok) fetchData();
    else alert((await res.json()).error);
  };

  const action = async (act: string, lineId?: string) => {
    const url = lineId 
      ? `/api/material-requirements/${id}/lines/${lineId}/check-stock`
      : `/api/material-requirements/${id}/${act}`;
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) fetchData();
    else alert((await res.json()).error);
  };

  if (!mr) return <div>Loading...</div>;

  const isLocked = mr.status === 'Approved';
  const totalShort = mr.items.filter((i: any) => i.shortage_qty > 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{mr.mr_number} <span className="badge">{mr.status}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            For <Link href={`/sales-orders/${mr.sales_order_id}`} style={{ color: 'var(--primary-color)' }}>{mr.sales_order?.so_number}</Link> • {mr.sales_order?.customer?.name}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {totalShort === 0 && mr.items.length > 0 ? (
             <div style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>All stock available</div>
          ) : (
             <div style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{totalShort} items short</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => action('check-all-stock')}>Check All Stock</button>
        {mr.status === 'Draft' && <button className="btn btn-primary" onClick={() => action('mark-checked')}>Mark Checked</button>}
        {mr.status === 'Checked' && <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={() => action('approve')}>Approve (Lock)</button>}
        {selectedShortageLines.size > 0 && (
          <button className="btn btn-primary" style={{ background: 'var(--warning-color)', color: '#000' }} onClick={() => setShowRFQModal(true)}>
            Raise RFQ ({selectedShortageLines.size} line{selectedShortageLines.size > 1 ? 's' : ''})
          </button>
        )}
      </div>

      <div className="table-container" style={{ overflow: 'visible' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Material</th>
              <th style={{ width: '120px' }}>Required Qty</th>
              <th style={{ width: '120px' }}>Available Qty</th>
              <th style={{ width: '120px' }}>Shortage Qty</th>
              <th>Notes</th>
              <th style={{ width: '100px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} style={{ background: line.shortage_qty > 0 ? 'rgba(239, 68, 68, 0.05)' : '' }}>
                <td style={{ textAlign: 'center' }}>
                  {line.id && line.shortage_qty > 0 && (
                    <input type="checkbox" checked={selectedShortageLines.has(line.id)}
                      onChange={() => toggleShortage(line.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  )}
                </td>
                <td>
                  <select disabled={isLocked} required className="form-control" value={line.material_id} onChange={e => { const n = [...lines]; n[index].material_id = e.target.value; setLines(n); }}>
                    <option value="">-- Select --</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </td>
                <td><input disabled={isLocked} type="number" min="1" className="form-control" value={line.required_qty} onChange={e => { const n = [...lines]; n[index].required_qty = e.target.value; setLines(n); }} /></td>
                <td><input disabled type="number" className="form-control" value={line.available_qty || 0} /></td>
                <td>
                  <input disabled type="number" className="form-control" value={line.shortage_qty || 0}
                    style={{ color: line.shortage_qty > 0 ? 'var(--danger-color)' : '', fontWeight: line.shortage_qty > 0 ? 'bold' : 'normal' }} />
                </td>
                <td><input disabled={isLocked} className="form-control" value={line.notes || ''} onChange={e => { const n = [...lines]; n[index].notes = e.target.value; setLines(n); }} /></td>
                <td>
                  {!isLocked && <button type="button" className="btn btn-danger" style={{ padding: '0.4rem 0.5rem', marginRight: '0.2rem' }} onClick={() => removeLine(index)} disabled={lines.length === 1}>✕</button>}
                  {line.id && <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem 0.5rem' }} onClick={() => action('check-stock', line.id)}>↻</button>}
                </td>
              </tr>
            ))}
          </tbody>
          {!isLocked && (
            <tfoot>
              <tr>
                <td colSpan={6}>
                  <button type="button" className="btn btn-secondary" onClick={addLine}>+ Add Row</button>
                  <button type="button" className="btn btn-primary" style={{ marginLeft: '1rem' }} onClick={saveLines}>Save Lines</button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showRFQModal && (
        <div className="modal-overlay" onClick={() => setShowRFQModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Raise Purchase RFQ</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>{selectedShortageLines.size} shortage line(s) selected. Choose suppliers to send this RFQ to:</p>
            <form onSubmit={raiseRFQ}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                {suppliers.map(s => (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedSuppliers.includes(s.id)}
                      onChange={() => setSelectedSuppliers(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])} />
                    <span>{s.name}</span>
                  </label>
                ))}
                {suppliers.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No suppliers found. Add suppliers first.</p>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRFQModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!selectedSuppliers.length}>Create RFQ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
