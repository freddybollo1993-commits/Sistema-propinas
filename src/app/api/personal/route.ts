import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId } = await resolveTiendaId(request);
    const personal = await prisma.colaborador.findMany({
      where: { tiendaId },
    });

    const getAreaGroup = (area: string) => {
      const a = (area || '').trim().toLowerCase();
      const isApoyo = a.includes('apoyo');
      const isSalon = a.includes('salón') || a.includes('salon');
      const isCocina = a.includes('cocina');

      if (isSalon) return { groupOrder: 1, subOrder: isApoyo ? 2 : 1 };
      if (isCocina) return { groupOrder: 2, subOrder: isApoyo ? 2 : 1 };
      return { groupOrder: 3, subOrder: isApoyo ? 2 : 1 };
    };

    personal.sort((a, b) => {
      const gA = getAreaGroup(a.area);
      const gB = getAreaGroup(b.area);
      if (gA.groupOrder !== gB.groupOrder) return gA.groupOrder - gB.groupOrder;
      if (gA.subOrder !== gB.subOrder) return gA.subOrder - gB.subOrder;
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });

    return NextResponse.json(personal);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const usuarioActual = user?.nombre || 'Sistema';

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
