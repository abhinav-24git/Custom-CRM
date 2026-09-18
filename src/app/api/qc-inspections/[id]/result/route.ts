import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { accepted_qty, rejected_qty, rework_qty, remarks, action } = json;

    const acc = parseFloat(accepted_qty) || 0;
    const rej = parseFloat(rejected_qty) || 0;
    const rew = parseFloat(rework_qty) || 0;

    if (acc < 0 || rej < 0 || rew < 0) {
      return NextResponse.json({ error: 'Accepted, rejected, and rework quantities must be non-negative' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const qc = await tx.qCInspection.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!qc) {
        throw new Error('QC Inspection not found');
      }

      if (qc.status === 'Completed') {
        throw new Error('Inspection has already been completed and cannot be resubmitted');
      }

      const qcItem = qc.items[0];
      if (!qcItem) {
        throw new Error('QC Inspection line item not found');
      }

      const inspected = qcItem.inspected_qty;
      const sum = acc + rej + rew;

      if (Math.abs(sum - inspected) > 0.0001) {
        throw new Error(
          `Reconciliation error: Accepted (${acc}) + Rejected (${rej}) + Rework (${rew}) = ${sum}, which must exactly equal Inspected quantity (${inspected})`
        );
      }

      // Update QC Inspection Item
      await tx.qCInspectionItem.update({
        where: { id: qcItem.id },
        data: {
          accepted_qty: acc,
          rejected_qty: rej,
          rework_qty: rew,
          remarks: remarks || null
        }
      });

      // If action is specified (e.g. for rejected or rework goods)
      if (action && action.action_type && action.owner) {
        await tx.qCAction.create({
          data: {
            qc_inspection_item_id: qcItem.id,
            action_type: action.action_type,
            owner: action.owner,
            due_date: action.due_date ? new Date(action.due_date) : null,
            status: 'Open'
          }
        });
      }

      // Mark QC Inspection as Completed
      const updatedQc = await tx.qCInspection.update({
        where: { id: qc.id },
        data: { status: 'Completed' },
        include: {
          items: {
            include: { actions: true }
          }
        }
      });

      return updatedQc;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit QC result' }, { status: 400 });
  }
}
