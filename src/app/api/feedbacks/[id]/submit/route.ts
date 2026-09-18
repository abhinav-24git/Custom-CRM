import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { rating, comments, action_owner, action_due_date } = json;

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    const user = await getCurrentUser(request);

    const result = await prisma.$transaction(async (tx) => {
      const fb = await tx.feedback.findUnique({
        where: { id }
      });

      if (!fb) {
        throw new Error('Feedback not found');
      }

      const isLowRating = ratingNum <= 2;
      const newStatus = isLowRating ? 'Action Open' : 'Received';

      // Update feedback record
      const updatedFb = await tx.feedback.update({
        where: { id },
        data: {
          rating: ratingNum,
          comments: comments || null,
          received_at: new Date(),
          status: newStatus
        }
      });

      // Auto-create FeedbackAction if low rating
      if (isLowRating) {
        await tx.feedbackAction.create({
          data: {
            feedback_id: fb.id,
            owner: action_owner || 'Customer Success Lead',
            due_date: action_due_date ? new Date(action_due_date) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days
            action_notes: `Low rating (${ratingNum}/5) received. Review customer comments: "${comments || 'No comments'}"`,
            status: 'Open'
          }
        });
      }

      await logAudit(user?.id, 'submit_feedback', 'feedbacks', fb.id, { status: fb.status }, { rating: ratingNum, status: newStatus });

      return updatedFb;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit feedback' }, { status: 400 });
  }
}
