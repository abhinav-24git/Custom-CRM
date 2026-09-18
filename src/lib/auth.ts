import prisma from './prisma';

export const ALL_MODULES = [
  'enquiries',
  'quotations',
  'sales_orders',
  'material_requirements',
  'purchase_rfqs',
  'purchase_orders',
  'plannings',
  'job_cards',
  'jobwork_rfqs',
  'service_orders',
  'rgp_challans',
  'qc_inspections',
  'dispatches',
  'feedbacks',
  'reports',
  'admin'
];

export async function seedRolesAndAdmin() {
  const existingAdminRole = await prisma.role.findUnique({
    where: { name: 'Management/Admin' }
  });

  if (!existingAdminRole) {
    // 1. Seed Roles
    const adminRole = await prisma.role.create({
      data: {
        name: 'Management/Admin',
        is_system_role: true,
        permissions: {
          create: ALL_MODULES.map(module => ({
            module,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_approve: true,
            can_delete: true,
            can_export: true
          }))
        }
      }
    });

    const operatorRole = await prisma.role.create({
      data: {
        name: 'Operator',
        is_system_role: true,
        permissions: {
          create: ALL_MODULES.map(module => ({
            module,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_approve: true,
            can_delete: false,
            can_export: true
          }))
        }
      }
    });

    const salesRole = await prisma.role.create({
      data: {
        name: 'Sales',
        is_system_role: true,
        permissions: {
          create: ALL_MODULES.map(module => ({
            module,
            can_view: ['enquiries', 'quotations', 'sales_orders', 'feedbacks', 'reports'].includes(module),
            can_create: ['enquiries', 'quotations', 'sales_orders'].includes(module),
            can_edit: ['enquiries', 'quotations', 'sales_orders'].includes(module),
            can_approve: ['quotations'].includes(module),
            can_delete: false,
            can_export: true
          }))
        }
      }
    });

    const qcRole = await prisma.role.create({
      data: {
        name: 'Quality Control',
        is_system_role: true,
        permissions: {
          create: ALL_MODULES.map(module => ({
            module,
            can_view: ['qc_inspections', 'job_cards', 'rgp_challans', 'sales_orders', 'reports'].includes(module),
            can_create: ['qc_inspections'].includes(module),
            can_edit: ['qc_inspections'].includes(module),
            can_approve: ['qc_inspections'].includes(module),
            can_delete: false,
            can_export: true
          }))
        }
      }
    });

    // 2. Create Default Admin User
    await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@antigravity.io',
        password_hash: 'admin123', // Demo hash
        role_id: adminRole.id,
        is_active: true
      }
    });
  }
}

export async function getCurrentUser(request?: Request) {
  await seedRolesAndAdmin();

  // If specific user email in headers, use it; else fallback to default admin
  const headerEmail = request ? request.headers.get('x-user-email') : null;
  if (headerEmail) {
    const u = await prisma.user.findUnique({
      where: { email: headerEmail },
      include: { role: { include: { permissions: true } } }
    });
    if (u && u.is_active) return u;
  }

  const defaultAdmin = await prisma.user.findFirst({
    where: { is_active: true },
    include: { role: { include: { permissions: true } } }
  });

  return defaultAdmin;
}

export async function checkPermission(
  user: any,
  module: string,
  action: 'can_view' | 'can_create' | 'can_edit' | 'can_approve' | 'can_delete' | 'can_export'
): Promise<boolean> {
  if (!user || !user.is_active || !user.role) return false;
  if (user.role.name === 'Management/Admin') return true;

  const perm = user.role.permissions.find((p: any) => p.module === module);
  return perm ? Boolean(perm[action]) : false;
}

export async function logAudit(
  userId: string | null | undefined,
  action: string,
  module: string,
  entityId: string,
  oldValues?: any,
  newValues?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId || null,
        action,
        module,
        entity_id: entityId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
