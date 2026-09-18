import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(suppliers);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    if (!json.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: {
        name: json.name,
        contact_person: json.contact_person || null,
        phone: json.phone || null,
        email: json.email || null,
      }
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create supplier' }, { status: 500 });
  }
}
