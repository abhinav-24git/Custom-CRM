import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string, action: string }> }) {
  try {
    const { id, action } = await params;
    const json = await request.json().catch(() => ({}));

    const rfq = await prisma.purchaseRFQ.findUnique({
      where: { id },
      include: { items: true, PurchaseOrders: true }
    });
    if (!rfq) return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });

    // mark-sent
    if (action === 'mark-sent') {
      if (rfq.status !== 'Draft') return NextResponse.json({ error: 'Only Draft RFQs can be marked as Sent' }, { status: 400 });
      const updated = await prisma.purchaseRFQ.update({ where: { id }, data: { status: 'Sent' } });
      return NextResponse.json(updated);
    }

    // submit-quote: body = { supplier_id, lines: [{ purchase_rfq_item_id, rate, lead_time_days }] }
    if (action === 'submit-quote') {
      const { supplier_id, lines } = json;
      if (!supplier_id || !lines?.length) return NextResponse.json({ error: 'supplier_id and lines required' }, { status: 400 });

      const result = await prisma.$transaction(async (tx) => {
        // Upsert: delete existing quote from this supplier for this RFQ and recreate
        const existing = await tx.supplierQuote.findFirst({ where: { purchase_rfq_id: id, supplier_id } });
        if (existing) {
          await tx.supplierQuoteItem.deleteMany({ where: { supplier_quote_id: existing.id } });
          await tx.supplierQuote.delete({ where: { id: existing.id } });
        }

        // Fetch rfq items for required_qty
        const rfqItems = await tx.purchaseRFQItem.findMany({ where: { purchase_rfq_id: id } });
        const rfqItemMap = Object.fromEntries(rfqItems.map(i => [i.id, i]));

        const quote = await tx.supplierQuote.create({
          data: {
            purchase_rfq_id: id,
            supplier_id,
            items: {
              create: lines.map((l: any) => {
                const rfqItem = rfqItemMap[l.purchase_rfq_item_id];
                const amount = (rfqItem?.required_qty || 0) * parseFloat(l.rate);
                return {
                  purchase_rfq_item_id: l.purchase_rfq_item_id,
                  rate: parseFloat(l.rate),
                  lead_time_days: l.lead_time_days ? parseInt(l.lead_time_days) : null,
                  amount,
                  is_selected: false,
                };
              })
            }
          }
        });

        // Update RFQ status
        await tx.purchaseRFQ.update({ where: { id }, data: { status: 'Quotes Received' } });
        return quote;
      });
      return NextResponse.json(result);
    }

    // select-quote: body = { purchase_rfq_item_id, supplier_quote_item_id }
    if (action === 'select-quote') {
      const { purchase_rfq_item_id, supplier_quote_item_id } = json;
      await prisma.$transaction(async (tx) => {
        // Deselect all items for this rfq line
        const allForLine = await tx.supplierQuoteItem.findMany({ where: { purchase_rfq_item_id } });
        for (const item of allForLine) {
          await tx.supplierQuoteItem.update({ where: { id: item.id }, data: { is_selected: false } });
        }
        // Select the chosen one
        await tx.supplierQuoteItem.update({ where: { id: supplier_quote_item_id }, data: { is_selected: true } });
        await tx.purchaseRFQ.update({ where: { id }, data: { status: 'Compared' } });
      });
      return NextResponse.json({ success: true });
    }

    // generate-po
    if (action === 'generate-po') {
      if (rfq.PurchaseOrders.length > 0) {
        return NextResponse.json({ error: 'PO already generated for this RFQ', pos: rfq.PurchaseOrders }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Get all selected quote items
        const selectedItems = await tx.supplierQuoteItem.findMany({
          where: { purchase_rfq_item: { purchase_rfq_id: id }, is_selected: true },
          include: { supplier_quote: true, purchase_rfq_item: { include: { material: true } } }
        });

        const rfqItems = await tx.purchaseRFQItem.findMany({ where: { purchase_rfq_id: id } });
        if (selectedItems.length !== rfqItems.length) {
          throw new Error('All RFQ lines must have a selected supplier quote before generating PO');
        }

        // Group by supplier
        const bySupplier: Record<string, typeof selectedItems> = {};
        for (const item of selectedItems) {
          const sid = item.supplier_quote.supplier_id;
          if (!bySupplier[sid]) bySupplier[sid] = [];
          bySupplier[sid].push(item);
        }

        const pos = [];
        let poCount = await tx.purchaseOrder.count();
        for (const [supplier_id, items] of Object.entries(bySupplier)) {
          poCount++;
          const po_number = `PO-${String(poCount).padStart(4, '0')}`;
          const total_amount = items.reduce((sum, i) => sum + i.amount, 0);

          const po = await tx.purchaseOrder.create({
            data: {
              po_number,
              purchase_rfq_id: id,
              supplier_id,
              total_amount,
              status: 'Issued',
              lines: {
                create: items.map(i => ({
                  material_id: i.purchase_rfq_item.material_id,
                  supplier_quote_item_id: i.id,
                  purchase_rfq_item_id: i.purchase_rfq_item_id,
                  ordered_qty: i.purchase_rfq_item.required_qty,
                  rate: i.rate,
                  amount: i.amount,
                  received_qty: 0,
                  pending_qty: i.purchase_rfq_item.required_qty,
                }))
              }
            }
          });
          pos.push(po);
        }

        await tx.purchaseRFQ.update({ where: { id }, data: { status: 'Closed' } });
        return pos;
      });

      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 400 });
  }
}
