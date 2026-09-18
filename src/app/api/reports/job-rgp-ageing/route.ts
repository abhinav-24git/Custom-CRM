import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [jobCards, rgps] = await Promise.all([
      prisma.jobCard.findMany({
        include: {
          planning: {
            include: {
              sales_order_item: {
                include: { item: true, sales_order: { include: { customer: true } } }
              }
            }
          },
          productionEntries: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.rGPChallan.findMany({
        include: {
          vendor: true,
          service_order: true,
          returns: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const now = Date.now();

    const jobCardRows = jobCards.map(jc => {
      const produced = jc.productionEntries.reduce((s, e) => s + e.produced_qty, 0);
      const rejected = jc.productionEntries.reduce((s, e) => s + e.rejected_qty, 0);
      const balance = Math.max(0, jc.planned_qty - (produced + rejected));

      const daysOpen = Math.max(0, Math.floor((now - new Date(jc.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: jc.id,
        number: jc.job_card_number,
        item_name: jc.planning?.sales_order_item?.item?.name || '-',
        customer_name: jc.planning?.sales_order_item?.sales_order?.customer?.name || '-',
        planned_qty: jc.planned_qty,
        produced_qty: produced,
        rejected_qty: rejected,
        balance_qty: balance,
        status: jc.status,
        days_open: daysOpen
      };
    });

    const rgpRows = rgps.map(rgp => {
      const returned = rgp.returns.reduce((s, r) => s + r.received_qty, 0);
      const pending = Math.max(0, rgp.sent_qty - returned);
      const daysOut = Math.max(0, Math.floor((now - new Date(rgp.challan_date).getTime()) / (1000 * 60 * 60 * 24)));

      return {
        id: rgp.id,
        rgp_number: rgp.rgp_number,
        vendor_name: rgp.vendor?.name,
        so_number: rgp.service_order?.service_order_number,
        sent_qty: rgp.sent_qty,
        returned_qty: returned,
        pending_qty: pending,
        days_outstanding: daysOut,
        status: rgp.status
      };
    });

    const activeJobCards = jobCardRows.filter(j => j.status !== 'Closed' && j.status !== 'Completed');
    const openRgps = rgpRows.filter(r => r.status !== 'Closed');

    return NextResponse.json({
      summary: {
        active_job_cards_count: activeJobCards.length,
        total_inhouse_wip_qty: activeJobCards.reduce((s, j) => s + j.balance_qty, 0),
        outstanding_rgps_count: openRgps.length,
        total_outsource_pending_qty: openRgps.reduce((s, r) => s + r.pending_qty, 0)
      },
      job_cards: jobCardRows,
      rgp_challans: rgpRows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Job WIP and RGP Ageing report' }, { status: 500 });
  }
}
