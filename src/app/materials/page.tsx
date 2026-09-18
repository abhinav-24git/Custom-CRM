"use client";

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', uom: '', available_stock: 0 });

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/materials');
      if (res.ok) setMaterials(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ name: '', uom: '', available_stock: 0 });
      fetchMaterials();
    } else {
      alert((await res.json()).error);
    }
  };

  return (
    <div>
      <PageHeader
        title="Raw Materials & Components"
        subtitle="Maintain bill-of-materials raw goods, inventory tracking, and warehouse available quantities"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Material
          </button>
        }
      />

      {showForm && (
        <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Material</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '2 1 200px', marginBottom: 0 }}>
              <label>Material Name *</label>
              <input required className="form-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label>Unit of Measure *</label>
              <input required className="form-control" value={formData.uom} onChange={e => setFormData({...formData, uom: e.target.value})} />
            </div>
            <div className="form-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
              <label>Initial Stock</label>
              <input type="number" required className="form-control" value={formData.available_stock} onChange={e => setFormData({...formData, available_stock: parseFloat(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Material</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Material Name</th>
              <th>Unit of Measure (UOM)</th>
              <th style={{ textAlign: 'right' }}>Available Stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading materials master...</td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No materials found. Click "+ Add Material" to add one.</td></tr>
            ) : (
              materials.map((m: any) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.uom}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: m.available_stock > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                    {m.available_stock}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
