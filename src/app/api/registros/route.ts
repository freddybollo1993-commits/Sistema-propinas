import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { calcularProrrateoEnMemoria, getCicloActivo } from '@/lib/formulas';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId } = await resolveTiendaId(request);
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio');
    const fin = searchParams.get('fin');

    const ciclo = await getCicloActivo(tiendaId);
    const fInicio = inicio || ciclo.fechaInicio;
    const fFin = fin || ciclo.fechaFin;

    const registros = await prisma.registroPropina.findMany({
      where: {
        tiendaId,
        ...(fInicio && fFin ? { fecha: { gte: fInicio, lte: fFin } } : {}),
      },
      include: {
        _count: {
          select: { detalles: true },
        },
      },
      orderBy: { id: 'desc' },
    });

    const lista = registros.map((r) => ({
      idRegistro: r.id,
      fecha: r.fecha,
      montoTotal: r.montoTotal,
      fondoSalon: r.fondoSalon,
      fondoCocina: r.fondoCocina,
      cantParticipantes: r._count.detalles,
      estado: r.estado,
      justificacion: r.justificacion || '',
      validador: r.validador || '',
    }));

    return NextResponse.json(lista);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const usuarioActual = user?.nombre || 'Sistema';

    const payload = await request.json();
    const montoTotal = parseFloat(payload.montoTotal) || 0;

    if (montoTotal <= 0) {
      return NextResponse.json(
        { success: false, message: 'El monto recaudado debe ser mayor a 0.' },
        { status: 400 }
      );
    }

    const participantes = payload.participantes || [];
    if (participantes.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Debe agregar al menos un trabajador participante.' },
        { status: 400 }
      );
    }

    const fecha = payload.fecha || new Date().toISOString().split('T')[0];

    // Cálculo y Prorrateo estricto 60% Salón / 40% Cocina
    const calculo = calcularProrrateoEnMemoria(montoTotal, participantes);

    // Guardar atómicamente el registro y sus detalles en base de datos
    const nuevoRegistro = await prisma.$transaction(async (tx) => {
      const reg = await tx.registroPropina.create({
        data: {
          fecha,
          montoTotal,
          fondoSalon: calculo.fondoSalon,
          fondoCocina: calculo.fondoCocina,
          estado: 'Activo',
          tiendaId,
        },
      });

      await tx.detalleParticipacion.createMany({
        data: calculo.detalles.map((d) => ({
          registroId: reg.id,
          colaborador: d.colaborador,
          area: d.area,
          horas: d.horas,
          totalHorasArea: d.totalHorasArea,
          propina: d.propinaAsignada,
        })),
      });

      return reg;
    });

    await logAuditoria(
      'Registro de Propinas',
      `Nuevo turno registrado: S/ ${montoTotal.toFixed(2)} (${calculo.detalles.length} colaboradores) el ${fecha}`,
      usuarioActual,
      tiendaId
    );

    return NextResponse.json({
      success: true,
      message: 'Registro de propinas guardado exitosamente.',
      idRegistro: nuevoRegistro.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
