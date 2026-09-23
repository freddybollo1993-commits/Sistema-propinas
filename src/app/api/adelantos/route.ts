import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';
import { getLiquidacionResumen } from '@/lib/formulas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adelantos = await prisma.sancionAdelanto.findMany({
      where: { concepto: { contains: 'Adelanto' } },
      orderBy: { id: 'desc' },
    });

    const lista = adelantos.map((a) => ({
      id: a.id,
      fila: a.id,
      fecha: a.fecha,
      colaborador: a.colaborador,
      concepto: a.concepto,
      monto: a.monto,
      detalle: a.detalle || '',
      estado: a.estado,
      usuario: a.usuario,
    }));

    return NextResponse.json(lista);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';
    const rol = user?.rol || 'Moderador';

    const payload = await request.json();
    const monto = parseFloat(payload.monto) || 0;

    if (monto <= 0) {
      return NextResponse.json(
        { success: false, message: 'El monto debe ser mayor a cero.' },
        { status: 400 }
      );
    }

    if (!payload.colaborador) {
      return NextResponse.json(
        { success: false, message: 'Debe seleccionar un colaborador.' },
        { status: 400 }
      );
    }

    // Validación estricta de saldo acumulado disponible en el ciclo
    const resumen = await getLiquidacionResumen();
    const infoColaborador = resumen.lista.find(
      (c: any) => c.colaborador.toLowerCase() === payload.colaborador.trim().toLowerCase()
    );

    const propinaAcumulada = infoColaborador ? infoColaborador.propinaBruta : 0;
    const deduccionesActuales = infoColaborador ? infoColaborador.deducciones : 0;
    const saldoDisponible = Math.max(0, propinaAcumulada - deduccionesActuales);

    if (saldoDisponible <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'El colaborador no cuenta con saldo de propinas disponible para solicitar adelantos en el ciclo actual.',
        },
        { status: 400 }
      );
    }

    if (monto > saldoDisponible) {
      return NextResponse.json(
        {
          success: false,
          message: `El monto solicitado (S/ ${monto.toFixed(2)}) excede el saldo de propinas disponible (S/ ${saldoDisponible.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const estado = rol === 'Moderador' ? 'Pendiente' : 'Aprobado';
    const fecha = payload.fecha || new Date().toISOString().split('T')[0];

    const adelanto = await prisma.sancionAdelanto.create({
      data: {
        fecha,
        colaborador: payload.colaborador.trim(),
        concepto: 'Adelanto',
        monto,
        detalle: payload.detalle || 'Adelanto de propina',
        estado,
        usuario: usuarioActual,
      },
    });

    await logAuditoria(
      'Solicitud de Adelanto',
      `Adelanto para ${payload.colaborador} por S/ ${monto.toFixed(2)} [${estado}]`,
      usuarioActual
    );

    return NextResponse.json({
      success: true,
      message:
        estado === 'Pendiente'
          ? 'Adelanto registrado como PENDIENTE de aprobación por Administrador/Supervisor.'
          : 'Adelanto aprobado y registrado exitosamente.',
      id: adelanto.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
