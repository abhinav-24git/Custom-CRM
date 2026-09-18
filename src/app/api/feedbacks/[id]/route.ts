import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        customer: true,
        dispatch: {
          include: {
            sales_order: true,
            items: {
              include: {
                sales_order_item: {
                  include: { item: true }
                }
              }
            }
          }
        },
        actions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback record not found' }, { status: 404 });
    }

    return NextResponse.json(feedback);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feedback details' }, { status: 500 });
  }
}
