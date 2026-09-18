import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const materials = await prisma.material.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(materials);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.name || !json.uom) {
      return NextResponse.json({ error: 'Name and UOM are required' }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        name: json.name,
        uom: json.uom,
        available_stock: parseFloat(json.available_stock || 0)
      }
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create material' }, { status: 500 });
  }
}
