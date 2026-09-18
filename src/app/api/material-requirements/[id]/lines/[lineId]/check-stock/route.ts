import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string, lineId: string }> }) {
  try {
    const { id, lineId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      const line = await tx.materialRequirementItem.findUnique({ where: { id: lineId }, include: { material: true } });
      if (!line) throw new Error('Line not found');
      if (line.material_requirement_id !== id) throw new Error('Line mismatch');

      const material = await tx.material.findUnique({ where: { id: line.material_id } });
      if (!material) throw new Error('Material not found');

      const available = material.available_stock;
      const shortage = Math.max(line.required_qty - available, 0);

      const updatedLine = await tx.materialRequirementItem.update({
        where: { id: lineId },
        data: {
          available_qty: available,
          shortage_qty: shortage
        }
      });

      return updatedLine;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to check stock' }, { status: 400 });
  }
}
