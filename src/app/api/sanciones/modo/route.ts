import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';
import { getModoSanciones } from '@/lib/formulas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const modo = await getModoSanciones();
    return NextResponse.json({ success: true, modo });
  } catch (error: any) {
    return NextResponse.json({ success: true, modo: 'CLASICO', error: error.message });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';
    const idUsuario = user?.id || '';

    // Validar que solo el Usuario Maestro o Administrador pueda conmutar el modo
    const esMaster =
      idUsuario === 'USR-MASTER' ||
      user?.esMaestro ||
      user?.rol === 'Administrador' ||
      usuarioActual.toLowerCase().includes('maestro') ||
      idUsuario.toLowerCase().includes('master');

    if (!esMaster) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Acceso denegado: Únicamente el Usuario Maestro (USR-MASTER) o Administrador está facultado para alternar la modalidad.',
        },
        { status: 403 }
      );
    }

    const { nuevoModo } = await request.json();
    const modoNormalizado =
      String(nuevoModo).trim().toUpperCase() === 'FONDO_MANCOMUNADO'
        ? 'FONDO_MANCOMUNADO'
        : 'CLASICO';

    await prisma.configuracionSistema.upsert({
      where: { clave: 'MODO_SANCIONES' },
      update: {
        valor: modoNormalizado,
        actualizadoPor: usuarioActual,
      },
      create: {
        clave: 'MODO_SANCIONES',
        valor: modoNormalizado,
        actualizadoPor: usuarioActual,
      },
    });

    const nombreModoVisual =
      modoNormalizado === 'FONDO_MANCOMUNADO' ? 'Fondo Mancomunado' : 'Modo Clásico';

    await logAuditoria(
      'Configuración de Sistema',
      `Modo de sanciones cambiado a: ${nombreModoVisual} por ${usuarioActual} [${idUsuario}]`,
      usuarioActual
    );

    return NextResponse.json({
      success: true,
      modo: modoNormalizado,
      message: `Modo de sanciones actualizado con éxito a: ${nombreModoVisual}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
