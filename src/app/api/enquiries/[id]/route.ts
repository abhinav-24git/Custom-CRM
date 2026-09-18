import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const enquiry = await prisma.enquiry.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { item: true }
        },
        followups: {
          orderBy: { createdAt: 'desc' }
        },
        quotations: true
      }
    });
    if (!enquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(enquiry);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch enquiry' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json();
    
    const enquiry = await prisma.enquiry.update({
      where: { id },
      data: {
        status: json.status,
        notes: json.notes,
      },
    });

    return NextResponse.json(enquiry);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 });
  }
}
