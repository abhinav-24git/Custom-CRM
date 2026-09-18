import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAudit, getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const { permissions } = json; // Array of { module, can_view, can_create, can_edit, can_approve, can_delete, can_export }
    const currentUser = await getCurrentUser(request);

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { id } });
      if (!role) throw new Error('Role not found');

      for (const p of permissions) {
        const existing = await tx.rolePermission.findFirst({
          where: { role_id: id, module: p.module }
        });

        if (existing) {
          await tx.rolePermission.update({
            where: { id: existing.id },
            data: {
              can_view: Boolean(p.can_view),
              can_create: Boolean(p.can_create),
              can_edit: Boolean(p.can_edit),
              can_approve: Boolean(p.can_approve),
              can_delete: Boolean(p.can_delete),
              can_export: Boolean(p.can_export)
            }
          });
        } else {
          await tx.rolePermission.create({
            data: {
              role_id: id,
              module: p.module,
              can_view: Boolean(p.can_view),
              can_create: Boolean(p.can_create),
              can_edit: Boolean(p.can_edit),
              can_approve: Boolean(p.can_approve),
              can_delete: Boolean(p.can_delete),
              can_export: Boolean(p.can_export)
            }
          });
        }
      }

      const updated = await tx.role.findUnique({
        where: { id },
        include: { permissions: true }
      });

      await logAudit(currentUser?.id, 'update_permissions', 'admin', id, null, { updated_modules: permissions.length });

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update role permissions' }, { status: 400 });
  }
}
