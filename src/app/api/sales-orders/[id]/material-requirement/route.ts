import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({ where: { id } });
      if (!so) throw new Error('Sales Order not found');
      if (!so.is_confirmed) throw new Error('Sales Order must be confirmed before generating MR');

      const existingMR = await tx.materialRequirement.findFirst({
        where: { sales_order_id: id }
      });
      if (existingMR) throw new Error(`Material Requirement already exists: ${existingMR.mr_number}`);

      const count = await tx.materialRequirement.count();
      const mr_number = `MR-${String(count + 1).padStart(4, '0')}`;

      const mr = await tx.materialRequirement.create({
        data: {
          mr_number,
          sales_order_id: id,
          required_date: so.delivery_commitment_date,
          status: 'Draft'
        }
      });

      return mr;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate Material Requirement' }, { status: 400 });
  }
}
