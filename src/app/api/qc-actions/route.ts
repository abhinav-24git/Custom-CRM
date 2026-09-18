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

    const actions = await prisma.qCAction.findMany({
      where: whereClause,
      include: {
        qc_inspection_item: {
          include: {
            qc_inspection: {
              include: {
                sales_order_item: {
                  include: {
                    sales_order: { include: { customer: true } },
                    item: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(actions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch QC actions' }, { status: 500 });
  }
}
