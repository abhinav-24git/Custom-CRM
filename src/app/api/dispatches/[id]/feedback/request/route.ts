import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(request);

    const result = await prisma.$transaction(async (tx) => {
      const dispatch = await tx.dispatch.findUnique({
        where: { id },
        include: { sales_order: true, Feedbacks: true }
      });

      if (!dispatch) {
        throw new Error('Dispatch not found');
      }

      const existingRequested = dispatch.Feedbacks.find(f => f.status === 'Requested');
      if (existingRequested) {
        return existingRequested;
      }

      const count = await tx.feedback.count();
      const feedback_number = `FB-${String(count + 1).padStart(4, '0')}`;

      const feedback = await tx.feedback.create({
        data: {
          feedback_number,
          dispatch_id: dispatch.id,
          customer_id: dispatch.sales_order.customer_id,
          status: 'Requested',
          requested_at: new Date()
        },
        include: {
          customer: true,
          dispatch: true
        }
      });

      await logAudit(user?.id, 'create', 'feedbacks', feedback.id, null, { feedback_number, dispatch_id: dispatch.id });

      return feedback;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to request feedback' }, { status: 400 });
  }
}
