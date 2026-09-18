import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { received_qty, accepted_qty, rejected_qty, rework_qty, return_date, challan_ref, remarks } = json;

    const rec = parseFloat(received_qty) || 0;
    const acc = parseFloat(accepted_qty) || 0;
    const rej = parseFloat(rejected_qty) || 0;
    const rew = parseFloat(rework_qty) || 0;

    if (rec <= 0) {
      return NextResponse.json({ error: 'Received quantity must be > 0' }, { status: 400 });
    }
    if (acc < 0 || rej < 0 || rew < 0) {
      return NextResponse.json({ error: 'Accepted, rejected, and rework quantities must be non-negative' }, { status: 400 });
    }

    if (Math.abs((acc + rej + rew) - rec) > 0.0001) {
      return NextResponse.json({
        error: `Reconciliation error: Accepted (${acc}) + Rejected (${rej}) + Rework (${rew}) = ${acc + rej + rew}, which must equal Received (${rec})`
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const rgp = await tx.rGPChallan.findUnique({
        where: { id },
        include: {
          returns: true,
          service_order: {
            include: {
              jobwork_rfq: {
                include: {
                  planning: {
                    include: {
                      JobCards: { include: { productionEntries: true } },
                      JobWorkRFQs: {
                        include: {
                          ServiceOrders: {
                            include: {
                              rgpChallans: { include: { returns: true } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!rgp) {
        throw new Error('RGP Challan not found');
      }

      if (rgp.status === 'Closed') {
        throw new Error('Cannot add return to a Closed RGP Challan');
      }

      const alreadyReturned = rgp.returns.reduce((sum, r) => sum + r.received_qty, 0);
      const remainingReturnable = rgp.sent_qty - alreadyReturned;

      if (alreadyReturned + rec > rgp.sent_qty + 0.0001) {
        throw new Error(
          `Over-return not allowed. Sent: ${rgp.sent_qty}, Already returned: ${alreadyReturned}, Attempting to return: ${rec}, Remaining returnable: ${Math.max(0, remainingReturnable)}`
        );
      }

      const retEntry = await tx.rGPReturn.create({
        data: {
          rgp_challan_id: rgp.id,
          received_qty: rec,
          accepted_qty: acc,
          rejected_qty: rej,
          rework_qty: rew,
          return_date: return_date ? new Date(return_date) : new Date(),
          challan_ref: challan_ref || null,
          remarks: remarks || null
        }
      });

      // V6: Auto-create QC Inspection for RGP Return (inspected_qty = accepted_qty from return receipt)
      const soItemId = rgp.service_order.jobwork_rfq?.planning?.sales_order_item_id;
      if (soItemId && acc > 0) {
        const qcCount = await tx.qCInspection.count();
        const qc_number = `QC-${String(qcCount + 1).padStart(4, '0')}`;

        await tx.qCInspection.create({
          data: {
            qc_number,
            source_type: 'RGP Return',
            source_id: retEntry.id,
            sales_order_item_id: soItemId,
            status: 'Pending',
            items: {
              create: {
                inspected_qty: acc
              }
            }
          }
        });
      }

      // Update RGP status
      const totalReturnedNow = alreadyReturned + rec;
      const isRgpClosed = Math.abs(totalReturnedNow - rgp.sent_qty) < 0.0001 || totalReturnedNow >= rgp.sent_qty;
      const newRgpStatus = isRgpClosed ? 'Closed' : 'Partially Returned';

      await tx.rGPChallan.update({
        where: { id: rgp.id },
        data: { status: newRgpStatus }
      });

      // Recompute Service Order status
      const soId = rgp.service_order_id;
      const allRgpOfSo = await tx.rGPChallan.findMany({
        where: { service_order_id: soId },
        include: { returns: true }
      });

      const totalAcceptedOnSo = allRgpOfSo.flatMap(r => r.returns).reduce((sum, r) => sum + r.accepted_qty, 0);
      const totalReceivedOnSo = allRgpOfSo.flatMap(r => r.returns).reduce((sum, r) => sum + r.received_qty, 0);

      let newSoStatus = 'In Progress';
      if (totalAcceptedOnSo >= rgp.service_order.ordered_qty - 0.0001) {
        newSoStatus = 'Completed';
      } else if (totalReceivedOnSo > 0) {
        newSoStatus = 'Partially Received';
      }

      await tx.serviceOrder.update({
        where: { id: soId },
        data: { status: newSoStatus }
      });

      // Update parent Planning status if applicable
      const planning = rgp.service_order.jobwork_rfq?.planning;
      if (planning) {
        const allJobCardsCompleted = planning.JobCards.every(jc => {
          const p = jc.productionEntries.reduce((s, e) => s + e.produced_qty + e.rejected_qty, 0);
          return Math.abs(p - jc.planned_qty) < 0.0001;
        });

        // Check all service orders across all RFQs of this planning
        const allRFQs = await tx.jobWorkRFQ.findMany({
          where: { planning_id: planning.id },
          include: {
            ServiceOrders: {
              include: {
                rgpChallans: { include: { returns: true } }
              }
            }
          }
        });

        const allSoCompleted = allRFQs.every(rfq =>
          rfq.ServiceOrders.length > 0 && rfq.ServiceOrders.every(so => {
            if (so.id === soId) return newSoStatus === 'Completed';
            const accepted = so.rgpChallans.flatMap(r => r.returns).reduce((s, ret) => s + ret.accepted_qty, 0);
            return accepted >= so.ordered_qty - 0.0001;
          })
        );

        const hasOutsource = planning.outsource_qty > 0;
        const hasInhouse = planning.inhouse_qty > 0;

        let newPlanningStatus = 'In Progress';
        if ((!hasInhouse || allJobCardsCompleted) && (!hasOutsource || allSoCompleted)) {
          newPlanningStatus = 'Completed';
        }

        await tx.planning.update({
          where: { id: planning.id },
          data: { status: newPlanningStatus }
        });
      }

      return retEntry;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record Return GRN' }, { status: 400 });
  }
}
