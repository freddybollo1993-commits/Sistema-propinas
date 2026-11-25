import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

interface MiembroInput {
  colaborador: string;
  horas: number;
}

/** Normaliza y valida la lista de miembros enviada por el cliente. */
function limpiarMiembros(raw: any): MiembroInput[] {
  if (!Array.isArray(raw)) return [];
  const vistos = new Set<string>();
  const out: MiembroInput[] = [];
  for (const m of raw) {
    const nombre = String(m?.colaborador || '').trim();
    const horas = Number(m?.horas);
    if (!nombre || !(horas > 0) || horas > 24) continue;
    const key = nombre.toLowerCase();
    if (vistos.has(key)) continue;
    vistos.add(key);
    out.push({ colaborador: nombre, horas });
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const turnos = await prisma.turnoPersonalizado.findMany({
      where: { tiendaId, estado: 'Activo' },
      include: { miembros: true },
      orderBy: { nombre: 'asc' },
    });

    // Una sola consulta para saber el área vigente de cada colaborador
    const personal = await prisma.colaborador.findMany({ where: { tiendaId } });
    const areaPorNombre = new Map(personal.map((p) => [p.nombre.trim().toLowerCase(), p]));

    const lista = turnos.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      miembros: t.miembros.map((m) => {
        const p = areaPorNombre.get(m.colaborador.trim().toLowerCase());
        return {
          colaborador: m.colaborador,
          horas: m.horas,
          area: p?.area || null,
          // true si el colaborador ya no existe o está inactivo en la sede
          disponible: Boolean(p) && p!.estado.toLowerCase() !== 'inactivo',
        };
      }),
    }));

    return NextResponse.json(lista);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado: Inicie sesión para gestionar turnos.' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    const nombre = String(payload.nombre || '').trim();
    if (!nombre) {
      return NextResponse.json(
        { success: false, message: 'El nombre del turno es obligatorio.' },
        { status: 400 }
      );
    }

    const miembros = limpiarMiembros(payload.miembros);
    if (miembros.length === 0) {
      return NextResponse.json(
        { success: false, message: 'El turno debe tener al menos un colaborador con horas mayores a 0.' },
        { status: 400 }
      );
    }

    // Todos los colaboradores deben existir en la sede
    const personal = await prisma.colaborador.findMany({ where: { tiendaId } });
    const nombresSede = new Set(personal.map((p) => p.nombre.trim().toLowerCase()));
    const desconocidos = miembros.filter((m) => !nombresSede.has(m.colaborador.toLowerCase()));
    if (desconocidos.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Colaboradores que no existen en esta sede: ${desconocidos.map((d) => d.colaborador).join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const id = payload.id ? parseInt(payload.id, 10) : null;

    const duplicado = await prisma.turnoPersonalizado.findFirst({
      where: {
        tiendaId,
        estado: 'Activo',
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(id ? { NOT: { id } } : {}),
      },
    });
    if (duplicado) {
      return NextResponse.json(
        { success: false, message: `Ya existe un turno llamado "${nombre}" en esta sede.` },
        { status: 400 }
      );
    }

    if (id) {
      const existente = await prisma.turnoPersonalizado.findFirst({ where: { id, tiendaId } });
      if (!existente) {
        return NextResponse.json(
          { success: false, message: 'Turno no encontrado en esta sede.' },
          { status: 404 }
        );
      }
      await prisma.$transaction(async (tx) => {
        await tx.turnoPersonalizado.update({ where: { id }, data: { nombre } });
        await tx.turnoMiembro.deleteMany({ where: { turnoId: id } });
        await tx.turnoMiembro.createMany({
          data: miembros.map((m) => ({ turnoId: id, colaborador: m.colaborador, horas: m.horas })),
        });
      });
      await logAuditoria(
        'Edición de Turno Personalizado',
        `Turno "${nombre}" (#${id}) actualizado con ${miembros.length} colaboradores por ${user.nombre}`,
        user.nombre,
        tiendaId
      );
      return NextResponse.json({ success: true, message: `Turno "${nombre}" actualizado.`, id });
    }

    const creado = await prisma.turnoPersonalizado.create({
      data: {
        nombre,
        tiendaId,
        creadoPor: user.nombre,
        miembros: {
          create: miembros.map((m) => ({ colaborador: m.colaborador, horas: m.horas })),
        },
      },
    });
    await logAuditoria(
      'Alta de Turno Personalizado',
      `Turno "${nombre}" (#${creado.id}) creado con ${miembros.length} colaboradores por ${user.nombre}`,
      user.nombre,
      tiendaId
    );
    return NextResponse.json({ success: true, message: `Turno "${nombre}" creado.`, id: creado.id });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Desactiva el turno (no borra: los registros históricos conservan su nombre). */
export async function DELETE(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado: Inicie sesión para gestionar turnos.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '', 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: 'ID de turno inválido.' }, { status: 400 });
    }

    const turno = await prisma.turnoPersonalizado.findFirst({ where: { id, tiendaId } });
    if (!turno) {
      return NextResponse.json(
        { success: false, message: 'Turno no encontrado en esta sede.' },
        { status: 404 }
      );
    }

    await prisma.turnoPersonalizado.update({ where: { id }, data: { estado: 'Inactivo' } });
    await logAuditoria(
      'Baja de Turno Personalizado',
      `Turno "${turno.nombre}" (#${id}) desactivado por ${user.nombre}`,
      user.nombre,
      tiendaId
    );
    return NextResponse.json({ success: true, message: `Turno "${turno.nombre}" eliminado.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
