import { NextResponse } from 'next/server';
import {
  CORS_HEADERS,
  corsJsonResponse,
  getCentralNeuralgicaData,
  validateCentralNeuralgicaAccess,
} from '@/lib/central-neuralgica';

export const dynamic = 'force-dynamic';

/**
 * Manejo de preflight CORS (OPTIONS)
 * Permite que cualquier cliente web o herramienta externa consulte este endpoint.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * API REST v1 para consulta exclusiva del módulo Central Neurálgica.
 * 
 * Permite a entornos web externos centralizados acceder a las métricas corporativas,
 * rankings, ratios y analítica BI de la red de tiendas de manera segura y en modo Solo Lectura.
 * 
 * Autenticación:
 * - Header: 'x-api-key: <API_KEY>' o 'Authorization: Bearer <API_KEY>'
 * - Query param: '?api_key=<API_KEY>'
 * 
 * Parámetros soportados:
 * - sede: Nombre, slug o ID de la sede a filtrar (opcional)
 * - inicio: Fecha de inicio (YYYY-MM-DD, opcional)
 * - fin: Fecha de fin (YYYY-MM-DD, opcional)
 * - limite: Número máximo de registros diarios a retornar (opcional, 0 = todos)
 * - seccion: Sección específica a consultar ('completo', 'kpis', 'ranking', 'sanciones', 'perdida100', 'bi', 'registros')
 */
export async function GET(request: Request) {
  try {
    // 1. Validar autorización (API Key exclusiva o sesión Master)
    const auth = await validateCentralNeuralgicaAccess(request);

    if (!auth.authorized) {
      return corsJsonResponse(
        {
          success: false,
          modulo: 'Central Neurálgica',
          error: auth.error,
          hint: auth.hint,
        },
        auth.status
      );
    }

    // 2. Extraer parámetros de consulta
    const { searchParams } = new URL(request.url);
    const sede = searchParams.get('sede') || '';
    const inicio = searchParams.get('inicio') || '';
    const fin = searchParams.get('fin') || '';
    const limiteStr = searchParams.get('limite');
    const limite = limiteStr !== null ? parseInt(limiteStr, 10) : 0;
    const seccionRaw = searchParams.get('seccion') || 'completo';

    const seccionesValidas = ['completo', 'kpis', 'ranking', 'sanciones', 'perdida100', 'bi', 'registros'] as const;
    const seccion = seccionesValidas.includes(seccionRaw as any) ? (seccionRaw as any) : 'completo';

    // 3. Obtener los datos consolidados de Central Neurálgica
    const data = await getCentralNeuralgicaData({
      sede,
      inicio,
      fin,
      limite,
      seccion,
    });

    return corsJsonResponse(data, 200);
  } catch (err: any) {
    console.error('Error en /api/v1/central-neuralgica:', err);
    return corsJsonResponse(
      {
        success: false,
        modulo: 'Central Neurálgica',
        error: 'Error interno al consultar Central Neurálgica: ' + (err?.message || 'Error desconocido'),
      },
      500
    );
  }
}
