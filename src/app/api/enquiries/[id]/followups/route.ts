import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json();

    if (!json.followup_date || !json.outcome) {
      return NextResponse.json({ error: 'Date and outcome are required' }, { status: 400 });
    }

    const followup = await prisma.followup.create({
      data: {
        enquiry_id: id,
        followup_date: new Date(json.followup_date),
        outcome: json.outcome,
        next_followup_date: json.next_followup_date ? new Date(json.next_followup_date) : null
      }
    });
    
    // Optionally auto-update status to Contacted if it was New
    const enquiry = await prisma.enquiry.findUnique({ where: { id } });
    if (enquiry?.status === 'New') {
      await prisma.enquiry.update({
        where: { id },
        data: { status: 'Contacted' }
      });
    }

    return NextResponse.json(followup, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to add followup' }, { status: 500 });
  }
}
