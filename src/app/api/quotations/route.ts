import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const quotations = await prisma.quotation.findMany({
      where: { is_latest_revision: true },
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(quotations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quotations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.customer_id || !json.lines || json.lines.length === 0) {
      return NextResponse.json({ error: 'Customer and at least one line item are required' }, { status: 400 });
    }

    const count = await prisma.quotation.count({
      where: { revision_number: 0 } // unique quotations count
    });
    const quotation_number = `Q-${String(count + 1).padStart(4, '0')}`;

    let total_amount = 0;
    const linesToCreate = json.lines.map((line: any) => {
      if (line.qty <= 0 || line.rate < 0) {
        throw new Error('Invalid qty or rate');
      }
      const amount = (line.qty * line.rate) - (line.discount || 0);
      total_amount += amount;
      return {
        item_id: line.item_id,
        qty: parseFloat(line.qty),
        rate: parseFloat(line.rate),
        discount: parseFloat(line.discount || 0),
        amount: amount
      };
    });

    const quotation = await prisma.quotation.create({
      data: {
        quotation_number,
        customer_id: json.customer_id,
        quotation_date: json.quotation_date ? new Date(json.quotation_date) : new Date(),
        validity_date: json.validity_date ? new Date(json.validity_date) : null,
        total_amount,
        lines: {
          create: linesToCreate
        }
      },
      include: {
        lines: true
      }
    });

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create quotation' }, { status: 500 });
  }
}
