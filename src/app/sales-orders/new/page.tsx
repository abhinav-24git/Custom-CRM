"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState<any[]>([{ item_id: '', ordered_qty: 1, rate: 0 }]);
  
  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/items').then(r => r.json())
    ]).then(([custData, itemData]) => {
      setCustomers(custData);
      setItems(itemData);
    });
  }, []);

  const handleItemChange = (index: number, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    const newLines = [...lines];
    newLines[index].item_id = itemId;
    newLines[index].rate = item?.default_rate || 0;
    setLines(newLines);
  };

  const addLine = () => setLines([...lines, { item_id: '', ordered_qty: 1, rate: 0 }]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const totalAmount = lines.reduce((sum, line) => sum + (line.ordered_qty * line.rate), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/sales-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: customerId,
        order_date: orderDate,
        lines: lines.filter(l => l.item_id)
      })
    });
    if (res.ok) {
      router.push('/sales-orders');
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <h1>Create Sales Order</h1>
      </div>

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
              <label>Order Date *</label>
              <input required type="date" className="form-control" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            </div>
          </div>
        </div>

        <h3>Line Items</h3>
        <div className="table-container" style={{ marginTop: '1rem', overflow: 'visible' }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: '120px' }}>Qty</th>
                <th style={{ width: '150px' }}>Rate</th>
                <th style={{ width: '150px' }}>Amount</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td>
                    <select required className="form-control" value={line.item_id} onChange={e => handleItemChange(index, e.target.value)}>
                      <option value="">-- Select Item --</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.uom})</option>)}
                    </select>
                  </td>
                  <td>
                    <input required type="number" min="1" step="0.01" className="form-control" value={line.ordered_qty} onChange={e => {
                      const newLines = [...lines]; newLines[index].ordered_qty = parseFloat(e.target.value) || 0; setLines(newLines);
                    }} />
                  </td>
                  <td>
                    <input required type="number" min="0" step="0.01" className="form-control" value={line.rate} onChange={e => {
                      const newLines = [...lines]; newLines[index].rate = parseFloat(e.target.value) || 0; setLines(newLines);
                    }} />
                  </td>
                  <td>
                    <div style={{ padding: '0.625rem', color: 'var(--text-secondary)' }}>
                      ${(line.ordered_qty * line.rate).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <button type="button" className="btn btn-danger" style={{ padding: '0.5rem' }} onClick={() => removeLine(index)} disabled={lines.length === 1}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  <button type="button" className="btn btn-secondary" onClick={addLine}>+ Add Row</button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
          <h2>Total: ${totalAmount.toFixed(2)}</h2>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1.125rem' }}>Save Order</button>
        </div>
      </form>
    </div>
  );
}
