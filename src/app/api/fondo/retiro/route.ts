import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { getEstadoFondoMancomunado } from '@/lib/formulas';
import { resolveTiendaId } from '@/lib/tiendas';

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const usuarioActual = user?.nombre || 'Sistema';
    const rolUsuario = user?.rol || 'Moderador';
    const idUsuario = user?.id || '';

    const esAutorizado =
      rolUsuario === 'Administrador' ||
      rolUsuario === 'Supervisor' ||
      idUsuario === 'USR-MASTER' ||
      user?.esMaestro ||
      usuarioActual.toLowerCase().includes('maestro') ||
      usuarioActual.toLowerCase().includes('admin') ||
      usuarioActual.toLowerCase().includes('super');

    if (!esAutorizado) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Acceso denegado: Solo usuarios con rango Supervisor, Administrador o Maestro pueden registrar retiros del Fondo Mancomunado.',
        },
        { status: 403 }
      );
    }

    const payload = await request.json();
    const monto = parseFloat(payload.monto);

    if (isNaN(monto) || monto <= 0) {
      return NextResponse.json(
        { success: false, message: 'Debe ingresar un monto numérico válido y mayor a 0.' },
        { status: 400 }
      );
    }

    const concepto = String(payload.concepto || '').trim();
    if (!concepto) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Debe especificar el concepto del gasto común (ej. Comida, Lonche, Merienda, Daños internos).',
        },
        { status: 400 }
      );
    }

    const justificacion = String(payload.justificacion || '').trim();
    if (!justificacion) {
      return NextResponse.json(
        {
          success: false,
          message: 'Debe ingresar una justificación obligatoria explicando el motivo del retiro.',
        },
        { status: 400 }
      );
    }

    // Validar saldo disponible en el fondo de esta tienda
    const estadoFondo = await getEstadoFondoMancomunado({ tiendaId });
    if (monto > estadoFondo.saldoDisponibleActual) {
      return NextResponse.json(
        {
          success: false,
          message: `Saldo insuficiente: El monto solicitado (S/ ${monto.toFixed(2)}) supera el saldo disponible en el Fondo Mancomunado (S/ ${estadoFondo.saldoDisponibleActual.toFixed(2)}).`,
        },
        { status: 400 }
      );
    }

    const fecha = payload.fecha || new Date().toISOString().split('T')[0];

    const retiro = await prisma.retiroFondo.create({
      data: {
        fecha,
        concepto,
        monto,
        justificacion,
        solicitadoPor: usuarioActual,
        rol: rolUsuario,
        estado: 'Aprobado',
        tiendaId,
      },
    });

    await logAuditoria(
      'Retiro Fondo Mancomunado',
      `Retiro de S/ ${monto.toFixed(2)} para '${concepto}'. Justificación: ${justificacion} por ${usuarioActual} [${rolUsuario}] en tienda ${tiendaId}`,
      usuarioActual
    );

    return NextResponse.json({
      success: true,
      message: `Retiro de S/ ${monto.toFixed(2)} para '${concepto}' registrado y descontado del Fondo Mancomunado exitosamente.`,
      id: retiro.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
