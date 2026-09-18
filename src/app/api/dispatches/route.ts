import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const dispatches = await prisma.dispatch.findMany({
      include: {
        sales_order: {
          include: { customer: true }
        },
        items: {
          include: {
            sales_order_item: {
              include: { item: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = dispatches.map(d => {
      const totalQty = d.items.reduce((s, i) => s + i.dispatched_qty, 0);
      return {
        ...d,
        total_qty: totalQty
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dispatches' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const {
      sales_order_id,
      dispatch_date,
      transporter,
      vehicle_number,
      lr_number,
      package_count,
      weight,
      invoice_reference,
      lines
    } = json;

    if (!sales_order_id) {
      return NextResponse.json({ error: 'Sales Order ID is required' }, { status: 400 });
    }

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'At least one line item must be dispatched' }, { status: 400 });
    }

    const activeLines = lines.filter((l: any) => (parseFloat(l.dispatched_qty) || 0) > 0);
    if (activeLines.length === 0) {
      return NextResponse.json({ error: 'At least one line item must have dispatched_qty > 0' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: sales_order_id },
        include: {
          lines: {
            include: {
              item: true,
              QCInspections: {
                where: { status: 'Completed' },
                include: { items: true }
              }
            }
          }
        }
      });

      if (!so) {
        throw new Error('Sales Order not found');
      }

      if (so.status === 'Closed' || so.status === 'Cancelled') {
        throw new Error(`Cannot create dispatch for Sales Order in '${so.status}' status`);
      }

      const lineMap = new Map(so.lines.map(l => [l.id, l]));

      // 1. Validate each line against the QC Acceptance Gate and v1 balance limits
      for (const lineReq of activeLines) {
        const soLine = lineMap.get(lineReq.sales_order_item_id);
        if (!soLine) {
          throw new Error(`Sales Order line '${lineReq.sales_order_item_id}' not found on order ${so.so_number}`);
        }

        const qtyToDispatch = parseFloat(lineReq.dispatched_qty);
        if (qtyToDispatch <= 0) {
          throw new Error('Dispatched quantity must be > 0');
        }

        // Calculate QC-accepted available quantity
        const qcAcceptedTotal = soLine.QCInspections.reduce((total, qc) => {
          const sum = qc.items.reduce((s, itm) => s + itm.accepted_qty, 0);
          return total + sum;
        }, 0);

        const availableFromQc = Math.max(0, qcAcceptedTotal - soLine.dispatched_qty);

        if (qtyToDispatch > availableFromQc + 0.0001) {
          throw new Error(
            `QC Gate Block: Cannot dispatch ${qtyToDispatch} units for item '${soLine.item.name}'. QC accepted available: ${availableFromQc} (Total QC approved: ${qcAcceptedTotal}, Already dispatched: ${soLine.dispatched_qty}). Final dispatch blocked until QC is completed and accepted.`
          );
        }

        // v1 arithmetic check
        if (soLine.dispatched_qty + qtyToDispatch + soLine.cancelled_qty > soLine.ordered_qty + 0.0001) {
          throw new Error(
            `Quantity limit exceeded for item '${soLine.item.name}'. Ordered: ${soLine.ordered_qty}, Dispatched so far: ${soLine.dispatched_qty}, Attempted: ${qtyToDispatch}, Cancelled: ${soLine.cancelled_qty}`
          );
        }
      }

      // 2. Generate dispatch number
      const count = await tx.dispatch.count();
      const dispatch_number = `DC-${String(count + 1).padStart(4, '0')}`;

      // 3. Create Dispatch header & lines
      const dispatch = await tx.dispatch.create({
        data: {
          dispatch_number,
          sales_order_id: so.id,
          dispatch_date: dispatch_date ? new Date(dispatch_date) : new Date(),
          transporter: transporter || null,
          vehicle_number: vehicle_number || null,
          lr_number: lr_number || null,
          package_count: package_count ? parseInt(package_count, 10) : null,
          weight: weight ? parseFloat(weight) : null,
          invoice_reference: invoice_reference || null,
          items: {
            create: activeLines.map((l: any) => ({
              sales_order_item_id: l.sales_order_item_id,
              dispatched_qty: parseFloat(l.dispatched_qty)
            }))
          }
        },
        include: {
          items: true
        }
      });

      // 4. Drive v1 ledger, sales_order_item totals, and SO status
      for (const lineReq of activeLines) {
        const soLine = lineMap.get(lineReq.sales_order_item_id)!;
        const qtyToDispatch = parseFloat(lineReq.dispatched_qty);

        // Record v1 DispatchEntry ledger
        await tx.dispatchEntry.create({
          data: {
            sales_order_item_id: soLine.id,
            type: 'Dispatch',
            qty: qtyToDispatch,
            entry_date: dispatch_date ? new Date(dispatch_date) : new Date(),
            remarks: `Dispatch ${dispatch_number}${invoice_reference ? ` (Inv: ${invoice_reference})` : ''}`
          }
        });

        // Update SalesOrderItem
        const newDispatched = soLine.dispatched_qty + qtyToDispatch;
        const newBalance = soLine.ordered_qty - newDispatched - soLine.cancelled_qty;

        await tx.salesOrderItem.update({
          where: { id: soLine.id },
          data: {
            dispatched_qty: newDispatched,
            balance_qty: Math.max(0, newBalance)
          }
        });
      }

      // 5. Recompute SalesOrder status per v1 rule
      const updatedLines = await tx.salesOrderItem.findMany({
        where: { sales_order_id: so.id }
      });

      const allFulfilled = updatedLines.every(l => l.balance_qty <= 0.0001);
      const anyDispatched = updatedLines.some(l => l.dispatched_qty > 0);

      let newStatus = 'Open';
      if (allFulfilled) {
        const allCancelled = updatedLines.every(l => l.dispatched_qty <= 0.0001 && l.cancelled_qty > 0);
        newStatus = allCancelled ? 'Cancelled' : 'Closed';
      } else if (anyDispatched) {
        newStatus = 'Partially Dispatched';
      }

      await tx.salesOrder.update({
        where: { id: so.id },
        data: { status: newStatus }
      });

      return dispatch;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create dispatch' }, { status: 400 });
  }
}
