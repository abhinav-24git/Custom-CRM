import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json().catch(() => ({}));
    const { resolution_notes } = json;
    const user = await getCurrentUser(request);

    const result = await prisma.$transaction(async (tx) => {
      const action = await tx.feedbackAction.findUnique({
        where: { id },
        include: { feedback: true }
      });

      if (!action) {
        throw new Error('Feedback Action not found');
      }

      // Update action to Resolved
      const updatedAction = await tx.feedbackAction.update({
        where: { id },
        data: {
          status: 'Resolved',
          action_notes: resolution_notes
            ? `${action.action_notes || ''}\nResolution: ${resolution_notes}`.trim()
            : action.action_notes
        }
      });

      // Update feedback status to Resolved
      await tx.feedback.update({
        where: { id: action.feedback_id },
        data: { status: 'Resolved' }
      });

      await logAudit(user?.id, 'resolve_feedback_action', 'feedbacks', action.feedback_id, { action_id: id }, { status: 'Resolved' });

      return updatedAction;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to resolve action' }, { status: 400 });
  }
}
