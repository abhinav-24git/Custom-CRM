import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const jobCards = await prisma.jobCard.findMany({
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
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compute progress summaries for each job card
    const jobCardsWithStats = jobCards.map(jc => {
      const produced = jc.productionEntries.reduce((sum, e) => sum + e.produced_qty, 0);
      const rejected = jc.productionEntries.reduce((sum, e) => sum + e.rejected_qty, 0);
      const balance = Math.max(0, jc.planned_qty - (produced + rejected));
      return {
        ...jc,
        total_produced: produced,
        total_rejected: rejected,
        balance_qty: balance
      };
    });

    return NextResponse.json(jobCardsWithStats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch job cards' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { planning_id, machine, process, operator, target_start_date, target_end_date } = json;

    if (!planning_id) {
      return NextResponse.json({ error: 'Planning ID is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const planning = await tx.planning.findUnique({
        where: { id: planning_id }
      });

      if (!planning) {
        throw new Error('Planning not found');
      }

      if (planning.status === 'Draft' || planning.status === 'Cancelled') {
        throw new Error(`Cannot create Job Card for Planning in '${planning.status}' status. Release the planning first.`);
      }

      if (planning.inhouse_qty <= 0) {
        throw new Error('Planning does not have any in-house quantity allocated');
      }

      const count = await tx.jobCard.count();
      const job_card_number = `JC-${String(count + 1).padStart(4, '0')}`;

      const jobCard = await tx.jobCard.create({
        data: {
          job_card_number,
          planning_id: planning.id,
          planned_qty: planning.inhouse_qty,
          machine: machine || null,
          process: process || null,
          operator: operator || null,
          target_start_date: target_start_date ? new Date(target_start_date) : planning.target_start_date,
          target_end_date: target_end_date ? new Date(target_end_date) : planning.target_end_date,
          status: 'Released'
        },
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
          }
        }
      });

      return jobCard;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create Job Card' }, { status: 400 });
  }
}
