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

    const whereSO: any = Object.keys(dateFilter).length > 0 ? { order_date: dateFilter } : {};

    const orders = await prisma.salesOrder.findMany({
      where: whereSO,
      include: {
        customer: true,
        lines: true
      },
      orderBy: { order_date: 'desc' }
    });

    let totalValue = 0;
    let fulfilledValue = 0;
    let backlogValue = 0;

    const rows = orders.map(so => {
      totalValue += so.total_amount;

      const totalOrderedQty = so.lines.reduce((s, l) => s + l.ordered_qty, 0);
      const totalDispatchedQty = so.lines.reduce((s, l) => s + l.dispatched_qty, 0);
      const totalBalanceQty = so.lines.reduce((s, l) => s + l.balance_qty, 0);

      const fulfillmentPct = totalOrderedQty > 0 ? (totalDispatchedQty / totalOrderedQty) * 100 : 0;
      const orderFulfilledVal = so.lines.reduce((s, l) => s + (l.dispatched_qty * l.rate), 0);
      const orderBacklogVal = so.lines.reduce((s, l) => s + (l.balance_qty * l.rate), 0);

      fulfilledValue += orderFulfilledVal;
      backlogValue += orderBacklogVal;

      return {
        id: so.id,
        so_number: so.so_number,
        date: so.order_date,
        customer_name: so.customer.name,
        is_confirmed: so.is_confirmed,
        status: so.status,
        total_amount: so.total_amount,
        ordered_qty: totalOrderedQty,
        dispatched_qty: totalDispatchedQty,
        balance_qty: totalBalanceQty,
        fulfillment_pct: parseFloat(fulfillmentPct.toFixed(1)),
        backlog_value: orderBacklogVal
      };
    });

    return NextResponse.json({
      summary: {
        total_orders_count: orders.length,
        total_order_value: parseFloat(totalValue.toFixed(2)),
        dispatched_revenue: parseFloat(fulfilledValue.toFixed(2)),
        unfulfilled_backlog_value: parseFloat(backlogValue.toFixed(2))
      },
      rows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Sales Pipeline report' }, { status: 500 });
  }
}
