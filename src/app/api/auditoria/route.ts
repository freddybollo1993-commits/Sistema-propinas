import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);

    const whereClause: any = {};
    if (!user?.esMaestro) {
      whereClause.OR = [
        { tiendaId },
        { tiendaId: null }, // Logs generales
      ];
    }

    const logs = await prisma.auditoria.findMany({
      where: whereClause,
      orderBy: { id: 'desc' },
      take: 200,
    });

    const lista = logs.map((l) => ({
      id: l.id,
      fecha: l.fechaHora.toISOString().replace('T', ' ').substring(0, 19),
      usuario: l.usuario,
      accion: l.accion,
      detalle: l.detalle,
    }));

    return NextResponse.json(lista);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
