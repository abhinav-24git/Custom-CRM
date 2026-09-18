import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const planning = await tx.planning.findUnique({
        where: { id },
        include: { JobCards: true }
      });

      if (!planning) {
        throw new Error('Planning not found');
      }

      if (planning.status !== 'Draft') {
        throw new Error(`Only Draft plannings can be released (current status: ${planning.status})`);
      }

      // Auto-generate JobCard if inhouse_qty > 0 and no JobCard yet
      if (planning.inhouse_qty > 0 && planning.JobCards.length === 0) {
        const count = await tx.jobCard.count();
        const job_card_number = `JC-${String(count + 1).padStart(4, '0')}`;
        await tx.jobCard.create({
          data: {
            job_card_number,
            planning_id: planning.id,
            planned_qty: planning.inhouse_qty,
            status: 'Released',
            target_start_date: planning.target_start_date,
            target_end_date: planning.target_end_date
          }
        });
      }

      const updatedPlanning = await tx.planning.update({
        where: { id },
        data: { status: 'Released' },
        include: {
          JobCards: true,
          JobWorkRFQs: true
        }
      });

      return updatedPlanning;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to release planning' }, { status: 400 });
  }
}
