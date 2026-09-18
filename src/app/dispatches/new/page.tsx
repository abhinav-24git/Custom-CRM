"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function NewDispatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSoId = searchParams.get('so_id');

  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [selectedSoId, setSelectedSoId] = useState<string>(preselectedSoId || '');
  const [readiness, setReadiness] = useState<any>(null);
  const [loadingSo, setLoadingSo] = useState(true);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  // Line item dispatch inputs: map of sales_order_item_id -> dispatched_qty
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<string, number>>({});

  // Logistics inputs
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transporter, setTransporter] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [lrNumber, setLrNumber] = useState<string>('');
  const [packageCount, setPackageCount] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [invoiceReference, setInvoiceReference] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sales-orders')
      .then(res => res.json())
      .then(data => {
        // Active orders that are confirmed and not closed
        const active = data.filter((so: any) => so.is_confirmed && so.status !== 'Closed' && so.status !== 'Cancelled');
        setSalesOrders(active);
        setLoadingSo(false);
      })
      .catch(() => setLoadingSo(false));
  }, []);

  const fetchReadiness = async (soId: string) => {
    if (!soId) {
      setReadiness(null);
      setDispatchQuantities({});
      return;
    }
    setLoadingReadiness(true);
    try {
      const res = await fetch(`/api/sales-orders/${soId}/dispatch-readiness`);
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);

        // Pre-fill quantities with available_to_dispatch
        const initialQtys: Record<string, number> = {};
        data.lines.forEach((line: any) => {
          initialQtys[line.sales_order_item_id] = line.available_to_dispatch || 0;
        });
        setDispatchQuantities(initialQtys);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReadiness(false);
    }
  };

  useEffect(() => {
    if (selectedSoId) {
      fetchReadiness(selectedSoId);
    }
  }, [selectedSoId]);

  const totalDispatching = Object.values(dispatchQuantities).reduce((s, q) => s + (parseFloat(String(q)) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedSoId) {
      setErrorMsg('Please select a Sales Order');
      return;
    }

    if (totalDispatching <= 0) {
      setErrorMsg('Please specify a dispatch quantity > 0 for at least one line');
      return;
    }

    // Check line caps
    for (const line of readiness?.lines || []) {
      const qty = parseFloat(String(dispatchQuantities[line.sales_order_item_id])) || 0;
      if (qty > line.available_to_dispatch + 0.0001) {
        setErrorMsg(`Cannot dispatch ${qty} for '${line.item_name}'. Only ${line.available_to_dispatch} QC-approved units available.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const linesPayload = Object.entries(dispatchQuantities)
        .filter(([_, q]) => (parseFloat(String(q)) || 0) > 0)
        .map(([sales_order_item_id, dispatched_qty]) => ({
          sales_order_item_id,
          dispatched_qty: parseFloat(String(dispatched_qty))
        }));

      const res = await fetch('/api/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_order_id: selectedSoId,
          dispatch_date: dispatchDate,
          transporter: transporter || null,
          vehicle_number: vehicleNumber || null,
          lr_number: lrNumber || null,
          package_count: packageCount || null,
          weight: weight || null,
          invoice_reference: invoiceReference || null,
          lines: linesPayload
        })
      });

      if (res.ok) {
        const created = await res.json();
        router.push(`/dispatches/${created.id}`);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to create dispatch');
        setSubmitting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Create Delivery Dispatch</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Fulfill orders from QC-approved inventory and generate delivery challan</p>
        </div>

        <Link href="/dispatches" className="btn btn-secondary">
          Back to Dispatches
        </Link>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Sales Order Picker */}
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label><strong>Select Sales Order *</strong></label>
            {loadingSo ? (
              <p>Loading confirmed orders...</p>
            ) : (
              <select
                className="form-control"
                value={selectedSoId}
                onChange={(e) => setSelectedSoId(e.target.value)}
                required
              >
                <option value="">-- Choose Sales Order --</option>
                {salesOrders.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.so_number} — {so.customer?.name} ({so.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* QC-Approved Line Items Allocation */}
        {selectedSoId && (
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>QC Inspection-Gated Line Items</h3>
              {readiness && (
                <span style={{ fontSize: '0.875rem', color: readiness.total_available_to_dispatch > 0 ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
                  Total QC Approved Available: {readiness.total_available_to_dispatch} units
                </span>
              )}
            </div>

            {loadingReadiness ? (
              <p>Checking QC inspection gates...</p>
            ) : readiness?.lines?.length === 0 ? (
              <p>No line items found.</p>
            ) : (
              <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Ordered</th>
                      <th style={{ textAlign: 'right' }}>QC Approved</th>
                      <th style={{ textAlign: 'right' }}>Dispatched Prior</th>
                      <th style={{ textAlign: 'right' }}>Available Now</th>
                      <th style={{ textAlign: 'right', width: '150px' }}>Dispatch Qty *</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readiness?.lines?.map((line: any) => {
                      const currentVal = dispatchQuantities[line.sales_order_item_id] ?? 0;
                      const isOver = currentVal > line.available_to_dispatch;

                      return (
                        <tr key={line.sales_order_item_id}>
                          <td>
                            <strong>{line.item_name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{line.uom}</div>
                          </td>
                          <td style={{ textAlign: 'right' }}>{line.ordered_qty}</td>
                          <td style={{ textAlign: 'right', color: 'var(--primary-color)', fontWeight: 600 }}>{line.qc_accepted_qty}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{line.dispatched_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: line.available_to_dispatch > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            {line.available_to_dispatch}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={line.available_to_dispatch}
                              className="form-control"
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                borderColor: isOver ? 'var(--danger-color)' : undefined
                              }}
                              value={currentVal}
                              disabled={line.available_to_dispatch <= 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDispatchQuantities({
                                  ...dispatchQuantities,
                                  [line.sales_order_item_id]: val
                                });
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {readiness?.total_available_to_dispatch === 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '0.375rem', color: 'var(--danger-color)', fontSize: '0.875rem' }}>
                ⚠️ <strong>QC Gate Blocked:</strong> No finished goods have been inspected and accepted by QC yet for this order. Complete QC inspection before creating a dispatch.
              </div>
            )}
          </div>
        )}

        {/* Logistics & Challan Details */}
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Logistics & Delivery Information</h3>

          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Dispatch Date *</label>
              <input
                type="date"
                className="form-control"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Transporter / Courier Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. V-Trans Logistics / BlueDart"
                value={transporter}
                onChange={(e) => setTransporter(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Vehicle Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MH-12-AB-1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>LR / Tracking Reference Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. LR-98765432"
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Total Package / Box Count</label>
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="e.g. 4 Boxes"
                value={packageCount}
                onChange={(e) => setPackageCount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Approx Weight (kg)</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-control"
                placeholder="e.g. 85.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label>Invoice Reference / Billing Note</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. INV-2026-0881 / Proforma #44"
              value={invoiceReference}
              onChange={(e) => setInvoiceReference(e.target.value)}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <Link href="/dispatches" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ background: 'var(--success-color)' }}
            disabled={submitting || totalDispatching <= 0 || (readiness?.total_available_to_dispatch || 0) <= 0}
          >
            {submitting ? 'Generating Dispatch...' : `Confirm & Issue Dispatch (${totalDispatching} units)`}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewDispatchPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading dispatch wizard...</div>}>
      <NewDispatchContent />
    </Suspense>
  );
}
