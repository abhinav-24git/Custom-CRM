import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const qc = await prisma.qCInspection.findUnique({
      where: { id },
      include: {
        sales_order_item: {
          include: {
            sales_order: {
              include: { customer: true }
            },
            item: true
          }
        },
        items: {
          include: {
            actions: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!qc) {
      return NextResponse.json({ error: 'QC Inspection not found' }, { status: 404 });
    }

    let sourceDetails: any = null;
    if (qc.source_type === 'Job Card') {
      const jc = await prisma.jobCard.findUnique({
        where: { id: qc.source_id },
        include: {
          planning: {
            include: {
              sales_order_item: {
                include: { item: true }
              }
            }
          },
          productionEntries: true
        }
      });
      sourceDetails = {
        id: jc?.id,
        number: jc?.job_card_number,
        type: 'Job Card',
        machine: jc?.machine,
        process: jc?.process,
        operator: jc?.operator,
        planned_qty: jc?.planned_qty
      };
    } else if (qc.source_type === 'RGP Return') {
      const ret = await prisma.rGPReturn.findUnique({
        where: { id: qc.source_id },
        include: {
          rgp_challan: {
            include: {
              vendor: true,
              service_order: true
            }
          }
        }
      });
      sourceDetails = {
        id: ret?.id,
        number: ret?.rgp_challan?.rgp_number,
        type: 'RGP Return',
        challan_ref: ret?.challan_ref,
        vendor_name: ret?.rgp_challan?.vendor?.name,
        service_order_number: ret?.rgp_challan?.service_order?.service_order_number,
        received_qty: ret?.received_qty,
        accepted_qty: ret?.accepted_qty
      };
    }

    return NextResponse.json({
      ...qc,
      source_details: sourceDetails
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch QC inspection' }, { status: 500 });
  }
}
