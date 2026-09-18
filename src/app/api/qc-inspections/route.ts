import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    const whereClause: any = {};
    if (statusParam && statusParam !== 'All') {
      whereClause.status = statusParam;
    }

    const inspections = await prisma.qCInspection.findMany({
      where: whereClause,
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
            actions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Populate source references
    const enriched = await Promise.all(
      inspections.map(async (qc) => {
        let sourceRef: any = null;
        if (qc.source_type === 'Job Card') {
          const jc = await prisma.jobCard.findUnique({
            where: { id: qc.source_id },
            include: { planning: true }
          });
          sourceRef = {
            id: jc?.id,
            number: jc?.job_card_number,
            type: 'Job Card'
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
          sourceRef = {
            id: ret?.id,
            number: ret?.rgp_challan?.rgp_number,
            challan_ref: ret?.challan_ref,
            vendor_name: ret?.rgp_challan?.vendor?.name,
            service_order_number: ret?.rgp_challan?.service_order?.service_order_number,
            type: 'RGP Return'
          };
        }

        const lineItem = qc.items[0] || null;

        return {
          ...qc,
          source_ref: sourceRef,
          inspected_qty: lineItem?.inspected_qty || 0,
          accepted_qty: lineItem?.accepted_qty || 0,
          rejected_qty: lineItem?.rejected_qty || 0,
          rework_qty: lineItem?.rework_qty || 0,
          remarks: lineItem?.remarks || null,
          has_actions: (lineItem?.actions?.length || 0) > 0
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch QC inspections' }, { status: 500 });
  }
}
