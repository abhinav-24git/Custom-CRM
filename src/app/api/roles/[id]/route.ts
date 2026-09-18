import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        users: { select: { id: true, name: true, email: true } }
      }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    const role = await prisma.role.findUnique({
      where: { id },
      include: { users: true }
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.is_system_role) {
      return NextResponse.json({ error: 'System-seeded roles cannot be deleted' }, { status: 400 });
    }

    if (role.users.length > 0) {
      return NextResponse.json({
        error: `Cannot delete role '${role.name}' because it currently has ${role.users.length} active user(s) assigned to it.`
      }, { status: 400 });
    }

    await prisma.role.delete({ where: { id } });

    await logAudit(currentUser?.id, 'delete_role', 'admin', id, { name: role.name }, null);

    return NextResponse.json({ success: true, message: 'Role deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete role' }, { status: 400 });
  }
}
