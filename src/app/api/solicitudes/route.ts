import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/solicitudes
 * Retorna las solicitudes pendientes de aprobación (rol Moderador).
 * Solo accesible para Administrador, Supervisor o Maestro.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const rol = user?.rol || '';

    if (rol !== 'Administrador' && rol !== 'Supervisor' && !user?.esMaestro) {
      return NextResponse.json(
        { success: false, message: 'Permisos insuficientes.' },
        { status: 403 }
      );
    }

    const { tiendaId } = await resolveTiendaId(request);

    const pendientes = await prisma.sancionAdelanto.findMany({
      where: {
        estado: 'Pendiente',
        tiendaId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const lista = pendientes.map((s) => ({
      id: s.id,
      fecha: s.fecha,
      colaborador: s.colaborador,
      concepto: s.concepto,
      monto: s.monto,
      detalle: s.detalle || '',
      usuario: s.usuario,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ success: true, total: lista.length, lista });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
