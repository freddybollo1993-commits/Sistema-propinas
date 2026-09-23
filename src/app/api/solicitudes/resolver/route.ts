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

    const { id, fila, nuevaAccion } = await request.json();
    const targetId = parseInt(id || fila, 10);

    if (isNaN(targetId)) {
      return NextResponse.json(
        { success: false, message: 'ID de solicitud inválido.' },
        { status: 400 }
      );
    }

    const estadoFinal = nuevaAccion === 'Aprobado' ? 'Aprobado' : 'Rechazado';

    const item = await prisma.sancionAdelanto.update({
      where: { id: targetId },
      data: { estado: estadoFinal },
    });

    await logAuditoria(
      'Resolución de Solicitud',
      `Solicitud #${targetId} (${item.concepto} para ${item.colaborador}) marcada como ${estadoFinal}`,
      usuarioActual
    );

    return NextResponse.json({
      success: true,
      message: `Solicitud ${estadoFinal.toLowerCase()} correctamente.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
