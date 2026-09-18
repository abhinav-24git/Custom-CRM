"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PlanningDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [planning, setPlanning] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Modal states for creating Job Work RFQ
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [rfqProcess, setRfqProcess] = useState('');
  const [rfqQty, setRfqQty] = useState(0);
  const [rfqDate, setRfqDate] = useState('');
  const [rfqMatResp, setRfqMatResp] = useState('Company');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [creatingRfq, setCreatingRfq] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchPlanning = async () => {
    try {
      const res = await fetch(`/api/plannings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlanning(data);
        setRfqQty(data.outsource_qty || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPlanning();
      fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
    }
  }, [id]);

  const handleRelease = async () => {
    if (!confirm('Are you sure you want to release this Planning? This will freeze the planned quantities and create an In-house Job Card (if in-house qty > 0).')) {
      return;
    }
    setReleasing(true);
    try {
      const res = await fetch(`/api/plannings/${id}/release`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchPlanning();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to release planning');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setReleasing(false);
    }
  };

  const handleCreateJobWorkRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!rfqProcess.trim()) {
      setModalError('Please enter the process name (e.g. CNC Machining, Heat Treatment)');
      return;
    }

    if (selectedSuppliers.length === 0) {
      setModalError('Please select at least one supplier');
      return;
    }

    setCreatingRfq(true);
    try {
      const res = await fetch('/api/jobwork-rfqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planning_id: planning.id,
          process: rfqProcess,
          qty: rfqQty,
          required_date: rfqDate || null,
          material_responsibility: rfqMatResp,
          supplier_ids: selectedSuppliers
        })
      });

      if (res.ok) {
        const rfq = await res.json();
        setShowRfqModal(false);
        router.push(`/jobwork-rfqs/${rfq.id}`);
      } else {
        const err = await res.json();
        setModalError(err.error || 'Failed to create Job Work RFQ');
        setCreatingRfq(false);
      }
    } catch (err: any) {
      setModalError(err.message || 'Error occurred');
      setCreatingRfq(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading planning details...</div>;
  if (!planning) return <div style={{ padding: '2rem' }}>Planning not found.</div>;

  const totalPlanned = planning.inhouse_qty + planning.outsource_qty;
  const isDraft = planning.status === 'Draft';

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1>{planning.planning_number}</h1>
            <span className={`badge ${planning.status === 'Completed' ? 'badge-closed' : planning.status === 'In Progress' ? 'badge-partially' : planning.status === 'Released' ? 'badge-open' : ''}`}>
              {planning.status}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            SO: <strong>{planning.sales_order_item?.sales_order?.so_number}</strong> • Customer: <strong>{planning.sales_order_item?.sales_order?.customer?.name}</strong> • Item: <strong>{planning.sales_order_item?.item?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/plannings" className="btn btn-secondary">
            Back to List
          </Link>
          {isDraft && (
            <button
              onClick={handleRelease}
              disabled={releasing}
              className="btn btn-primary"
            >
              {releasing ? 'Releasing...' : 'Release Planning'}
            </button>
          )}
        </div>
      </div>

      {/* Allocation Split Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Ordered Qty</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{planning.sales_order_item?.ordered_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{planning.sales_order_item?.item?.uom}</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>In-House Allocated</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>{planning.inhouse_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{planning.sales_order_item?.item?.uom}</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Outsource Allocated</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning-color)' }}>{planning.outsource_qty} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{planning.sales_order_item?.item?.uom}</span></div>
        </div>

        <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Planned in this PLN</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success-color)' }}>{totalPlanned} <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{planning.sales_order_item?.item?.uom}</span></div>
        </div>
      </div>

      {/* Details Box */}
      <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Planning Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Target Start Date:</span>
            <div>{planning.target_start_date ? new Date(planning.target_start_date).toLocaleDateString() : 'Not specified'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Target End Date:</span>
            <div>{planning.target_end_date ? new Date(planning.target_end_date).toLocaleDateString() : 'Not specified'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Notes:</span>
            <div>{planning.notes || 'None'}</div>
          </div>
        </div>
      </div>

      {/* 5A: In-House Execution (Job Cards) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>In-House Execution (Job Cards)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Shop-floor job tracking for {planning.inhouse_qty} units</p>
          </div>
        </div>

        {planning.inhouse_qty === 0 ? (
          <div style={{ padding: '1.5rem', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-secondary)' }}>
            No in-house quantity allocated for this plan.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job Card No</th>
                  <th>Planned Qty</th>
                  <th>Produced</th>
                  <th>Rejected</th>
                  <th>Balance Qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {planning.JobCards?.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      {isDraft ? 'Job Card will be auto-generated when you Release this Planning.' : 'No Job Card created.'}
                    </td>
                  </tr>
                ) : (
                  planning.JobCards.map((jc: any) => {
                    const produced = jc.productionEntries?.reduce((s: number, e: any) => s + e.produced_qty, 0) || 0;
                    const rejected = jc.productionEntries?.reduce((s: number, e: any) => s + e.rejected_qty, 0) || 0;
                    const balance = Math.max(0, jc.planned_qty - (produced + rejected));

                    return (
                      <tr key={jc.id}>
                        <td><strong>{jc.job_card_number}</strong></td>
                        <td>{jc.planned_qty}</td>
                        <td style={{ color: 'var(--success-color)', fontWeight: 600 }}>{produced}</td>
                        <td style={{ color: 'var(--danger-color)', fontWeight: 600 }}>{rejected}</td>
                        <td style={{ fontWeight: 600 }}>{balance}</td>
                        <td><span className={`badge ${jc.status === 'Completed' ? 'badge-closed' : jc.status === 'In Progress' ? 'badge-partially' : 'badge-open'}`}>{jc.status}</span></td>
                        <td>
                          <Link href={`/job-cards/${jc.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                            Open Job Card
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5B: Outsource Execution (Job Work RFQ & Service Orders) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Outsourced Execution (Job Work)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>External vendor processing for {planning.outsource_qty} units</p>
          </div>
          {planning.outsource_qty > 0 && !isDraft && (
            <button onClick={() => setShowRfqModal(true)} className="btn btn-primary">
              + Create Job Work RFQ
            </button>
          )}
        </div>

        {planning.outsource_qty === 0 ? (
          <div style={{ padding: '1.5rem', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-secondary)' }}>
            No outsource quantity allocated for this plan.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Job Work RFQ</th>
                  <th>Process</th>
                  <th>Qty</th>
                  <th>Suppliers</th>
                  <th>Quotes</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {planning.JobWorkRFQs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                      {isDraft ? 'Release the planning first to create Job Work RFQs.' : 'No Job Work RFQ created yet. Click "+ Create Job Work RFQ" to begin vendor sourcing.'}
                    </td>
                  </tr>
                ) : (
                  planning.JobWorkRFQs.map((rfq: any) => (
                    <tr key={rfq.id}>
                      <td><strong>{rfq.rfq_number}</strong></td>
                      <td>{rfq.process}</td>
                      <td>{rfq.qty}</td>
                      <td>{rfq.suppliers?.length || 0} vendor(s)</td>
                      <td>{rfq.quotes?.length || 0} quote(s)</td>
                      <td><span className="badge badge-open">{rfq.status}</span></td>
                      <td>
                        <Link href={`/jobwork-rfqs/${rfq.id}`} className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.8125rem' }}>
                          View RFQ
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Job Work RFQ */}
      {showRfqModal && (
        <div className="modal-overlay" onClick={() => setShowRfqModal(false)}>
          <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1rem' }}>Create Job Work RFQ</h3>

            {modalError && (
              <div style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateJobWorkRFQ}>
              <div className="form-group">
                <label>Process / Operation *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Zinc Plating, CNC Milling, Powder Coating"
                  value={rfqProcess}
                  onChange={(e) => setRfqProcess(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-control"
                    value={rfqQty}
                    onChange={(e) => setRfqQty(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Material Responsibility</label>
                  <select
                    className="form-control"
                    value={rfqMatResp}
                    onChange={(e) => setRfqMatResp(e.target.value)}
                  >
                    <option value="Company">Company (Send material via RGP)</option>
                    <option value="Vendor">Vendor (Vendor provides raw material)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Required By Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={rfqDate}
                  onChange={(e) => setRfqDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Select Suppliers *</label>
                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.375rem', padding: '0.5rem', background: 'var(--bg-color)' }}>
                  {suppliers.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedSuppliers.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSuppliers([...selectedSuppliers, s.id]);
                          else setSelectedSuppliers(selectedSuppliers.filter(id => id !== s.id));
                        }}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                  {suppliers.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No suppliers found. Create suppliers first.</p>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRfqModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingRfq}>
                  {creatingRfq ? 'Creating...' : 'Create RFQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
