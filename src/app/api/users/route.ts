import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { seedRolesAndAdmin, logAudit, getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    await seedRolesAndAdmin();
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role_id: u.role_id,
      role_name: u.role?.name,
      is_active: u.is_active,
      last_login_at: u.last_login_at,
      createdAt: u.createdAt
    }));

    return NextResponse.json(sanitized);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await seedRolesAndAdmin();
    const currentUser = await getCurrentUser(request);
    const json = await request.json();
    const { name, email, password, role_id } = json;

    if (!name || !email || !role_id) {
      return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: password || 'Welcome@123',
        role_id,
        is_active: true
      },
      include: { role: true }
    });

    await logAudit(currentUser?.id, 'create_user', 'admin', user.id, null, { name, email, role: user.role.name });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_name: user.role.name,
      is_active: user.is_active
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 400 });
  }
}
