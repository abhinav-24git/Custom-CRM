import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.name || !json.uom) {
      return NextResponse.json({ error: 'Name and UOM are required' }, { status: 400 });
    }
    const item = await prisma.item.create({
      data: {
        name: json.name,
        uom: json.uom,
        default_rate: json.default_rate ? parseFloat(json.default_rate) : null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
