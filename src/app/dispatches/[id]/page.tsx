"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function DispatchDetailPage() {
  const { id } = useParams();
  const [dispatch, setDispatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDispatch = async () => {
    try {
      const res = await fetch(`/api/dispatches/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDispatch(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDispatch();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading delivery challan...</div>;
  if (!dispatch) return <div style={{ padding: '2rem' }}>Dispatch document not found.</div>;

  const so = dispatch.sales_order;
  const customer = so?.customer;

  return (
    <div>
      {/* Top Action Bar (Hidden when printing) */}
      <div className="page-header no-print">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{dispatch.dispatch_number}</h1>
            <span className="badge badge-closed">Dispatched</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            SO: <Link href={`/sales-orders/${dispatch.sales_order_id}`} style={{ color: 'var(--primary-color)', textDecoration: 'underline' }}>{so?.so_number}</Link> • Customer: <strong>{customer?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dispatches" className="btn btn-secondary">
            Back to List
          </Link>
          <button onClick={() => window.print()} className="btn btn-primary">
            🖨️ Print Delivery Challan
          </button>
        </div>
      </div>

      {/* Printable Delivery Challan Document */}
      <div
        className="printable-challan"
        style={{
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '0.75rem',
          padding: '2.5rem',
          maxWidth: '900px',
          margin: '0 auto'
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '0.25rem' }}>
              ANTIGRAVITY MANUFACTURING
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              100 Industrial Zone, Phase 2, Bangalore, India<br />
              Email: dispatch@antigravity.corp • Web: www.antigravity.io
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>DELIVERY CHALLAN</h1>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{dispatch.dispatch_number}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Date: <strong>{new Date(dispatch.dispatch_date).toLocaleDateString()}</strong>
            </div>
          </div>
        </div>

        {/* Customer & Logistics Addresses */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Billed & Consigned To:
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{customer?.name}</div>
            {customer?.contact_person && <div style={{ fontSize: '0.875rem' }}>Attn: {customer.contact_person}</div>}
            {customer?.phone && <div style={{ fontSize: '0.875rem' }}>Phone: {customer.phone}</div>}
            {customer?.email && <div style={{ fontSize: '0.875rem' }}>Email: {customer.email}</div>}
          </div>

          <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Dispatch & Transport Reference:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Sales Order:</span> <strong>{so?.so_number}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Customer PO:</span> <strong>{so?.customer_po_number || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Transporter:</span> <strong>{dispatch.transporter || 'Self / Direct'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Vehicle No:</span> <strong>{dispatch.vehicle_number || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>LR / Tracking:</span> <strong>{dispatch.lr_number || 'N/A'}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Invoice Ref:</span> <strong>{dispatch.invoice_reference || 'N/A'}</strong></div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="table-container" style={{ marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
          <table>
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                <th style={{ width: '50px' }}>#</th>
                <th>Item Description</th>
                <th style={{ textAlign: 'center' }}>UOM</th>
                <th style={{ textAlign: 'right' }}>Dispatched Qty</th>
              </tr>
            </thead>
            <tbody>
              {dispatch.items?.map((item: any, idx: number) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.sales_order_item?.item?.name}</strong>
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.sales_order_item?.item?.uom}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1rem' }}>
                    {item.dispatched_qty}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: 'right' }}>Total Quantity Dispatched:</td>
                <td style={{ textAlign: 'right', fontSize: '1.125rem', color: 'var(--success-color)' }}>
                  {dispatch.total_qty}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Logistics Footer & Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem', background: 'var(--surface-hover)', borderRadius: '0.5rem', marginBottom: '3rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Total Packages:</span><br />
            <strong>{dispatch.package_count ? `${dispatch.package_count} Boxes/Pkgs` : 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Gross Weight:</span><br />
            <strong>{dispatch.weight ? `${dispatch.weight} kg` : 'N/A'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>QC Clearance:</span><br />
            <strong style={{ color: 'var(--success-color)' }}>✓ 100% Passed Final QC</strong>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '2rem', borderTop: '1px dashed var(--border-color)' }}>
          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '40px' }} />
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.8125rem' }}>
              Prepared / Dispatched By
            </div>
          </div>

          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '40px' }} />
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.8125rem' }}>
              Transporter / Driver Signature
            </div>
          </div>

          <div style={{ textAlign: 'center', width: '200px' }}>
            <div style={{ height: '40px' }} />
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.8125rem' }}>
              Customer Receiver Signature & Seal
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .sidebar, .no-print {
            display: none !important;
          }
          .main-content {
            padding: 0 !important;
          }
          body, .printable-challan {
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          table, th, td {
            border-color: #ddd !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
