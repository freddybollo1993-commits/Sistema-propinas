import { NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  corsJsonResponse,
  getCentralNeuralgicaData,
  validateCentralNeuralgicaAccess,
} from '@/lib/central-neuralgica';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request: Request) {
  try {
    const auth = await validateCentralNeuralgicaAccess(request);

    if (!auth.authorized) {
      return corsJsonResponse(
        {
          success: false,
          error:
            auth.error ||
            'Acceso denegado: El módulo Central Neurálgica está restringido exclusivamente a cuentas con rango Master o API Key autorizada.',
          hint: auth.hint,
        },
        auth.status
      );
    }

    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede') || '';
    const inicio = searchParams.get('inicio') || '';
    const fin = searchParams.get('fin') || '';
    const limiteStr = searchParams.get('limite');
    const limite = limiteStr !== null ? parseInt(limiteStr, 10) : 0;
    const seccionRaw = searchParams.get('seccion') || 'completo';

    const seccionesValidas = ['completo', 'kpis', 'ranking', 'sanciones', 'perdida100', 'bi', 'registros'] as const;
    const seccion = seccionesValidas.includes(seccionRaw as any) ? (seccionRaw as any) : 'completo';

    const data = await getCentralNeuralgicaData({
      sede,
      inicio,
      fin,
      limite,
      seccion,
    });

    return corsJsonResponse(data, 200);
  } catch (err: any) {
    console.error('Error en /api/central-dashboard:', err);
    return corsJsonResponse(
      { success: false, message: 'Error al generar analítica central: ' + err.message },
      500
    );
  }
}
