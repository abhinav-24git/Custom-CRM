"use client";

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '' });

  const fetchSuppliers = () => {
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(data => {
        setSuppliers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', contact_person: '', phone: '', email: '' });
      fetchSuppliers();
    } else {
      alert((await res.json()).error);
    }
  };

  return (
    <div>
      <PageHeader
        title="Supplier Masters"
        subtitle="Maintain approved raw material vendors, subcontract job work processors, and contacts"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Add Supplier
          </button>
        }
      />

      {showForm && (
        <div style={{ background: 'var(--surface-color)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Add New Supplier</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group"><label>Supplier Name *</label><input required className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>Contact Person</label><input className="form-control" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Supplier</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Supplier Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading supplier masters...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No suppliers found. Click "+ Add Supplier" to add one.</td></tr>
            ) : (
              suppliers.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.contact_person || '-'}</td>
                  <td>{s.phone || '-'}</td>
                  <td>{s.email || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
