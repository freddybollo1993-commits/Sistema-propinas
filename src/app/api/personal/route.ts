import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { resolveTiendaId } from '@/lib/tiendas';
import { ordenarColaboradoresPorArea } from '@/lib/areas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);

    if (!user) {
      return NextResponse.json({ error: 'No autenticado: Inicie sesión para consultar personal.' }, { status: 401 });
    }

    const personal = await prisma.colaborador.findMany({
      where: { tiendaId },
    });

    const personalOrdenado = ordenarColaboradoresPorArea(personal);

    return NextResponse.json(personalOrdenado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado: Inicie sesión para gestionar personal.' },
        { status: 401 }
      );
    }

    const esAutorizado =
      Boolean(user.esMaestro) ||
      user.rol === 'Administrador' ||
      user.rol === 'Supervisor' ||
      user.rol === 'Moderador';

    if (!esAutorizado) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado: Se requieren permisos para gestionar personal.' },
        { status: 403 }
      );
    }

    const usuarioActual = user.nombre;

    const { nombre, area, estado } = await request.json();

    if (!nombre) {
      return NextResponse.json(
        { success: false, message: 'El nombre del colaborador es obligatorio.' },
        { status: 400 }
      );
    }

    const cleanNombre = String(nombre).trim();
    const cleanArea = String(area || 'Salón').trim();
    const cleanEstado = String(estado || 'Activo').trim();

    const existente = await prisma.colaborador.findUnique({
      where: {
        nombre_tiendaId: {
          nombre: cleanNombre,
          tiendaId,
        },
      },
    });

    if (existente) {
      await prisma.colaborador.update({
        where: { id: existente.id },
        data: {
          area: cleanArea,
          estado: cleanEstado,
        },
      });

      await logAuditoria(
        'Modificación de Personal',
        `Actualizado colaborador: ${cleanNombre} (${cleanArea} - ${cleanEstado})`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'Colaborador actualizado exitosamente.',
      });
    } else {
      await prisma.colaborador.create({
        data: {
          nombre: cleanNombre,
          area: cleanArea,
          estado: cleanEstado,
          tiendaId,
        },
      });

      await logAuditoria(
        'Alta de Personal',
        `Nuevo colaborador registrado: ${cleanNombre} en ${cleanArea}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'Colaborador registrado exitosamente.',
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado: Inicie sesión para eliminar personal.' },
        { status: 401 }
      );
    }

    const esAutorizado =
      Boolean(user.esMaestro) ||
      user.rol === 'Administrador' ||
      user.rol === 'Supervisor' ||
      user.rol === 'Moderador';

    if (!esAutorizado) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado: Se requieren permisos para eliminar personal.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const nombreParam = searchParams.get('nombre');

    let colab = null;
    if (idParam && !isNaN(parseInt(idParam, 10))) {
      colab = await prisma.colaborador.findFirst({
        where: { id: parseInt(idParam, 10), tiendaId },
      });
    } else if (nombreParam) {
      colab = await prisma.colaborador.findFirst({
        where: { nombre: { equals: nombreParam.trim(), mode: 'insensitive' }, tiendaId },
      });
    }

    if (!colab) {
      return NextResponse.json(
        { success: false, message: 'Colaborador no encontrado en el catálogo de esta sede.' },
        { status: 404 }
      );
    }

    await prisma.colaborador.delete({
      where: { id: colab.id },
    });

    await logAuditoria(
      'Baja Definitiva de Personal',
      `Colaborador eliminado del catálogo: ${colab.nombre} (${colab.area}) por ${user.nombre} [${user.rol}]`,
      user.nombre
    );

    return NextResponse.json({
      success: true,
      message: `Colaborador ${colab.nombre} eliminado exitosamente del catálogo.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
