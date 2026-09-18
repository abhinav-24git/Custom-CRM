"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEnquiryPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [enquiryDate, setEnquiryDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<any[]>([{ item_id: '', requested_qty: 1, target_date: '', notes: '' }]);
  
  useEffect(() => {
    Promise.all([fetch('/api/customers').then(r => r.json()), fetch('/api/items').then(r => r.json())])
      .then(([custData, itemData]) => { setCustomers(custData); setItems(itemData); });
  }, []);

  const addLine = () => setLines([...lines, { item_id: '', requested_qty: 1, target_date: '', notes: '' }]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId, enquiry_date: enquiryDate, source, notes,
        items: lines.filter(l => l.item_id)
      })
    });
    if (res.ok) router.push('/enquiries');
    else alert((await res.json()).error);
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header"><h1>Create Enquiry</h1></div>
      <form onSubmit={handleSubmit}>
        <div className="table-container" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Customer *</label>
              <select required className="form-control" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date *</label>
              <input required type="date" className="form-control" value={enquiryDate} onChange={e => setEnquiryDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Source</label>
              <input className="form-control" value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Website" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Notes</label>
            <textarea className="form-control" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <h3>Requirements</h3>
        <div className="table-container" style={{ marginTop: '1rem', overflow: 'visible' }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: '100px' }}>Qty</th>
                <th style={{ width: '150px' }}>Target Date</th>
                <th>Notes</th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    <select required className="form-control" value={line.item_id} onChange={e => { const n = [...lines]; n[index].item_id = e.target.value; setLines(n); }}>
                      <option value="">-- Select Item --</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </td>
                  <td><input required type="number" min="1" className="form-control" value={line.requested_qty} onChange={e => { const n = [...lines]; n[index].requested_qty = e.target.value; setLines(n); }} /></td>
                  <td><input type="date" className="form-control" value={line.target_date} onChange={e => { const n = [...lines]; n[index].target_date = e.target.value; setLines(n); }} /></td>
                  <td><input className="form-control" value={line.notes} onChange={e => { const n = [...lines]; n[index].notes = e.target.value; setLines(n); }} /></td>
                  <td><button type="button" className="btn btn-danger" style={{ padding: '0.5rem' }} onClick={() => removeLine(index)} disabled={lines.length === 1}>✕</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={5}><button type="button" className="btn btn-secondary" onClick={addLine}>+ Add Row</button></td></tr></tfoot>
          </table>
        </div>
        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>Save Enquiry</button>
        </div>
      </form>
    </div>
  );
}
