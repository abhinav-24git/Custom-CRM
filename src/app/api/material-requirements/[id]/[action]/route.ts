import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string, action: string }> }) {
  try {
    const { id, action } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const mr = await tx.materialRequirement.findUnique({ where: { id }, include: { items: true } });
      if (!mr) throw new Error('Not found');

      if (action === 'check-all-stock') {
        for (const line of mr.items) {
          const material = await tx.material.findUnique({ where: { id: line.material_id } });
          const available = material ? material.available_stock : 0;
          const shortage = Math.max(line.required_qty - available, 0);
          
          await tx.materialRequirementItem.update({
            where: { id: line.id },
            data: { available_qty: available, shortage_qty: shortage }
          });
        }
        return { success: true };
      }
      
      if (action === 'mark-checked') {
        if (mr.status !== 'Draft') throw new Error(`Cannot mark checked from ${mr.status}`);
        return await tx.materialRequirement.update({ where: { id }, data: { status: 'Checked' } });
      }

      if (action === 'approve') {
        if (mr.status !== 'Checked') throw new Error(`Cannot approve from ${mr.status}. Must be Checked first.`);
        return await tx.materialRequirement.update({ where: { id }, data: { status: 'Approved' } });
      }

      throw new Error('Invalid action');
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 400 });
  }
}
