"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [enquiry, setEnquiry] = useState<any>(null);
  
  const [showFollowup, setShowFollowup] = useState(false);
  const [fData, setFData] = useState({ followup_date: new Date().toISOString().split('T')[0], outcome: '', next_followup_date: '' });

  const fetchEnquiry = async () => {
    const res = await fetch(`/api/enquiries/${id}`);
    if (res.ok) setEnquiry(await res.json());
  };

  useEffect(() => { if (id) fetchEnquiry(); }, [id]);

  const addFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/enquiries/${id}/followups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fData)
    });
    if (res.ok) { setShowFollowup(false); fetchEnquiry(); setFData({ ...fData, outcome: '', next_followup_date: '' }); }
    else alert((await res.json()).error);
  };

  const createQuotation = async () => {
    if (!confirm('Generate quotation from this enquiry?')) return;
    const res = await fetch(`/api/enquiries/${id}/create-quotation`, { method: 'POST' });
    if (res.ok) {
      const q = await res.json();
      router.push(`/quotations/${q.id}`);
    } else alert((await res.json()).error);
  };

  if (!enquiry) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{enquiry.enquiry_number} <span className="badge badge-open" style={{ marginLeft: '1rem' }}>{enquiry.status}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>{enquiry.customer?.name} • {new Date(enquiry.enquiry_date).toLocaleDateString()}</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={createQuotation}>Create Quotation</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div>
          <h3>Requirements</h3>
          <div className="table-container" style={{ marginTop: '1rem', marginBottom: '2rem' }}>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Target Date</th></tr></thead>
              <tbody>
                {enquiry.items.map((line: any) => (
                  <tr key={line.id}>
                    <td>{line.item?.name}</td>
                    <td>{line.requested_qty}</td>
                    <td>{line.target_date ? new Date(line.target_date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {enquiry.quotations?.length > 0 && (
            <>
              <h3>Linked Quotations</h3>
              <div className="table-container" style={{ marginTop: '1rem' }}>
                <table>
                  <tbody>
                    {enquiry.quotations.map((q: any) => (
                      <tr key={q.id}>
                        <td>{q.quotation_number} (Rev {q.revision_number})</td>
                        <td><Link href={`/quotations/${q.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Follow-ups</h3>
            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => setShowFollowup(true)}>+ Add</button>
          </div>
          
          {showFollowup && (
            <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '0.5rem', marginTop: '1rem', border: '1px solid var(--border-color)' }}>
              <form onSubmit={addFollowup}>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" required className="form-control" value={fData.followup_date} onChange={e => setFData({...fData, followup_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Outcome</label>
                  <textarea required className="form-control" value={fData.outcome} onChange={e => setFData({...fData, outcome: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Next Follow-up</label>
                  <input type="date" className="form-control" value={fData.next_followup_date} onChange={e => setFData({...fData, next_followup_date: e.target.value})} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button type="button" className="btn btn-secondary" style={{ marginRight: '0.5rem' }} onClick={() => setShowFollowup(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {enquiry.followups.map((f: any) => (
              <div key={f.id} style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{new Date(f.followup_date).toLocaleDateString()}</div>
                <p>{f.outcome}</p>
                {f.next_followup_date && <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--primary-color)' }}>Next: {new Date(f.next_followup_date).toLocaleDateString()}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
