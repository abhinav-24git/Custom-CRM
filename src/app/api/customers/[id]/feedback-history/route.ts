import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const feedbacks = await prisma.feedback.findMany({
      where: { customer_id: id },
      include: {
        dispatch: {
          include: { sales_order: true }
        },
        actions: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const ratedFeedbacks = feedbacks.filter(f => f.rating !== null && f.rating !== undefined);
    const avgRating = ratedFeedbacks.length > 0
      ? ratedFeedbacks.reduce((s, f) => s + (f.rating || 0), 0) / ratedFeedbacks.length
      : 0;

    return NextResponse.json({
      customer_id: id,
      total_feedbacks: feedbacks.length,
      average_rating: parseFloat(avgRating.toFixed(2)),
      history: feedbacks
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch customer feedback history' }, { status: 500 });
  }
}
