"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/enquiries')
      .then(r => r.json())
      .then(data => {
        setEnquiries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle="Manage inbound customer requirements, source channels, and quotation readiness"
        action={
          <Link href="/enquiries/new" className="btn btn-primary">
            + New Enquiry
          </Link>
        }
      />

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Enquiry Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading enquiries...</td></tr>
            ) : enquiries.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No enquiries found.</td></tr>
            ) : (
              enquiries.map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/enquiries/${e.id}`} className="table-link">
                      {e.enquiry_number}
                    </Link>
                  </td>
                  <td>{new Date(e.enquiry_date).toLocaleDateString()}</td>
                  <td>{e.customer?.name}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td>
                    <Link href={`/enquiries/${e.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                      Open
                    </Link>
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
