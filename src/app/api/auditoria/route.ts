import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = await prisma.auditoria.findMany({
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
