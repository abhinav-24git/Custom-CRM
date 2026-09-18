import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string, action: string }> }) {
  try {
    const { id, action } = await params;
    const json = await request.json().catch(() => ({}));

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!quotation.is_latest_revision) return NextResponse.json({ error: 'Can only act on the latest revision' }, { status: 400 });

    const statusFlow = {
      'submit': { from: ['Draft'], to: 'Pending Approval' },
      'approve': { from: ['Pending Approval'], to: 'Approved' },
      'send': { from: ['Approved'], to: 'Sent' },
      'accept': { from: ['Sent', 'Approved'], to: 'Accepted' },
      'reject': { from: ['Pending Approval', 'Sent'], to: 'Rejected' }
    };

    if (action === 'revision') {
      const result = await prisma.$transaction(async (tx) => {
        // Mark old as false
        await tx.quotation.update({
          where: { id },
          data: { is_latest_revision: false }
        });
        
        // Fetch old lines
        const oldLines = await tx.quotationItem.findMany({ where: { quotation_id: id } });

        // Duplicate
        const newQuotation = await tx.quotation.create({
          data: {
            quotation_number: quotation.quotation_number,
            revision_number: quotation.revision_number + 1,
            enquiry_id: quotation.enquiry_id,
            customer_id: quotation.customer_id,
            validity_date: quotation.validity_date,
            status: 'Draft',
            total_amount: quotation.total_amount,
            is_latest_revision: true,
            lines: {
              create: oldLines.map(l => ({
                item_id: l.item_id, qty: l.qty, rate: l.rate, discount: l.discount, amount: l.amount
              }))
            }
          }
        });
        return newQuotation;
      });
      return NextResponse.json(result);
    }

    if (!statusFlow[action as keyof typeof statusFlow]) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    const flow = statusFlow[action as keyof typeof statusFlow];

    if (!flow.from.includes(quotation.status)) {
      return NextResponse.json({ error: `Cannot ${action} from status ${quotation.status}` }, { status: 400 });
    }

    if (action === 'reject' && !json.comment) {
      return NextResponse.json({ error: 'Rejection comment is required' }, { status: 400 });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: flow.to,
        rejection_reason: action === 'reject' ? json.comment : quotation.rejection_reason
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 });
  }
}
