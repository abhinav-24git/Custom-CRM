import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    const whereClause: any = {};
    if (statusParam && statusParam !== 'All') {
      whereClause.status = statusParam;
    }

    const feedbacks = await prisma.feedback.findMany({
      where: whereClause,
      include: {
        customer: true,
        dispatch: {
          include: {
            sales_order: true
          }
        },
        actions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(feedbacks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
  }
}
