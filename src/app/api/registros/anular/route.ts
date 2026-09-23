import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';
    const rol = user?.rol || 'Moderador';

    const { idRegistro, justificacion, accion } = await request.json();

    const regId = parseInt(idRegistro, 10);
    if (isNaN(regId)) {
      return NextResponse.json({ success: false, message: 'ID de registro inválido.' }, { status: 400 });
    }

    const reg = await prisma.registroPropina.findUnique({
      where: { id: regId },
    });

    if (!reg) {
      return NextResponse.json(
        { success: false, message: `Registro #${regId} no encontrado.` },
        { status: 404 }
      );
    }

    const esValidador = rol === 'Administrador' || rol === 'Supervisor' || user?.esMaestro;

    // Si viene la acción directa de resolver ("Aprobar" o "Rechazar")
    if (accion) {
      if (!esValidador) {
        return NextResponse.json(
          { success: false, message: 'Permisos insuficientes. Solo Administrador o Supervisor pueden validar anulaciones.' },
          { status: 403 }
        );
      }

      if (accion === 'Aprobar') {
        await prisma.registroPropina.update({
          where: { id: regId },
          data: {
            estado: 'Anulado',
            validador: `Aprobado por ${usuarioActual}`,
          },
        });

        await logAuditoria(
          'Validación de Anulación',
          `Anulación del Registro #${regId} APROBADA por ${usuarioActual}`,
          usuarioActual
        );

        return NextResponse.json({
          success: true,
          message: `Anulación del Registro #${regId} confirmada. El registro queda excluido de la liquidación.`,
        });
      } else {
        await prisma.registroPropina.update({
          where: { id: regId },
          data: {
            estado: 'Activo',
            validador: `Rechazado por ${usuarioActual}`,
          },
        });

        await logAuditoria(
          'Rechazo de Anulación',
          `Solicitud de anulación del Registro #${regId} RECHAZADA por ${usuarioActual}`,
          usuarioActual
        );

        return NextResponse.json({
          success: true,
          message: `Solicitud de anulación rechazada. El registro permanece activo.`,
        });
      }
    }

    // Si es solicitud de anulación inicial
    if (!justificacion || String(justificacion).trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Debe ingresar una justificación o comentario obligatorio para la anulación.' },
        { status: 400 }
      );
    }

    const cleanJust = String(justificacion).trim();
    const nuevoEstado = esValidador ? 'Anulado' : 'Pendiente de Anulación';
    const detalleValidador = esValidador ? `${usuarioActual} (Aprobado)` : `Solicitado por ${usuarioActual}`;

    await prisma.registroPropina.update({
      where: { id: regId },
      data: {
        estado: nuevoEstado,
        justificacion: cleanJust,
        validador: detalleValidador,
      },
    });

    if (esValidador) {
      await logAuditoria(
        'Anulación de Registro de Propinas',
        `Registro #${regId} anulado y validado directamente por ${usuarioActual}. Justificación: ${cleanJust}`,
        usuarioActual
      );
      return NextResponse.json({
        success: true,
        message: `Registro #${regId} anulado exitosamente y excluido de los cálculos.`,
      });
    } else {
      await logAuditoria(
        'Solicitud de Anulación de Propinas',
        `Moderador ${usuarioActual} solicitó anular Registro #${regId}. Justificación: ${cleanJust}`,
        usuarioActual
      );
      return NextResponse.json({
        success: true,
        message: `Solicitud de anulación registrada como PENDIENTE de validación por Administrador o Supervisor.`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
