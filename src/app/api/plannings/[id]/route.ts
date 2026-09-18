import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const planning = await prisma.planning.findUnique({
      where: { id },
      include: {
        sales_order_item: {
          include: {
            sales_order: {
              include: { customer: true }
            },
            item: true
          }
        },
        JobCards: {
          include: {
            productionEntries: {
              orderBy: { entry_date: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        JobWorkRFQs: {
          include: {
            suppliers: {
              include: { supplier: true }
            },
            quotes: {
              include: { supplier: true }
            },
            ServiceOrders: {
              include: {
                supplier: true,
                rgpChallans: {
                  include: { returns: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!planning) {
      return NextResponse.json({ error: 'Planning not found' }, { status: 404 });
    }

    return NextResponse.json(planning);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch planning' }, { status: 500 });
  }
}
