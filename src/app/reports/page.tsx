"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import PageTabs from '@/components/ui/PageTabs';
import FilterCard from '@/components/ui/FilterCard';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';

type ReportType =
  | 'enquiry-conversion'
  | 'sales-pipeline'
  | 'purchase-summary'
  | 'job-rgp-ageing'
  | 'qc-rejection-rate'
  | 'dispatch-feedback-summary';

export default function ReportsPortalPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('enquiry-conversion');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await fetch(`/api/reports/${activeReport}?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const handleExportCSV = async () => {
    if (!data) return;
    setExporting(true);

    try {
      const rows = data.rows || data.job_cards || [];
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: activeReport,
          rows
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'enquiry-conversion' as ReportType, label: 'Enquiry to Order Conversion' },
    { id: 'sales-pipeline' as ReportType, label: 'Sales Order Pipeline & Backlog' },
    { id: 'purchase-summary' as ReportType, label: 'Procurement & GRN' },
    { id: 'job-rgp-ageing' as ReportType, label: 'Production WIP & RGP Ageing' },
    { id: 'qc-rejection-rate' as ReportType, label: 'QC Quality & Rejection Rates' },
    { id: 'dispatch-feedback-summary' as ReportType, label: 'Delivery Dispatch & CSAT' },
  ];

  return (
    <div>
      <PageHeader
        title="Enterprise Business Reports"
        subtitle="Live operational aggregations across all sales, procurement, production, QC, and fulfillment records"
        action={
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading || !data}
            className="btn btn-primary"
          >
            {exporting ? 'Exporting...' : 'Export to CSV'}
          </button>
        }
      />

      {/* Reusable Sub-navigation Tabs */}
      <PageTabs
        tabs={tabs}
        activeTab={activeReport}
        onChange={setActiveReport}
      />

      {/* Reusable Filter Card */}
      <FilterCard
        title="Filter Date Range"
        onSearch={fetchReport}
        onReset={fromDate || toDate ? () => { setFromDate(''); setToDate(''); } : undefined}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>From:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>To:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </FilterCard>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading report metrics...</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No report data returned.</div>
      ) : (
        <div>
          {/* Summary KPI Cards via Reusable MetricCard */}
          {data.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {Object.entries(data.summary).map(([key, val]: [string, any]) => (
                <MetricCard
                  key={key}
                  label={key.replace(/_/g, ' ')}
                  value={
                    typeof val === 'number' && (key.includes('value') || key.includes('spend') || key.includes('revenue') || key.includes('amount'))
                      ? `₹${val.toLocaleString()}`
                      : typeof val === 'number' && key.includes('pct')
                      ? `${val}%`
                      : val
                  }
                  color={key.includes('rejection') || key.includes('overdue') ? 'var(--danger-color)' : 'var(--primary-color)'}
                />
              ))}
            </div>
          )}

          {/* Report Data Tables with Standardized Table Headers & Status Badges */}
          {activeReport === 'enquiry-conversion' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Enquiry No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Source</th>
                    <th style={{ textAlign: 'right' }}>Quotes Logged</th>
                    <th>Stage Reached</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows?.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/enquiries/${r.id}`} className="table-link">
                          {r.enquiry_number}
                        </Link>
                      </td>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td>{r.customer_name}</td>
                      <td>{r.source}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.quotations_count}</td>
                      <td>
                        <StatusBadge status={r.conversion_stage} />
                      </td>
                    </tr>
                  ))}
                  {(!data.rows || data.rows.length === 0) && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No records found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'sales-pipeline' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>SO Number</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Order Value</th>
                    <th style={{ textAlign: 'right' }}>Ordered</th>
                    <th style={{ textAlign: 'right' }}>Dispatched</th>
                    <th style={{ textAlign: 'right' }}>Pending</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows?.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/sales-orders/${r.id}`} className="table-link">
                          {r.so_number}
                        </Link>
                      </td>
                      <td>{new Date(r.order_date).toLocaleDateString()}</td>
                      <td>{r.customer_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{r.total_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{r.total_ordered}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{r.total_dispatched}</td>
                      <td style={{ textAlign: 'right', color: r.total_balance > 0 ? 'var(--warning-color)' : 'var(--text-secondary)', fontWeight: 600 }}>{r.total_balance}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                  {(!data.rows || data.rows.length === 0) && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No orders found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'purchase-summary' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th style={{ textAlign: 'right' }}>PO Amount</th>
                    <th style={{ textAlign: 'right' }}>Ordered Units</th>
                    <th style={{ textAlign: 'right' }}>Received Units</th>
                    <th style={{ textAlign: 'right' }}>Pending Units</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows?.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/purchase-orders/${r.id}`} className="table-link">
                          {r.po_number}
                        </Link>
                      </td>
                      <td>{new Date(r.po_date).toLocaleDateString()}</td>
                      <td>{r.supplier_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{r.total_amount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{r.ordered_units}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{r.received_units}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.pending_units}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                  {(!data.rows || data.rows.length === 0) && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No purchase orders found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'job-rgp-ageing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>In-House Job Cards (Ageing)</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Job Card No</th>
                        <th>Target Start</th>
                        <th>Target End</th>
                        <th style={{ textAlign: 'right' }}>Ageing (Days)</th>
                        <th style={{ textAlign: 'right' }}>Planned</th>
                        <th style={{ textAlign: 'right' }}>Produced</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.job_cards?.map((jc: any) => (
                        <tr key={jc.id}>
                          <td>
                            <Link href={`/job-cards/${jc.id}`} className="table-link">
                              {jc.job_card_number}
                            </Link>
                          </td>
                          <td>{jc.target_start ? new Date(jc.target_start).toLocaleDateString() : '-'}</td>
                          <td>{jc.target_end ? new Date(jc.target_end).toLocaleDateString() : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: jc.ageing_days > 7 ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                            {jc.ageing_days}d
                          </td>
                          <td style={{ textAlign: 'right' }}>{jc.planned_qty}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{jc.produced_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{jc.balance_qty}</td>
                          <td>
                            <StatusBadge status={jc.status} />
                          </td>
                        </tr>
                      ))}
                      {(!data.job_cards || data.job_cards.length === 0) && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No job cards found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Outsource RGP Challans (Vendor Ageing)</h3>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>RGP No</th>
                        <th>Vendor</th>
                        <th>Challan Date</th>
                        <th>Expected Return</th>
                        <th style={{ textAlign: 'right' }}>Overdue (Days)</th>
                        <th style={{ textAlign: 'right' }}>Sent Qty</th>
                        <th style={{ textAlign: 'right' }}>Returned</th>
                        <th style={{ textAlign: 'right' }}>Pending</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rgps?.map((r: any) => (
                        <tr key={r.id}>
                          <td>
                            <Link href={`/rgp-challans/${r.id}`} className="table-link">
                              {r.rgp_number}
                            </Link>
                          </td>
                          <td>{r.vendor_name}</td>
                          <td>{new Date(r.challan_date).toLocaleDateString()}</td>
                          <td>{r.expected_return ? new Date(r.expected_return).toLocaleDateString() : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: r.overdue_days > 0 ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                            {r.overdue_days > 0 ? `${r.overdue_days}d overdue` : 'On track'}
                          </td>
                          <td style={{ textAlign: 'right' }}>{r.sent_qty}</td>
                          <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{r.returned_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.pending_qty}</td>
                          <td>
                            <StatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                      {(!data.rgps || data.rgps.length === 0) && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No RGP records found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeReport === 'qc-rejection-rate' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>QC No</th>
                    <th>Source Type</th>
                    <th>Inspection Date</th>
                    <th>Item</th>
                    <th style={{ textAlign: 'right' }}>Inspected Qty</th>
                    <th style={{ textAlign: 'right' }}>Accepted</th>
                    <th style={{ textAlign: 'right' }}>Rejected</th>
                    <th style={{ textAlign: 'right' }}>Rejection %</th>
                    <th>Action Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows?.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/qc-inspections/${r.id}`} className="table-link">
                          {r.qc_number}
                        </Link>
                      </td>
                      <td>{r.source_type}</td>
                      <td>{new Date(r.inspection_date).toLocaleDateString()}</td>
                      <td>{r.item_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.inspected_qty}</td>
                      <td style={{ textAlign: 'right', color: 'var(--success-color)', fontWeight: 600 }}>{r.accepted_qty}</td>
                      <td style={{ textAlign: 'right', color: 'var(--danger-color)', fontWeight: 600 }}>{r.rejected_qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: r.rejection_pct > 0 ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                        {r.rejection_pct.toFixed(1)}%
                      </td>
                      <td>
                        <StatusBadge status={r.actions_open_count > 0 ? 'Action Open' : 'Resolved'} />
                      </td>
                    </tr>
                  ))}
                  {(!data.rows || data.rows.length === 0) && <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No QC records found</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeReport === 'dispatch-feedback-summary' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Dispatch No</th>
                    <th>Date</th>
                    <th>SO Ref</th>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Units Shipped</th>
                    <th>Feedback Status</th>
                    <th style={{ textAlign: 'center' }}>Rating</th>
                    <th>Customer Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows?.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/dispatches/${r.id}`} className="table-link">
                          {r.dispatch_number}
                        </Link>
                      </td>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/sales-orders/${r.so_id}`} className="table-link">
                          {r.so_number}
                        </Link>
                      </td>
                      <td>{r.customer_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.dispatched_units}</td>
                      <td>
                        <StatusBadge status={r.feedback_status} />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {r.customer_rating ? (
                          <span style={{ color: r.customer_rating <= 2 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                            ★ {r.customer_rating}/5
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.comments || '-'}
                      </td>
                    </tr>
                  ))}
                  {(!data.rows || data.rows.length === 0) && <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No dispatch records found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
