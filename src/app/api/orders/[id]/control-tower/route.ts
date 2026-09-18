import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const so = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: {
          include: { enquiry: true }
        },
        lines: {
          include: {
            item: true,
            Plannings: {
              include: {
                JobCards: { include: { productionEntries: true } },
                JobWorkRFQs: {
                  include: {
                    quotes: true,
                    ServiceOrders: {
                      include: {
                        rgpChallans: { include: { returns: true } }
                      }
                    }
                  }
                }
              }
            },
            QCInspections: {
              include: { items: { include: { actions: true } } }
            },
            DispatchItems: {
              include: { dispatch: true }
            }
          }
        },
        MaterialRequirements: {
          include: {
            items: true,
            PurchaseRFQs: {
              include: {
                PurchaseOrders: { include: { GRNs: true } }
              }
            }
          }
        },
        Dispatches: {
          include: {
            items: true,
            Feedbacks: { include: { actions: true } }
          }
        }
      }
    });

    if (!so) {
      return NextResponse.json({ error: 'Sales Order not found' }, { status: 404 });
    }

    const now = Date.now();
    const blockers: string[] = [];

    // 1. Calculate Core Summary Metrics
    const totalOrderedQty = so.lines.reduce((s, l) => s + l.ordered_qty, 0);
    const totalDispatchedQty = so.lines.reduce((s, l) => s + l.dispatched_qty, 0);
    const totalBalanceQty = so.lines.reduce((s, l) => s + l.balance_qty, 0);

    const allJobCards = so.lines.flatMap(l => l.Plannings.flatMap(p => p.JobCards));
    const totalProducedQty = allJobCards.flatMap(j => j.productionEntries).reduce((s, e) => s + e.produced_qty, 0);

    const allQcs = so.lines.flatMap(l => l.QCInspections);
    const totalQcAcceptedQty = allQcs
      .filter(q => q.status === 'Completed')
      .flatMap(q => q.items)
      .reduce((s, i) => s + i.accepted_qty, 0);

    const completionPct = totalOrderedQty > 0 ? (totalDispatchedQty / totalOrderedQty) * 100 : 0;

    // Check Blockers
    if (!so.is_confirmed) {
      blockers.push('Order is not yet confirmed (commercial terms unlocked)');
    }

    const pendingQcs = allQcs.filter(q => q.status === 'Pending');
    if (pendingQcs.length > 0) {
      blockers.push(`${pendingQcs.length} QC Inspection(s) pending pass/fail clearance`);
    }

    const openQcActions = allQcs.flatMap(q => q.items.flatMap(i => i.actions)).filter(a => a.status === 'Open');
    if (openQcActions.length > 0) {
      blockers.push(`${openQcActions.length} QC scrap/rework action ticket(s) currently open`);
    }

    const allFeedbacks = so.Dispatches.flatMap(d => d.Feedbacks);
    const openFbActions = allFeedbacks.flatMap(f => f.actions).filter(a => a.status === 'Open');
    if (openFbActions.length > 0) {
      blockers.push(`${openFbActions.length} Customer Feedback action ticket(s) requiring resolution`);
    }

    // Determine Health Status
    let health: 'Green' | 'Amber' | 'Red' = 'Green';
    if (blockers.length > 0 || (so.status === 'Open' && !so.is_confirmed)) {
      health = 'Amber';
    }
    const daysSinceOrder = Math.floor((now - new Date(so.order_date).getTime()) / (1000 * 60 * 60 * 24));
    if (so.status !== 'Closed' && daysSinceOrder > 14 && completionPct < 50) {
      health = 'Red';
    }

    // 2. Build Stage Progression Timeline
    const quotation = so.quotation;
    const enquiry = quotation?.enquiry;
    const mr = so.MaterialRequirements[0] || null;
    const planning = so.lines[0]?.Plannings[0] || null;
    const firstDispatch = so.Dispatches[0] || null;
    const firstFeedback = firstDispatch?.Feedbacks[0] || null;

    const stages = [
      {
        stage_name: 'Enquiry',
        status: enquiry ? 'Completed' : 'Skipped',
        ref_number: enquiry?.enquiry_number || 'Direct Order',
        date: enquiry?.enquiry_date || null,
        link: enquiry ? `/enquiries/${enquiry.id}` : null,
        details: enquiry ? `Customer requirement logged from ${enquiry.source || 'Direct'}` : 'Direct order creation'
      },
      {
        stage_name: 'Quotation',
        status: quotation ? 'Completed' : 'Skipped',
        ref_number: quotation ? `${quotation.quotation_number} (Rev ${quotation.revision_number})` : 'N/A',
        date: quotation?.quotation_date || null,
        link: quotation ? `/quotations/${quotation.id}` : null,
        details: quotation ? `Quoted amount $${quotation.total_amount.toFixed(2)}` : 'No formal quote'
      },
      {
        stage_name: 'Sales Order Confirmation',
        status: so.is_confirmed ? 'Completed' : 'Pending',
        ref_number: so.so_number,
        date: so.confirmed_at || so.order_date,
        link: `/sales-orders/${so.id}`,
        details: so.is_confirmed ? `Customer PO: ${so.customer_po_number || 'N/A'}` : 'Awaiting confirmation'
      },
      {
        stage_name: 'Material Requirement (MR)',
        status: mr ? mr.status : 'Pending',
        ref_number: mr?.mr_number || 'None',
        date: mr?.createdAt || null,
        link: mr ? `/material-requirements/${mr.id}` : null,
        details: mr ? `${mr.items.length} material items evaluated` : 'MR not yet generated'
      },
      {
        stage_name: 'Procurement (RFQ / PO / GRN)',
        status: mr?.PurchaseRFQs?.length ? 'In Progress' : 'Pending',
        ref_number: mr?.PurchaseRFQs[0]?.rfq_number || 'None',
        date: mr?.PurchaseRFQs[0]?.createdAt || null,
        link: mr?.PurchaseRFQs[0] ? `/purchase-rfqs/${mr.PurchaseRFQs[0].id}` : null,
        details: mr?.PurchaseRFQs[0] ? `${mr.PurchaseRFQs.length} RFQ(s) issued to suppliers` : 'No external purchase required'
      },
      {
        stage_name: 'Production Planning',
        status: planning ? planning.status : 'Pending',
        ref_number: planning?.planning_number || 'None',
        date: planning?.createdAt || null,
        link: planning ? `/plannings/${planning.id}` : null,
        details: planning ? `In-house: ${planning.inhouse_qty} | Outsource: ${planning.outsource_qty}` : 'Awaiting planning split'
      },
      {
        stage_name: 'Execution (Job Cards & Service Orders)',
        status: allJobCards.some(j => j.status === 'Completed') ? 'In Progress' : allJobCards.length ? 'Started' : 'Pending',
        ref_number: allJobCards[0]?.job_card_number || 'Execution',
        date: allJobCards[0]?.createdAt || null,
        link: allJobCards[0] ? `/job-cards/${allJobCards[0].id}` : null,
        details: `${allJobCards.length} Job Card(s) • ${totalProducedQty} units produced`
      },
      {
        stage_name: 'Quality Control (QC)',
        status: allQcs.length && allQcs.every(q => q.status === 'Completed') ? 'Completed' : allQcs.length ? 'In Inspection' : 'Pending',
        ref_number: allQcs[0]?.qc_number || 'QC Gate',
        date: allQcs[0]?.inspection_date || null,
        link: allQcs[0] ? `/qc-inspections/${allQcs[0].id}` : '/qc-inspections',
        details: `${totalQcAcceptedQty} units cleared QC inspection`
      },
      {
        stage_name: 'Dispatch & Delivery',
        status: so.status === 'Closed' ? 'Completed' : so.status === 'Partially Dispatched' ? 'Partially Dispatched' : 'Pending',
        ref_number: firstDispatch?.dispatch_number || 'Delivery',
        date: firstDispatch?.dispatch_date || null,
        link: firstDispatch ? `/dispatches/${firstDispatch.id}` : '/dispatches/new',
        details: `${so.Dispatches.length} dispatch(es) • ${totalDispatchedQty} / ${totalOrderedQty} units delivered`
      },
      {
        stage_name: 'Customer Feedback',
        status: firstFeedback ? firstFeedback.status : 'Not Requested',
        ref_number: firstFeedback?.feedback_number || 'Feedback',
        date: firstFeedback?.received_at || firstFeedback?.requested_at || null,
        link: firstFeedback ? `/feedbacks/${firstFeedback.id}` : null,
        details: firstFeedback?.rating ? `Rating: ${firstFeedback.rating}/5` : 'Awaiting customer response'
      }
    ];

    return NextResponse.json({
      sales_order: {
        id: so.id,
        so_number: so.so_number,
        customer_name: so.customer.name,
        customer_email: so.customer.email,
        order_date: so.order_date,
        status: so.status,
        is_confirmed: so.is_confirmed,
        total_amount: so.total_amount
      },
      health,
      blockers,
      metrics: {
        total_ordered_qty: totalOrderedQty,
        total_produced_qty: totalProducedQty,
        total_qc_accepted_qty: totalQcAcceptedQty,
        total_dispatched_qty: totalDispatchedQty,
        balance_qty: totalBalanceQty,
        completion_pct: parseFloat(completionPct.toFixed(1)),
        order_value: so.total_amount
      },
      stages
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Control Tower data' }, { status: 500 });
  }
}
