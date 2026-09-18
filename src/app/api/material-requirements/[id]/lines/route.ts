import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const json = await request.json(); // array of lines

    const result = await prisma.$transaction(async (tx) => {
      const mr = await tx.materialRequirement.findUnique({ where: { id } });
      if (!mr) throw new Error('Not found');
      if (mr.status === 'Approved') throw new Error('Cannot edit an Approved Material Requirement');

      // Delete existing lines
      await tx.materialRequirementItem.deleteMany({ where: { material_requirement_id: id } });

      // Create new lines (requires stock check to populate available/shortage)
      // Since this is just saving lines manually, we can set available_qty = 0 and shortage_qty = required_qty initially,
      // or we can just run a stock check immediately. Let's do a stock check immediately.
      
      const linesToCreate = [];
      for (const line of json.lines) {
        if (line.required_qty <= 0) throw new Error('Required quantity must be greater than 0');
        
        const material = await tx.material.findUnique({ where: { id: line.material_id } });
        if (!material) throw new Error('Material not found');

        const available = material.available_stock;
        const shortage = Math.max(line.required_qty - available, 0);

        linesToCreate.push({
          material_id: line.material_id,
          required_qty: parseFloat(line.required_qty),
          available_qty: available,
          shortage_qty: shortage,
          notes: line.notes || null
        });
      }

      const updated = await tx.materialRequirement.update({
        where: { id },
        data: {
          status: mr.status === 'Checked' ? 'Draft' : mr.status, // Editing a checked MR reverts to Draft
          items: {
            create: linesToCreate
          }
        },
        include: { items: { include: { material: true } } }
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update lines' }, { status: 400 });
  }
}
