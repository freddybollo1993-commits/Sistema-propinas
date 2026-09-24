import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId } = await resolveTiendaId(request);
    const catalogo = await prisma.reglaSancion.findMany({
      where: { tiendaId },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(catalogo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const usuarioActual = user?.nombre || 'Sistema';
    const rol = user?.rol || '';

    if (rol === 'Moderador') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Acceso denegado: El rol Moderador visualiza el catálogo disciplinario en modo Solo Lectura.',
        },
        { status: 403 }
      );
    }

    const nuevosDatos = await request.json();
    if (!Array.isArray(nuevosDatos)) {
      return NextResponse.json(
        { success: false, message: 'Datos de configuración no válidos.' },
        { status: 400 }
      );
    }

    // Frecuencia compartida para inasistencia injustificada
    let inasistenciaFreq = 1;
    nuevosDatos.forEach((c: any) => {
      if (c.infraccion && c.infraccion.includes('Inasistencia injustificada')) {
        if (c.frecuenciaMax) inasistenciaFreq = parseInt(c.frecuenciaMax);
      }
    });

    for (const c of nuevosDatos) {
      const isInf = c.infraccion && c.infraccion.includes('Inasistencia injustificada');
      const freq = isInf ? inasistenciaFreq : parseInt(c.frecuenciaMax || 1);
      const isTardanza = c.infraccion === 'Tardanza';
      const isBreak = c.infraccion === 'Break';
      const tolMin = isTardanza ? parseInt(c.toleranciaMin || 0) : 0;
      const tolAct = isTardanza && (c.toleranciaActiva === true || String(c.toleranciaActiva).toLowerCase() === 'activo');
      const multVal = isBreak ? parseFloat(c.multiplicador !== undefined ? c.multiplicador : 2) : 0;
      const multAct = isBreak && (c.multiplicadorActivo === true || String(c.multiplicadorActivo).toLowerCase() === 'activo');

      await prisma.reglaSancion.upsert({
        where: {
          infraccion_tiendaId: {
            infraccion: c.infraccion,
            tiendaId,
          },
        },
        update: {
          estado: c.estado || 'Activo',
          monto: parseFloat(c.monto || 0),
          frecuenciaMax: freq,
          consecuencia: c.consecuencia || 'Pérdida del 100% de propinas acumuladas',
          toleranciaMin: tolMin,
          toleranciaActiva: tolAct,
          multiplicador: multVal,
          multiplicadorActivo: multAct,
        },
        create: {
          infraccion: c.infraccion,
          estado: c.estado || 'Activo',
          monto: parseFloat(c.monto || 0),
          frecuenciaMax: freq,
          consecuencia: c.consecuencia || 'Pérdida del 100% de propinas acumuladas',
          toleranciaMin: tolMin,
          toleranciaActiva: tolAct,
          multiplicador: multVal,
          multiplicadorActivo: multAct,
          tiendaId,
        },
      });
    }

    await logAuditoria(
      'Configuración de Sanciones',
      `Catálogo disciplinario actualizado (${nuevosDatos.length} reglas con tolerancia y modificadores) en tienda ${tiendaId}`,
      usuarioActual
    );

    return NextResponse.json({
      success: true,
      message: 'Catálogo de sanciones y tolerancias guardado exitosamente.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
