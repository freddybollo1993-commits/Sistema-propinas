import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { calcularProrrateoEnMemoria, getCicloActivo } from '@/lib/formulas';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);

    if (!user) {
      return NextResponse.json({ error: 'No autenticado: Inicie sesión para consultar registros.' }, { status: 401 });
    }

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
        detalles: {
          select: {
            id: true,
            colaborador: true,
            area: true,
            horas: true,
            totalHorasArea: true,
            propina: true,
          },
        },
        _count: {
          select: { detalles: true },
        },
      },
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });

    // Agrupar registros por fecha para asignar correlativo cronológico de turnos independientes
    const turnosPorFecha: Record<string, typeof registros> = {};
    registros.forEach((r) => {
      if (!turnosPorFecha[r.fecha]) turnosPorFecha[r.fecha] = [];
      turnosPorFecha[r.fecha].push(r);
    });

    const turnoMap = new Map<number, { turnoNumero: number; turnosEnFecha: number }>();
    Object.keys(turnosPorFecha).forEach((f) => {
      // Orden cronológico ascendente (el primer registro del día es Turno 1, el siguiente Turno 2, etc.)
      const grupo = turnosPorFecha[f].slice().sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id - b.id;
      });
      grupo.forEach((item, idx) => {
        turnoMap.set(item.id, {
          turnoNumero: idx + 1,
          turnosEnFecha: grupo.length,
        });
      });
    });

    const lista = registros.map((r) => {
      const turnoInfo = turnoMap.get(r.id) || { turnoNumero: 1, turnosEnFecha: 1 };
      return {
        idRegistro: r.id,
        fecha: r.fecha,
        createdAt: r.createdAt.toISOString(),
        turnoNumero: turnoInfo.turnoNumero,
        turnosEnFecha: turnoInfo.turnosEnFecha,
        montoTotal: r.montoTotal,
        fondoSalon: r.fondoSalon,
        fondoCocina: r.fondoCocina,
        cantParticipantes: r._count.detalles,
        estado: r.estado,
        justificacion: r.justificacion || '',
        validador: r.validador || '',
        detalles: r.detalles,
      };
    });

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
        { success: false, message: 'No autenticado: Debe iniciar sesión para registrar propinas.' },
        { status: 401 }
      );
    }

    const usuarioActual = user.nombre;

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

    // Modo de distribución: por defecto Regular 60% / 40%, o Modo Especial Reparto Equitativo
    const esModoEspecial =
      payload.modoDistribucion === 'equitativo' ||
      payload.modoDistribucion === '50_50' ||
      payload.modoDistribucion === 'EQUITATIVO_GENERAL';
    const justificacionIngresada = (payload.justificacion || '').trim();

    if (esModoEspecial && !justificacionIngresada) {
      return NextResponse.json(
        { success: false, message: 'Debe ingresar una justificación obligatoria para utilizar el modo especial de reparto equitativo.' },
        { status: 400 }
      );
    }

    const calculo = calcularProrrateoEnMemoria(
      montoTotal,
      participantes,
      esModoEspecial ? 'EQUITATIVO_GENERAL' : 'REGULAR_60_40'
    );

    const justificacionGuardar = esModoEspecial
      ? `[Modo Especial Equitativo]: ${justificacionIngresada}`
      : null;

    // Guardar atómicamente el registro y sus detalles en base de datos
    const nuevoRegistro = await prisma.$transaction(async (tx) => {
      const reg = await tx.registroPropina.create({
        data: {
          fecha,
          montoTotal,
          fondoSalon: calculo.fondoSalon,
          fondoCocina: calculo.fondoCocina,
          estado: 'Activo',
          justificacion: justificacionGuardar,
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

    const descAuditoria = esModoEspecial
      ? `Nuevo turno registrado en Modo Especial Reparto Equitativo: S/ ${montoTotal.toFixed(2)} (${calculo.detalles.length} colaboradores) el ${fecha}. Justificación: ${justificacionIngresada}`
      : `Nuevo turno registrado en Modo Regular 60/40: S/ ${montoTotal.toFixed(2)} (${calculo.detalles.length} colaboradores) el ${fecha}`;

    await logAuditoria(
      'Registro de Propinas',
      descAuditoria,
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

export async function PUT(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'No autenticado: Inicie sesión para editar registros.' },
        { status: 401 }
      );
    }

    const usuarioActual = user.nombre;
    const payload = await request.json();
    const idRegistro = parseInt(payload.idRegistro, 10);

    if (!idRegistro || isNaN(idRegistro)) {
      return NextResponse.json(
        { success: false, message: 'ID de registro inválido.' },
        { status: 400 }
      );
    }

    const justificacionIngresada = (payload.justificacion || '').trim();
    if (!justificacionIngresada) {
      return NextResponse.json(
        { success: false, message: 'Debe ingresar una justificación obligatoria para guardar las modificaciones.' },
        { status: 400 }
      );
    }

    const reg = await prisma.registroPropina.findUnique({
      where: { id: idRegistro },
      include: { detalles: true },
    });

    if (!reg) {
      return NextResponse.json(
        { success: false, message: `Registro #${idRegistro} no encontrado.` },
        { status: 404 }
      );
    }

    if (tiendaId && reg.tiendaId && reg.tiendaId !== tiendaId) {
      return NextResponse.json(
        { success: false, message: 'No tiene permisos para modificar registros de otra tienda.' },
        { status: 403 }
      );
    }

    if (reg.estado === 'Anulado') {
      return NextResponse.json(
        { success: false, message: 'No se puede editar un registro que ya se encuentra anulado.' },
        { status: 400 }
      );
    }

    const participantes = Array.isArray(payload.participantes) ? payload.participantes : [];
    const participantesActivos = participantes.filter(
      (p: any) => p && p.colaborador && Number(p.horas) > 0
    );

    if (participantesActivos.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Debe haber al menos un trabajador activo con horas mayor a 0.' },
        { status: 400 }
      );
    }

    // Modo de distribución
    const modoDistribucion = payload.modoDistribucion || (
      reg.justificacion?.includes('Modo Especial Equitativo') ||
      reg.justificacion?.includes('50/50') ||
      reg.justificacion?.includes('Equitativo')
        ? 'equitativo'
        : '60_40'
    );

    const esModoEspecial =
      modoDistribucion === 'equitativo' ||
      modoDistribucion === '50_50' ||
      modoDistribucion === 'EQUITATIVO_GENERAL';

    const calculo = calcularProrrateoEnMemoria(
      reg.montoTotal,
      participantesActivos.map((p: any) => ({
        colaborador: String(p.colaborador).trim(),
        area: String(p.area || 'Salón').trim(),
        horas: Number(p.horas) || 0,
      })),
      esModoEspecial ? 'EQUITATIVO_GENERAL' : 'REGULAR_60_40'
    );

    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const notaEdicion = `[Edición ${timestampStr} por ${usuarioActual}]: ${justificacionIngresada}`;
    const nuevaJustificacion = reg.justificacion
      ? `${reg.justificacion} | ${notaEdicion}`
      : notaEdicion;

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar los detalles anteriores
      await tx.detalleParticipacion.deleteMany({
        where: { registroId: reg.id },
      });

      // 2. Crear los nuevos detalles recalculados
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

      // 3. Actualizar cabecera del registro
      await tx.registroPropina.update({
        where: { id: reg.id },
        data: {
          fondoSalon: calculo.fondoSalon,
          fondoCocina: calculo.fondoCocina,
          justificacion: nuevaJustificacion,
          validador: `Editado por ${usuarioActual}`,
        },
      });
    });

    await logAuditoria(
      'Edición de Registro de Propinas',
      `Registro #${reg.id} (${reg.fecha}, S/ ${reg.montoTotal.toFixed(2)}) modificado por ${usuarioActual}. Colaboradores: ${calculo.detalles.length}. Justificación: ${justificacionIngresada}`,
      usuarioActual,
      tiendaId || reg.tiendaId || undefined
    );

    return NextResponse.json({
      success: true,
      message: `Registro #${reg.id} actualizado y recalculado exitosamente con ${calculo.detalles.length} colaboradores.`,
      idRegistro: reg.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

