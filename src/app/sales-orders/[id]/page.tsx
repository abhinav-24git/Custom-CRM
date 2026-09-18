"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);

  // Modal State
  const [modalType, setModalType] = useState<'Cancellation' | 'Confirm' | null>(null);
  const [activeLine, setActiveLine] = useState<any>(null);
  const [qty, setQty] = useState('');
  const [remarks, setRemarks] = useState('');

  // V3 Confirmation State
  const [customerPo, setCustomerPo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const fetchData = async () => {
    const [orderRes, ledgerRes, readinessRes] = await Promise.all([
      fetch(`/api/sales-orders/${id}`),
      fetch(`/api/sales-orders/${id}/ledger`),
      fetch(`/api/sales-orders/${id}/dispatch-readiness`)
    ]);
    if (orderRes.ok) setOrder(await orderRes.json());
    if (ledgerRes.ok) setLedger(await ledgerRes.json());
    if (readinessRes.ok) setReadiness(await readinessRes.json());
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/sales-orders/${id}/lines/${activeLine.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: parseFloat(qty), remarks })
    });

    if (res.ok) {
      setModalType(null);
      setQty('');
      setRemarks('');
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/sales-orders/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_po_number: customerPo, delivery_commitment_date: deliveryDate })
    });
    if (res.ok) {
      setModalType(null);
      fetchData();
    } else alert((await res.json()).error);
  };

  const generateMR = async () => {
    const res = await fetch(`/api/sales-orders/${id}/material-requirement`, { method: 'POST' });
    if (res.ok) {
      const mr = await res.json();
      router.push(`/material-requirements/${mr.id}`);
    } else alert((await res.json()).error);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open': return 'badge badge-open';
      case 'Partially Dispatched': return 'badge badge-partially';
      case 'Closed': return 'badge badge-closed';
      case 'Cancelled': return 'badge badge-closed';
      default: return 'badge';
    }
  };

  if (!order) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const readinessMap = new Map((readiness?.lines || []).map((l: any) => [l.sales_order_item_id, l]));
  const totalAvailableToDispatch = readiness?.total_available_to_dispatch || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{order.so_number}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{order.customer?.name} • {new Date(order.order_date).toLocaleDateString()}</p>
          {order.quotation_id && (
            <p style={{ marginTop: '0.5rem' }}>
              <Link href={`/quotations/${order.quotation_id}`} className="badge badge-open" style={{ display: 'inline-block' }}>View Source Quotation</Link>
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            {order.is_confirmed && <span className="badge" style={{ background: 'var(--success-color)' }}>Confirmed</span>}
            <span className={getStatusBadge(order.status)}>{order.status}</span>
          </div>
          <h2 style={{ color: 'var(--primary-color)' }}>₹{order.total_amount.toFixed(2)}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {!order.is_confirmed && (
          <button className="btn btn-primary" onClick={() => setModalType('Confirm')}>Confirm Order</button>
        )}
        {order.is_confirmed && (
          order.MaterialRequirements?.length > 0 ? (
            <Link href={`/material-requirements/${order.MaterialRequirements[0].id}`} className="btn btn-secondary">View Material Requirement</Link>
          ) : (
            <button className="btn btn-primary" onClick={generateMR}>Generate Material Requirement</button>
          )
        )}
        {order.is_confirmed && (
          <Link href={`/plannings/new`} className="btn btn-secondary">
            Plan Execution
          </Link>
        )}
        {order.status !== 'Closed' && order.status !== 'Cancelled' && (
          <Link
            href={`/dispatches/new?so_id=${order.id}`}
            className={`btn ${totalAvailableToDispatch > 0 ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              background: totalAvailableToDispatch > 0 ? 'var(--success-color)' : undefined,
              pointerEvents: totalAvailableToDispatch > 0 ? 'auto' : 'none',
              opacity: totalAvailableToDispatch > 0 ? 1 : 0.5
            }}
          >
            + Create Dispatch ({totalAvailableToDispatch} QC units ready)
          </Link>
        )}
      </div>

      <h3>Line Items</h3>
      <div className="table-container" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Ordered</th>
              <th style={{ textAlign: 'right' }}>QC Approved</th>
              <th style={{ textAlign: 'right' }}>Dispatched</th>
              <th style={{ textAlign: 'right' }}>Available Now</th>
              <th style={{ textAlign: 'right' }}>Cancelled</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line: any) => {
              const rLine = readinessMap.get(line.id) as any;
              const qcApproved = rLine?.qc_accepted_qty || 0;
              const availToDispatch = rLine?.available_to_dispatch || 0;

              return (
                <tr key={line.id}>
                  <td>{line.item?.name}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{line.ordered_qty}</td>
                  <td style={{ textAlign: 'right', color: 'var(--primary-color)', fontWeight: 600 }}>{qcApproved}</td>
                  <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{line.dispatched_qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: availToDispatch > 0 ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                    {availToDispatch}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--danger-color)' }}>{line.cancelled_qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{line.balance_qty}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <Link
                        href={`/dispatches/new?so_id=${order.id}`}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#34d399',
                          pointerEvents: availToDispatch > 0 ? 'auto' : 'none',
                          opacity: availToDispatch > 0 ? 1 : 0.4
                        }}
                      >
                        Dispatch
                      </Link>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
                        disabled={line.balance_qty <= 0}
                        onClick={() => { setActiveLine(line); setModalType('Cancellation'); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3>Activity & Fulfillment Ledger</h3>
      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map(entry => (
              <tr key={entry.id}>
                <td>{new Date(entry.entry_date || entry.createdAt).toLocaleString()}</td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: entry.type === 'Dispatch' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: entry.type === 'Dispatch' ? '#34d399' : '#f87171'
                    }}
                  >
                    {entry.type}
                  </span>
                </td>
                <td>{entry.sales_order_item?.item?.name}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{entry.qty}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{entry.remarks || '-'}</td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem' }}>No dispatch or cancellation activity logged yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalType === 'Cancellation' ? (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--danger-color)' }}>Cancel Order Quantity</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Item: <strong>{activeLine?.item?.name}</strong><br/>
              Remaining Balance: <strong>{activeLine?.balance_qty}</strong>
            </p>
            <form onSubmit={handleActionSubmit}>
              <div className="form-group">
                <label>Quantity to Cancel *</label>
                <input required type="number" min="0.01" step="0.01" max={activeLine?.balance_qty} className="form-control" value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Cancellation Reason / Remarks</label>
                <input className="form-control" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Customer reduced order" />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Close</button>
                <button type="submit" className="btn btn-danger">
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : modalType === 'Confirm' ? (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Confirm Sales Order</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Confirming this order locks commercial terms and allows planning and material requirement generation.
            </p>
            <form onSubmit={handleConfirmOrder}>
              <div className="form-group">
                <label>Customer PO Number</label>
                <input className="form-control" value={customerPo} onChange={e => setCustomerPo(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Delivery Commitment Date</label>
                <input type="date" className="form-control" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--success-color)' }}>
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
