import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';
import { getCicloActivo } from '@/lib/formulas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ciclo = await getCicloActivo();
    return NextResponse.json({
      inicio: ciclo.fechaInicio,
      fin: ciclo.fechaFin,
      estado: ciclo.estado,
      id: ciclo.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';

    const { inicio, fin, estado } = await request.json();

    if (!inicio || !fin) {
      return NextResponse.json(
        { success: false, message: 'Las fechas de inicio y fin son obligatorias.' },
        { status: 400 }
      );
    }

    if (inicio > fin) {
      return NextResponse.json(
        { success: false, message: 'La fecha de inicio no puede ser posterior a la fecha de fin.' },
        { status: 400 }
      );
    }

    const cicloActual = await prisma.cicloLiquidacion.findFirst({
      orderBy: { id: 'desc' },
    });

    if (cicloActual) {
      await prisma.cicloLiquidacion.update({
        where: { id: cicloActual.id },
        data: {
          fechaInicio: inicio,
          fechaFin: fin,
          estado: estado || 'Abierto',
        },
      });
    } else {
      await prisma.cicloLiquidacion.create({
        data: {
          fechaInicio: inicio,
          fechaFin: fin,
          estado: estado || 'Abierto',
        },
      });
    }

    await logAuditoria(
      'Configuración de Ciclo',
      `Ciclo activo actualizado: ${inicio} al ${fin} (${estado || 'Abierto'})`,
      usuarioActual
    );

    return NextResponse.json({
      success: true,
      message: 'Ciclo de fechas actualizado exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
