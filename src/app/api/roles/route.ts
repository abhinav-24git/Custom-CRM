import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { seedRolesAndAdmin, ALL_MODULES, logAudit, getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await seedRolesAndAdmin();
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        users: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await seedRolesAndAdmin();
    const currentUser = await getCurrentUser(request);
    const json = await request.json();
    const { name } = json;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    }

    const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'A role with this name already exists' }, { status: 400 });
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        is_system_role: false,
        permissions: {
          create: ALL_MODULES.map(module => ({
            module,
            can_view: true,
            can_create: false,
            can_edit: false,
            can_approve: false,
            can_delete: false,
            can_export: false
          }))
        }
      },
      include: { permissions: true }
    });

    await logAudit(currentUser?.id, 'create_role', 'admin', role.id, null, { name: role.name });

    return NextResponse.json(role, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create role' }, { status: 400 });
  }
}
