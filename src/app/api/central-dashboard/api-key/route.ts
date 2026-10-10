import { NextResponse } from 'next/server';
import { resolveTiendaId } from '@/lib/tiendas';
import {
  CORS_HEADERS,
  corsJsonResponse,
  generateRandomApiKey,
  getCentralNeuralgicaApiKey,
  setCentralNeuralgicaApiKey,
  validateCentralNeuralgicaAccess,
} from '@/lib/central-neuralgica';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Consulta la API Key activa y la documentación de conexión para Central Neurálgica.
 */
export async function GET(request: Request) {
  try {
    const auth = await validateCentralNeuralgicaAccess(request);

    if (!auth.authorized) {
      return corsJsonResponse(
        {
          success: false,
          error: 'Acceso no autorizado: Se requiere Rango Master para consultar las credenciales de la API.',
        },
        401
      );
    }

    const apiKey = await getCentralNeuralgicaApiKey();
    const url = new URL(request.url);
    const origin = url.origin;

    const endpointV1 = `${origin}/api/v1/central-neuralgica`;
    const endpointLegacy = `${origin}/api/central-dashboard`;

    return corsJsonResponse({
      success: true,
      modulo: 'Central Neurálgica',
      permisos: 'Solo Lectura (Módulo Central Neurálgica)',
      apiKey,
      endpoints: {
        v1: endpointV1,
        legacy: endpointLegacy,
      },
      headersRequeridos: {
        'x-api-key': apiKey,
        // o alternativa estándar
        'Authorization': `Bearer ${apiKey}`,
      },
      parametrosFiltro: {
        sede: 'Nombre o slug de la sede (ej: "San Isidro")',
        inicio: 'Fecha inicio YYYY-MM-DD (ej: "2026-10-01")',
        fin: 'Fecha fin YYYY-MM-DD (ej: "2026-10-15")',
        limite: 'Límite numérico de registros (ej: 50, 0 para todos)',
        seccion: 'Sección a extraer: completo | kpis | ranking | sanciones | perdida100 | bi | registros',
      },
      ejemplosIntegracion: {
        curl: `curl -X GET "${endpointV1}" -H "x-api-key: ${apiKey}"`,
        javascript: `const respuesta = await fetch("${endpointV1}", {\n  headers: {\n    "x-api-key": "${apiKey}"\n  }\n});\nconst datos = await respuesta.json();\nconsole.log(datos.kpis);`,
        python: `import requests\n\nurl = "${endpointV1}"\nheaders = {"x-api-key": "${apiKey}"}\nresp = requests.get(url, headers=headers)\ndata = resp.json()\nprint(data["kpis"])`,
      },
    });
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: 'Error al consultar API Key: ' + err.message },
      500
    );
  }
}

/**
 * Regenera o actualiza la API Key de Central Neurálgica.
 * Requiere sesión activa de usuario con rango Master.
 */
export async function POST(request: Request) {
  try {
    const { user } = await resolveTiendaId(request);
    const esMaster = Boolean(
      user && (
        user.esMaestro ||
        user.id === 'USR-MASTER' ||
        user.rol?.toLowerCase().includes('master') ||
        user.rol?.toLowerCase().includes('maestro')
      )
    );

    if (!esMaster) {
      return corsJsonResponse(
        {
          success: false,
          error: 'Acceso denegado: Solo usuarios con rango Master pueden regenerar la API Key.',
        },
        403
      );
    }

    const body = await request.json().catch(() => ({}));
    const nuevaKey = body.apiKey && typeof body.apiKey === 'string' && body.apiKey.trim()
      ? body.apiKey.trim()
      : generateRandomApiKey();

    await setCentralNeuralgicaApiKey(nuevaKey, user?.nombre || 'Usuario Master');

    return corsJsonResponse({
      success: true,
      mensaje: 'API Key de Central Neurálgica actualizada correctamente.',
      apiKey: nuevaKey,
    });
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: 'Error al actualizar API Key: ' + err.message },
      500
    );
  }
}
