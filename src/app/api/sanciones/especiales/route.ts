import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId } = await resolveTiendaId(request);
    const especiales = await prisma.sancionEspecial.findMany({
      where: { tiendaId },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(especiales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const usuarioActual = user?.nombre || 'Sistema';
    const rol = user?.rol || '';

    if (rol === 'Moderador') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Acceso denegado: El rol Moderador visualiza las sanciones especiales en modo Solo Lectura.',
        },
        { status: 403 }
      );
    }

    const payload = await request.json();

    // Puede recibir un arreglo de reglas o una sola regla
    if (Array.isArray(payload)) {
      for (const item of payload) {
        if (item.id) {
          await prisma.sancionEspecial.update({
            where: { id: item.id },
            data: {
              nombre: item.nombre,
              sancionPrincipal: item.sancionPrincipal,
              estado: item.estado,
              tipoEfecto: item.tipoEfecto || 'PERDIDA_DIA',
              criterioDisparador: item.criterioDisparador || 'TOLERANCIA_O_FRECUENCIA',
              disparadorFrecuencia: parseInt(item.disparadorFrecuencia || 1),
              tiendaId,
            },
          });
        } else {
          await prisma.sancionEspecial.create({
            data: {
              nombre: item.nombre || 'Pérdida de propina del día',
              sancionPrincipal: item.sancionPrincipal,
              estado: item.estado || 'Activo',
              tipoEfecto: item.tipoEfecto || 'PERDIDA_DIA',
              criterioDisparador: item.criterioDisparador || 'TOLERANCIA_O_FRECUENCIA',
              disparadorFrecuencia: parseInt(item.disparadorFrecuencia || 1),
              tiendaId,
            },
          });
        }
      }

      await logAuditoria(
        'Configuración de Sanciones Especiales',
        `Catálogo de sanciones especiales/modificadores actualizado (${payload.length} reglas) en tienda ${tiendaId}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'Sanciones especiales actualizadas exitosamente.',
      });
    }

    // Objeto único
    const { id, nombre, sancionPrincipal, estado, tipoEfecto, criterioDisparador, disparadorFrecuencia } = payload;

    if (id) {
      const updated = await prisma.sancionEspecial.update({
        where: { id },
        data: {
          nombre,
          sancionPrincipal,
          estado,
          tipoEfecto: tipoEfecto || 'PERDIDA_DIA',
          criterioDisparador: criterioDisparador || 'TOLERANCIA_O_FRECUENCIA',
          disparadorFrecuencia: parseInt(disparadorFrecuencia || 1),
          tiendaId,
        },
      });

      await logAuditoria(
        'Configuración de Sanción Especial',
        `Modificador actualizado: ${nombre} asociado a ${sancionPrincipal} (${estado}) en tienda ${tiendaId}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'Modificador disciplinario actualizado.',
        data: updated,
      });
    } else {
      const created = await prisma.sancionEspecial.create({
        data: {
          nombre: nombre || 'Pérdida de propina del día',
          sancionPrincipal: sancionPrincipal || 'Tardanza',
          estado: estado || 'Activo',
          tipoEfecto: tipoEfecto || 'PERDIDA_DIA',
          criterioDisparador: criterioDisparador || 'TOLERANCIA_O_FRECUENCIA',
          disparadorFrecuencia: parseInt(disparadorFrecuencia || 1),
          tiendaId,
        },
      });

      await logAuditoria(
        'Alta de Sanción Especial',
        `Nuevo modificador creado: ${nombre} asociado a ${sancionPrincipal} en tienda ${tiendaId}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'Sanción especial creada exitosamente.',
        data: created,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const rol = user?.rol || '';
    if (rol === 'Moderador') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Acceso denegado: El rol Moderador visualiza las sanciones especiales en modo Solo Lectura.',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID no proporcionado.' }, { status: 400 });
    }

    await prisma.sancionEspecial.delete({
      where: { id },
    });

    await logAuditoria(
      'Eliminación de Sanción Especial',
      `Sanción especial ID #${id} eliminada en tienda ${tiendaId}.`,
      user?.nombre || 'Sistema'
    );

    return NextResponse.json({ success: true, message: 'Sanción especial eliminada correctamente.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
