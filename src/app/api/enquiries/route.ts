import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: {
        customer: true,
        items: true,
        followups: true
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(enquiries);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch enquiries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.customer_id || !json.items || json.items.length === 0) {
      return NextResponse.json({ error: 'Customer and at least one item are required' }, { status: 400 });
    }

    const count = await prisma.enquiry.count();
    const enquiry_number = `ENQ-${String(count + 1).padStart(4, '0')}`;

    const itemsToCreate = json.items.map((line: any) => {
      if (line.requested_qty <= 0) {
        throw new Error('Requested quantity must be greater than 0');
      }
      return {
        item_id: line.item_id,
        requested_qty: parseFloat(line.requested_qty),
        target_date: line.target_date ? new Date(line.target_date) : null,
        notes: line.notes || null,
      };
    });

    const enquiry = await prisma.enquiry.create({
      data: {
        enquiry_number,
        customer_id: json.customer_id,
        enquiry_date: json.enquiry_date ? new Date(json.enquiry_date) : new Date(),
        source: json.source || null,
        notes: json.notes || null,
        items: {
          create: itemsToCreate
        }
      },
      include: {
        items: true
      }
    });

    return NextResponse.json(enquiry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create enquiry' }, { status: 500 });
  }
}
