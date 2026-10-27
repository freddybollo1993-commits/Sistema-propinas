import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';
    const rol = user?.rol || '';

    if (rol !== 'Administrador' && rol !== 'Supervisor' && !user?.esMaestro) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Permisos insuficientes. Solo Administrador o Supervisor pueden aprobar solicitudes.',
        },
        { status: 403 }
      );
    }

    const { id, fila, nuevaAccion, tipo } = await request.json();
    const targetId = parseInt(id || fila, 10);

    if (isNaN(targetId)) {
      return NextResponse.json(
        { success: false, message: 'ID de solicitud inválido.' },
        { status: 400 }
      );
    }

    const estadoFinal = nuevaAccion === 'Aprobado' ? 'Aprobado' : 'Rechazado';

    // 1. Caso: Solicitud de Anulación de Registro de Propinas
    if (tipo === 'ANULACION_PROPINA') {
      const reg = await prisma.registroPropina.findUnique({
        where: { id: targetId },
      });

      if (!reg) {
        return NextResponse.json(
          { success: false, message: `Registro de propinas #${targetId} no encontrado.` },
          { status: 404 }
        );
      }

      if (nuevaAccion === 'Aprobado') {
        await prisma.registroPropina.update({
          where: { id: targetId },
          data: {
            estado: 'Anulado',
            validador: `Aprobado por ${usuarioActual}`,
          },
        });

        await logAuditoria(
          'Validación de Anulación',
          `Anulación del Registro #${targetId} APROBADA por ${usuarioActual} [${rol}]`,
          usuarioActual
        );

        return NextResponse.json({
          success: true,
          message: `Anulación del Registro #${targetId} confirmada. El registro queda formalmente anulado.`,
        });
      } else {
        await prisma.registroPropina.update({
          where: { id: targetId },
          data: {
            estado: 'Activo',
            validador: `Rechazado por ${usuarioActual}`,
          },
        });

        await logAuditoria(
          'Rechazo de Anulación',
          `Solicitud de anulación del Registro #${targetId} RECHAZADA por ${usuarioActual} [${rol}]`,
          usuarioActual
        );

        return NextResponse.json({
          success: true,
          message: `Solicitud de anulación rechazada. El registro #${targetId} permanece activo.`,
        });
      }
    }

    // 2. Caso: Solicitud de Retiro de Fondo Mancomunado
    if (tipo === 'RETIRO_FONDO') {
      const ret = await prisma.retiroFondo.findUnique({
        where: { id: targetId },
      });

      if (!ret) {
        return NextResponse.json(
          { success: false, message: `Solicitud de retiro #${targetId} no encontrada.` },
          { status: 404 }
        );
      }

      await prisma.retiroFondo.update({
        where: { id: targetId },
        data: { estado: estadoFinal },
      });

      await logAuditoria(
        estadoFinal === 'Aprobado' ? 'Aprobación de Retiro' : 'Rechazo de Retiro',
        `Solicitud de retiro #${targetId} (${ret.concepto} - S/ ${ret.monto.toFixed(2)}) ${estadoFinal.toUpperCase()} por ${usuarioActual} [${rol}]`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message:
          estadoFinal === 'Aprobado'
            ? `Retiro de S/ ${ret.monto.toFixed(2)} para '${ret.concepto}' aprobado y descontado del Fondo.`
            : `Solicitud de retiro #${targetId} rechazada exitosamente.`,
      });
    }

    // 3. Caso: Sanciones o Adelantos (SancionAdelanto)
    // También actúa como fallback seguro si no se pasó el tipo
    const sancion = await prisma.sancionAdelanto.findUnique({
      where: { id: targetId },
    });

    if (sancion) {
      const item = await prisma.sancionAdelanto.update({
        where: { id: targetId },
        data: { estado: estadoFinal },
      });

      await logAuditoria(
        'Resolución de Solicitud',
        `Solicitud #${targetId} (${item.concepto} para ${item.colaborador}) marcada como ${estadoFinal} por ${usuarioActual} [${rol}]`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `Solicitud ${estadoFinal.toLowerCase()} correctamente.`,
      });
    }

    // Fallback dinámico si no venía tipo pero el ID coincide con RegistroPropina o RetiroFondo
    const regFallback = await prisma.registroPropina.findUnique({ where: { id: targetId } });
    if (regFallback && regFallback.estado === 'Pendiente de Anulación') {
      const nuevoEst = nuevaAccion === 'Aprobado' ? 'Anulado' : 'Activo';
      await prisma.registroPropina.update({
        where: { id: targetId },
        data: {
          estado: nuevoEst,
          validador: `${nuevaAccion} por ${usuarioActual}`,
        },
      });
      return NextResponse.json({
        success: true,
        message: `Solicitud de anulación ${nuevaAccion.toLowerCase()} correctamente.`,
      });
    }

    const retFallback = await prisma.retiroFondo.findUnique({ where: { id: targetId } });
    if (retFallback && retFallback.estado === 'Pendiente') {
      await prisma.retiroFondo.update({
        where: { id: targetId },
        data: { estado: estadoFinal },
      });
      return NextResponse.json({
        success: true,
        message: `Solicitud de retiro ${estadoFinal.toLowerCase()} correctamente.`,
      });
    }

    return NextResponse.json(
      { success: false, message: `Registro con ID #${targetId} no encontrado.` },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
