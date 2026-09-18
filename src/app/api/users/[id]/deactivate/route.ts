import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser(request);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { is_active: !user.is_active }
    });

    await logAudit(currentUser?.id, updated.is_active ? 'activate_user' : 'deactivate_user', 'admin', id, { is_active: user.is_active }, { is_active: updated.is_active });

    return NextResponse.json({ id: updated.id, is_active: updated.is_active });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to toggle user status' }, { status: 500 });
  }
}
