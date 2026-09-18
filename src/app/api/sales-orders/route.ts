import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.salesOrder.findMany({
      include: {
        customer: true,
        lines: true
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.customer_id || !json.lines || json.lines.length === 0) {
      return NextResponse.json({ error: 'Customer and at least one line item are required' }, { status: 400 });
    }

    // Generate simple SO Number
    const count = await prisma.salesOrder.count();
    const so_number = `SO-${String(count + 1).padStart(4, '0')}`;

    let total_amount = 0;
    const linesToCreate = json.lines.map((line: any) => {
      if (line.ordered_qty <= 0 || line.rate < 0) {
        throw new Error('Invalid qty or rate');
      }
      const amount = line.ordered_qty * line.rate;
      total_amount += amount;
      return {
        item_id: line.item_id,
        ordered_qty: line.ordered_qty,
        rate: line.rate,
        amount: amount,
        balance_qty: line.ordered_qty
      };
    });

    const order = await prisma.salesOrder.create({
      data: {
        so_number,
        customer_id: json.customer_id,
        order_date: json.order_date ? new Date(json.order_date) : new Date(),
        total_amount,
        lines: {
          create: linesToCreate
        }
      },
      include: {
        lines: true
      }
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create sales order' }, { status: 500 });
  }
}
