import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: { include: { permissions: true } } }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role.name,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      permissions: user.role.permissions
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { name, role_id, is_active } = json;
    const currentUser = await getCurrentUser(request);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        role_id: role_id !== undefined ? role_id : existing.role_id,
        is_active: is_active !== undefined ? is_active : existing.is_active
      },
      include: { role: true }
    });

    await logAudit(currentUser?.id, 'update_user', 'admin', id, { role_id: existing.role_id, is_active: existing.is_active }, { role_id: updated.role_id, is_active: updated.is_active });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role_name: updated.role.name,
      is_active: updated.is_active
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 400 });
  }
}
