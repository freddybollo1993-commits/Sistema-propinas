import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyPassword, createSessionToken } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';

export async function POST(request: Request) {
  try {
    const { user, pass } = await request.json();
    if (!user || !pass) {
      return NextResponse.json(
        { success: false, message: 'Ingrese usuario/correo y contraseña.' },
        { status: 400 }
      );
    }

    const cleanUser = String(user).trim().toLowerCase();
    const cleanPass = String(pass).trim();

    // Búsqueda por correo, usuario corto (ej. admin.san-borja) o por ID (ej. USR-MASTER)
    const orConditions: any[] = [
      { email: { equals: cleanUser, mode: 'insensitive' } },
      { id: { equals: cleanUser, mode: 'insensitive' } },
    ];
    if (!cleanUser.includes('@')) {
      orConditions.push({ email: { equals: `${cleanUser}@propinas.pe`, mode: 'insensitive' } });
      orConditions.push({ email: { equals: `${cleanUser}@empresa.com`, mode: 'insensitive' } });
      orConditions.push({ email: { startsWith: `${cleanUser}@`, mode: 'insensitive' } });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        tienda: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado en el sistema.' },
        { status: 401 }
      );
    }

    const passwordValida = await verifyPassword(cleanPass, usuario.passwordHash);
    if (!passwordValida) {
      return NextResponse.json(
        { success: false, message: 'Contraseña o PIN incorrecto.' },
        { status: 401 }
      );
    }

    if (usuario.estado.toLowerCase().includes('inactivo')) {
      return NextResponse.json(
        { success: false, message: 'El usuario se encuentra inactivo. Contacte al Administrador.' },
        { status: 403 }
      );
    }

    // Si no tiene tienda asignada y no es maestro, asignar a la sede principal por defecto
    let tiendaId = usuario.tiendaId;
    let tiendaNombre = usuario.tienda?.nombre || null;
    let tiendaSlug = usuario.tienda?.slug || null;

    if (!tiendaId && !usuario.esMaestro) {
      const tiendaPrincipal = await prisma.tienda.findFirst({
        where: { estado: 'Activo' },
        orderBy: { createdAt: 'asc' },
      });
      if (tiendaPrincipal) {
        tiendaId = tiendaPrincipal.id;
        tiendaNombre = tiendaPrincipal.nombre;
        tiendaSlug = tiendaPrincipal.slug;
      }
    }

    const sessionUser = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado,
      esMaestro: usuario.esMaestro || usuario.id === 'USR-MASTER',
      tiendaId: tiendaId || null,
      tiendaNombre: tiendaNombre || (usuario.esMaestro ? 'Todas las Tiendas (Corporativo)' : null),
      tiendaSlug: tiendaSlug || null,
    };

    const token = await createSessionToken(sessionUser);

    await logAuditoria('Inicio de Sesión', `Ingreso exitoso al sistema [Tienda: ${tiendaNombre || 'Corporativo'}]`, usuario.nombre);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      token,
    });

    // Guardar cookies de sesión y tienda activa
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    if (tiendaId) {
      response.cookies.set('active_tienda_id', tiendaId, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno al autenticar: ' + error.message },
      { status: 500 }
    );
  }
}
