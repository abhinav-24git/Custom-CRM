import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const jobCard = await tx.jobCard.findUnique({
        where: { id },
        include: { planning: true }
      });

      if (!jobCard) {
        throw new Error('Job Card not found');
      }

      if (jobCard.status === 'Completed' || jobCard.status === 'Closed') {
        throw new Error(`Cannot start a Job Card in '${jobCard.status}' status`);
      }

      const updatedJobCard = await tx.jobCard.update({
        where: { id },
        data: { status: 'In Progress' }
      });

      // Update parent planning to 'In Progress' if not already
      if (jobCard.planning.status === 'Released' || jobCard.planning.status === 'Draft') {
        await tx.planning.update({
          where: { id: jobCard.planning_id },
          data: { status: 'In Progress' }
        });
      }

      return updatedJobCard;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to start Job Card' }, { status: 400 });
  }
}
