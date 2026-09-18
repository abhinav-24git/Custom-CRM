"use client";

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', uom: '', default_rate: '' });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    setShowModal(false);
    setFormData({ name: '', uom: '', default_rate: '' });
    fetchItems();
  };

  return (
    <div>
      <PageHeader
        title="Finished Items"
        subtitle="Catalog of sellable products, units of measure (UOM), and standard baseline prices"
        action={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Item
          </button>
        }
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Unit of Measure (UOM)</th>
              <th style={{ textAlign: 'right' }}>Default Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading finished goods catalog...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No items found. Click "+ New Item" to add one.</td></tr>
            ) : (
              items.map((i: any) => (
                <tr key={i.id}>
                  <td><strong>{i.name}</strong></td>
                  <td>{i.uom}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.default_rate !== null ? `₹${i.default_rate.toFixed(2)}` : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Add New Item</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>UOM (Unit of Measure) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nos, Kg, Set"
                  className="form-control"
                  value={formData.uom}
                  onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Default Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={formData.default_rate}
                  onChange={(e) => setFormData({ ...formData, default_rate: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
