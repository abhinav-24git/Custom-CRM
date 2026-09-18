import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobCard = await prisma.jobCard.findUnique({
      where: { id },
      include: {
        planning: {
          include: {
            sales_order_item: {
              include: {
                sales_order: { include: { customer: true } },
                item: true
              }
            }
          }
        },
        productionEntries: {
          orderBy: { entry_date: 'desc' }
        }
      }
    });

    if (!jobCard) {
      return NextResponse.json({ error: 'Job Card not found' }, { status: 404 });
    }

    const total_produced = jobCard.productionEntries.reduce((sum, e) => sum + e.produced_qty, 0);
    const total_rejected = jobCard.productionEntries.reduce((sum, e) => sum + e.rejected_qty, 0);
    const balance_qty = Math.max(0, jobCard.planned_qty - (total_produced + total_rejected));

    return NextResponse.json({
      ...jobCard,
      total_produced,
      total_rejected,
      balance_qty
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch job card' }, { status: 500 });
  }
}
