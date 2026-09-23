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

    // Búsqueda por correo o por ID (ej. USR-MASTER, USR-001)
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: { equals: cleanUser, mode: 'insensitive' } },
          { id: { equals: cleanUser, mode: 'insensitive' } },
        ],
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

    const sessionUser = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      estado: usuario.estado,
      esMaestro: usuario.esMaestro || usuario.id === 'USR-MASTER',
    };

    const token = await createSessionToken(sessionUser);

    await logAuditoria('Inicio de Sesión', 'Ingreso exitoso al sistema', usuario.nombre);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      token,
    });

    // Guardar cookie HTTP-only
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error: any) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno al autenticar: ' + error.message },
      { status: 500 }
    );
  }
}
