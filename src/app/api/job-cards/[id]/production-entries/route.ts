import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { produced_qty, rejected_qty, entry_date, remarks } = json;

    const produced = parseFloat(produced_qty) || 0;
    const rejected = parseFloat(rejected_qty) || 0;

    if (produced < 0 || rejected < 0) {
      return NextResponse.json({ error: 'Produced and rejected quantities must be non-negative' }, { status: 400 });
    }

    if (produced + rejected <= 0) {
      return NextResponse.json({ error: 'Total entry quantity (produced + rejected) must be > 0' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const jobCard = await tx.jobCard.findUnique({
        where: { id },
        include: {
          productionEntries: true,
          planning: {
            include: {
              JobCards: { include: { productionEntries: true } },
              JobWorkRFQs: { include: { ServiceOrders: true } }
            }
          }
        }
      });

      if (!jobCard) {
        throw new Error('Job Card not found');
      }

      if (jobCard.status === 'Closed') {
        throw new Error('Cannot add production entry to a Closed Job Card');
      }

      // Check current totals
      const currentProduced = jobCard.productionEntries.reduce((sum, e) => sum + e.produced_qty, 0);
      const currentRejected = jobCard.productionEntries.reduce((sum, e) => sum + e.rejected_qty, 0);
      const currentTotal = currentProduced + currentRejected;
      const newTotal = currentTotal + produced + rejected;

      if (newTotal > jobCard.planned_qty + 0.0001) {
        throw new Error(
          `Over-production not allowed. Planned: ${jobCard.planned_qty}, Current total: ${currentTotal}, Attempting to add: ${produced + rejected}, Remaining allowable: ${Math.max(0, jobCard.planned_qty - currentTotal)}`
        );
      }

      // Create production entry
      const entry = await tx.productionEntry.create({
        data: {
          job_card_id: jobCard.id,
          produced_qty: produced,
          rejected_qty: rejected,
          entry_date: entry_date ? new Date(entry_date) : new Date(),
          remarks: remarks || null
        }
      });

      // Update Job Card status
      let newJobCardStatus = 'In Progress';
      if (Math.abs(newTotal - jobCard.planned_qty) < 0.0001) {
        newJobCardStatus = 'Completed';
      }

      await tx.jobCard.update({
        where: { id: jobCard.id },
        data: { status: newJobCardStatus }
      });

      // V6: Auto-create QC Inspection when Job Card becomes Completed
      if (newJobCardStatus === 'Completed') {
        const existingQc = await tx.qCInspection.findFirst({
          where: { source_type: 'Job Card', source_id: jobCard.id }
        });

        const totalGoodProduced = currentProduced + produced;
        if (!existingQc && totalGoodProduced > 0) {
          const qcCount = await tx.qCInspection.count();
          const qc_number = `QC-${String(qcCount + 1).padStart(4, '0')}`;

          await tx.qCInspection.create({
            data: {
              qc_number,
              source_type: 'Job Card',
              source_id: jobCard.id,
              sales_order_item_id: jobCard.planning.sales_order_item_id,
              status: 'Pending',
              items: {
                create: {
                  inspected_qty: totalGoodProduced
                }
              }
            }
          });
        }
      }

      // Update parent planning status
      const planning = jobCard.planning;
      let newPlanningStatus = 'In Progress';

      // Check if all in-house job cards and outsource service orders are completed
      const allJobCardsCompleted = planning.JobCards.every(jc => {
        if (jc.id === jobCard.id) return newJobCardStatus === 'Completed';
        const p = jc.productionEntries.reduce((s, e) => s + e.produced_qty + e.rejected_qty, 0);
        return Math.abs(p - jc.planned_qty) < 0.0001;
      });

      const allServiceOrdersCompleted = planning.JobWorkRFQs.every(rfq =>
        rfq.ServiceOrders.length > 0 && rfq.ServiceOrders.every(so => so.status === 'Completed' || so.status === 'Closed')
      );

      const hasOutsource = planning.outsource_qty > 0;
      const hasInhouse = planning.inhouse_qty > 0;

      if ((!hasInhouse || allJobCardsCompleted) && (!hasOutsource || allServiceOrdersCompleted)) {
        newPlanningStatus = 'Completed';
      }

      await tx.planning.update({
        where: { id: planning.id },
        data: { status: newPlanningStatus }
      });

      return entry;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record production entry' }, { status: 400 });
  }
}
