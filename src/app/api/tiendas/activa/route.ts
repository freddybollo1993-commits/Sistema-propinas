import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const { tiendaId } = await request.json();
    if (!tiendaId) {
      return NextResponse.json({ success: false, message: 'ID de tienda requerido' }, { status: 400 });
    }

    // Si el usuario no es maestro, solo puede seleccionar su propia tienda
    if (!user.esMaestro && user.tiendaId && user.tiendaId !== tiendaId) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado: No tiene permisos para acceder a esta tienda.' },
        { status: 403 }
      );
    }

    const tienda = await prisma.tienda.findUnique({
      where: { id: tiendaId },
    });

    if (!tienda) {
      return NextResponse.json({ success: false, message: 'Tienda no encontrada.' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      message: `Cambiado a ${tienda.nombre}`,
      tienda,
    });

    response.cookies.set('active_tienda_id', tienda.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
