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

    const whereDispatch: any = Object.keys(dateFilter).length > 0 ? { dispatch_date: dateFilter } : {};

    const dispatches = await prisma.dispatch.findMany({
      where: whereDispatch,
      include: {
        sales_order: {
          include: { customer: true }
        },
        items: true,
        Feedbacks: {
          include: { actions: true }
        }
      },
      orderBy: { dispatch_date: 'desc' }
    });

    let totalUnitsDispatched = 0;
    let totalRatedDispatches = 0;
    let sumRatings = 0;
    let openFeedbackActions = 0;

    const rows = dispatches.map(d => {
      const dispatchedUnits = d.items.reduce((s, i) => s + i.dispatched_qty, 0);
      totalUnitsDispatched += dispatchedUnits;

      const fb = d.Feedbacks[0] || null;
      if (fb && fb.rating !== null && fb.rating !== undefined) {
        totalRatedDispatches++;
        sumRatings += fb.rating;
      }

      if (fb && fb.status === 'Action Open') {
        openFeedbackActions++;
      }

      return {
        id: d.id,
        dispatch_number: d.dispatch_number,
        date: d.dispatch_date,
        so_number: d.sales_order?.so_number || '-',
        customer_name: d.sales_order?.customer?.name || '-',
        transporter: d.transporter || '-',
        vehicle_number: d.vehicle_number || '-',
        dispatched_units: dispatchedUnits,
        feedback_status: fb ? fb.status : 'Not Requested',
        customer_rating: fb && fb.rating ? `${fb.rating}/5` : 'N/A',
        comments: fb?.comments || '-'
      };
    });

    const avgRating = totalRatedDispatches > 0 ? sumRatings / totalRatedDispatches : 0;

    return NextResponse.json({
      summary: {
        total_dispatches_count: dispatches.length,
        total_units_dispatched: totalUnitsDispatched,
        average_customer_rating: parseFloat(avgRating.toFixed(2)),
        rated_feedback_count: totalRatedDispatches,
        open_action_tickets: openFeedbackActions
      },
      rows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Dispatch & Feedback Summary report' }, { status: 500 });
  }
}
