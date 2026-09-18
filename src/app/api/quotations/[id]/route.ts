import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        lines: {
          include: { item: true }
        }
      }
    });
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Also fetch revision history
    const revisions = await prisma.quotation.findMany({
      where: { quotation_number: quotation.quotation_number },
      orderBy: { revision_number: 'desc' },
      select: { id: true, revision_number: true, status: true, total_amount: true, createdAt: true, is_latest_revision: true }
    });

    return NextResponse.json({ ...quotation, revisionHistory: revisions });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quotation' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json();

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing || existing.status !== 'Draft') {
      return NextResponse.json({ error: 'Only Draft quotations can be edited directly. Create a revision instead.' }, { status: 400 });
    }

    // A full PUT would normally update line items here. For brevity in this MVP logic block, 
    // we assume the user replaces all lines or just updates header fields. 
    // We'll update the header fields, delete old lines, and insert new ones.
    
    let total_amount = 0;
    const linesToCreate = json.lines.map((line: any) => {
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

    const quotation = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotation_id: id } });
      return await tx.quotation.update({
        where: { id },
        data: {
          customer_id: json.customer_id,
          validity_date: json.validity_date ? new Date(json.validity_date) : null,
          total_amount,
          lines: {
            create: linesToCreate
          }
        },
        include: { lines: true }
      });
    });

    return NextResponse.json(quotation);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update quotation' }, { status: 500 });
  }
}
