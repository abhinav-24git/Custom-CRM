import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const whereQC: any = Object.keys(dateFilter).length > 0 ? { inspection_date: dateFilter } : {};

    const inspections = await prisma.qCInspection.findMany({
      where: whereQC,
      include: {
        sales_order_item: {
          include: { item: true, sales_order: { include: { customer: true } } }
        },
        items: {
          include: { actions: true }
        }
      },
      orderBy: { inspection_date: 'desc' }
    });

    let totalInspected = 0;
    let totalAccepted = 0;
    let totalRejected = 0;
    let totalRework = 0;

    const rows = inspections.map(qc => {
      const lineItem = qc.items[0];
      const inspected = lineItem?.inspected_qty || 0;
      const accepted = lineItem?.accepted_qty || 0;
      const rejected = lineItem?.rejected_qty || 0;
      const rework = lineItem?.rework_qty || 0;

      totalInspected += inspected;
      totalAccepted += accepted;
      totalRejected += rejected;
      totalRework += rework;

      const rejectPct = inspected > 0 ? (rejected / inspected) * 100 : 0;
      const reworkPct = inspected > 0 ? (rework / inspected) * 100 : 0;
      const passPct = inspected > 0 ? (accepted / inspected) * 100 : 0;

      return {
        id: qc.id,
        qc_number: qc.qc_number,
        source_type: qc.source_type,
        date: qc.inspection_date,
        item_name: qc.sales_order_item?.item?.name || '-',
        customer_name: qc.sales_order_item?.sales_order?.customer?.name || '-',
        status: qc.status,
        inspected_qty: inspected,
        accepted_qty: accepted,
        rejected_qty: rejected,
        rework_qty: rework,
        pass_rate_pct: parseFloat(passPct.toFixed(1)),
        reject_rate_pct: parseFloat(rejectPct.toFixed(1)),
        rework_rate_pct: parseFloat(reworkPct.toFixed(1))
      };
    });

    const overallPassRate = totalInspected > 0 ? (totalAccepted / totalInspected) * 100 : 0;
    const overallRejectRate = totalInspected > 0 ? (totalRejected / totalInspected) * 100 : 0;
    const overallReworkRate = totalInspected > 0 ? (totalRework / totalInspected) * 100 : 0;

    return NextResponse.json({
      summary: {
        total_inspections_count: inspections.length,
        total_inspected_qty: totalInspected,
        total_accepted_qty: totalAccepted,
        total_rejected_qty: totalRejected,
        total_rework_qty: totalRework,
        overall_pass_rate_pct: parseFloat(overallPassRate.toFixed(1)),
        overall_rejection_rate_pct: parseFloat(overallRejectRate.toFixed(1)),
        overall_rework_rate_pct: parseFloat(overallReworkRate.toFixed(1))
      },
      rows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate QC Rejection Rate report' }, { status: 500 });
  }
}
