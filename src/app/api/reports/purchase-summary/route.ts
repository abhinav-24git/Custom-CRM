import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    const wherePO: any = Object.keys(dateFilter).length > 0 ? { po_date: dateFilter } : {};

    const pos = await prisma.purchaseOrder.findMany({
      where: wherePO,
      include: {
        supplier: true,
        lines: {
          include: { material: true }
        },
        GRNs: {
          include: { items: true }
        }
      },
      orderBy: { po_date: 'desc' }
    });

    let totalSpend = 0;
    let totalReceivedValue = 0;

    const rows = pos.map(po => {
      totalSpend += po.total_amount;
      const totalOrderedQty = po.lines.reduce((s, l) => s + l.ordered_qty, 0);
      const totalReceivedQty = po.lines.reduce((s, l) => s + l.received_qty, 0);
      const totalPendingQty = po.lines.reduce((s, l) => s + l.pending_qty, 0);

      const poReceivedVal = po.lines.reduce((s, l) => s + (l.received_qty * l.rate), 0);
      totalReceivedValue += poReceivedVal;

      return {
        id: po.id,
        po_number: po.po_number,
        date: po.po_date,
        supplier_name: po.supplier.name,
        status: po.status,
        total_amount: po.total_amount,
        ordered_qty: totalOrderedQty,
        received_qty: totalReceivedQty,
        pending_qty: totalPendingQty,
        grn_count: po.GRNs.length
      };
    });

    return NextResponse.json({
      summary: {
        total_pos_count: pos.length,
        total_po_spend: parseFloat(totalSpend.toFixed(2)),
        received_material_value: parseFloat(totalReceivedValue.toFixed(2)),
        pending_material_value: parseFloat((totalSpend - totalReceivedValue).toFixed(2))
      },
      rows
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate Purchase Summary report' }, { status: 500 });
  }
}
