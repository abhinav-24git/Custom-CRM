"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPlanningPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [inhouseQty, setInhouseQty] = useState<number>(0);
  const [outsourceQty, setOutsourceQty] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch confirmed sales orders
    fetch('/api/sales-orders')
      .then(res => res.json())
      .then(data => {
        // Only confirmed sales orders
        const confirmed = data.filter((so: any) => so.is_confirmed);
        setSalesOrders(confirmed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Collect all line items across confirmed sales orders
  const allLines: any[] = [];
  salesOrders.forEach(so => {
    so.lines?.forEach((line: any) => {
      // Calculate already planned if Plannings loaded or default to 0
      const alreadyPlanned = line.Plannings
        ? line.Plannings.filter((p: any) => p.status !== 'Cancelled').reduce((sum: number, p: any) => sum + p.inhouse_qty + p.outsource_qty, 0)
        : 0;
      const availableToPlan = Math.max(0, line.ordered_qty - alreadyPlanned);

      allLines.push({
        ...line,
        sales_order_number: so.so_number,
        customer_name: so.customer?.name,
        already_planned: alreadyPlanned,
        available_to_plan: availableToPlan
      });
    });
  });

  const selectedLine = allLines.find(l => l.id === selectedItemId);

  const currentTotal = (parseFloat(String(inhouseQty)) || 0) + (parseFloat(String(outsourceQty)) || 0);
  const availableToPlan = selectedLine ? selectedLine.available_to_plan : 0;
  const remainingAfterPlan = selectedLine ? (availableToPlan - currentTotal) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedItemId) {
      setErrorMsg('Please select a Sales Order line item');
      return;
    }

    if (currentTotal <= 0) {
      setErrorMsg('Total planned quantity (In-house + Outsource) must be greater than 0');
      return;
    }

    if (currentTotal > availableToPlan + 0.0001) {
      setErrorMsg(`Total planned quantity (${currentTotal}) exceeds available unallocated quantity (${availableToPlan})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/plannings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_order_item_id: selectedItemId,
          inhouse_qty: parseFloat(String(inhouseQty)) || 0,
          outsource_qty: parseFloat(String(outsourceQty)) || 0,
          target_start_date: startDate || null,
          target_end_date: endDate || null,
          notes: notes || null
        })
      });

      if (res.ok) {
        const created = await res.json();
        router.push(`/plannings/${created.id}`);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to create planning');
        setSubmitting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>Create Production Plan</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Allocate confirmed order items for in-house or outsourced execution</p>
        </div>
        <Link href="/plannings" className="btn btn-secondary">
          Back to Plannings
        </Link>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><strong>Select Confirmed Sales Order Line *</strong></label>
            {loading ? (
              <p>Loading confirmed orders...</p>
            ) : allLines.length === 0 ? (
              <div style={{ padding: '1rem', background: 'var(--surface-hover)', borderRadius: '0.375rem' }}>
                No confirmed Sales Orders found. Confirm a Sales Order first before planning.
              </div>
            ) : (
              <select
                className="form-control"
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const line = allLines.find(l => l.id === e.target.value);
                  if (line) {
                    setInhouseQty(line.available_to_plan);
                    setOutsourceQty(0);
                  }
                }}
                required
              >
                <option value="">-- Choose SO Line Item --</option>
                {allLines.map(line => (
                  <option key={line.id} value={line.id}>
                    {line.sales_order_number} | {line.customer_name} | {line.item?.name} (Ordered: {line.ordered_qty}, Available: {line.available_to_plan})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedLine && (
            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Ordered</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedLine.ordered_qty}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Already Planned</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{selectedLine.already_planned}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Planning Now</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: currentTotal > availableToPlan ? 'var(--danger-color)' : 'var(--primary-color)' }}>
                  {currentTotal}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Remaining After</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: remainingAfterPlan < 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                  {remainingAfterPlan}
                </div>
              </div>
            </div>
          )}

          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label><strong>In-House Quantity</strong> (Manufacture internally)</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-control"
                value={inhouseQty}
                onChange={(e) => setInhouseQty(parseFloat(e.target.value) || 0)}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Generates In-House Job Card upon release</small>
            </div>

            <div className="form-group">
              <label><strong>Outsource Quantity</strong> (Job Work / Vendor)</label>
              <input
                type="number"
                step="any"
                min="0"
                className="form-control"
                value={outsourceQty}
                onChange={(e) => setOutsourceQty(parseFloat(e.target.value) || 0)}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Generates Job Work RFQ / Service Order upon release</small>
            </div>
          </div>

          <div className="form-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label>Target Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Target End Date</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Planning Notes / Special Instructions</label>
            <textarea
              className="form-control"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Prioritize batch 1 on CNC machine..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <Link href="/plannings" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !selectedItemId || currentTotal <= 0 || currentTotal > availableToPlan}
            >
              {submitting ? 'Creating...' : 'Create Planning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
