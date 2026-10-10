import { describe, expect, it } from 'vitest';
import { GET as getV1, OPTIONS as optionsV1 } from '../../app/api/v1/central-neuralgica/route';
import { GET as getLegacy } from '../../app/api/central-dashboard/route';
import { GET as getUsuarios } from '../../app/api/usuarios/route';
import { GET as getApiKeyInfo } from '../../app/api/central-dashboard/api-key/route';

describe('Endpoint /api/v1/central-neuralgica', () => {
  it('debe responder a OPTIONS con 204 y encabezados CORS', async () => {
    const res = await optionsV1();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('x-api-key');
  });

  it('debe rechazar solicitudes sin autenticación con 401 Unauthorized', async () => {
    const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica');
    const res = await getV1(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.modulo).toBe('Central Neurálgica');
    expect(body.error).toContain('Se requiere una API Key');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('debe rechazar solicitudes con API Key incorrecta con 403 Forbidden', async () => {
    const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica', {
      headers: {
        'x-api-key': 'cn_live_clave_falsa_e_invalida',
      },
    });
    const res = await getV1(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('API Key inválida');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('debe permitir el acceso con API Key válida configurada', async () => {
    const validKey = process.env.CENTRAL_NEURALGICA_API_KEY || 'cn_live_8f3a9b4c2e1d7065e94b28a1c9704e52';
    const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica?seccion=kpis', {
      headers: {
        'x-api-key': validKey,
      },
    });
    const res = await getV1(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.modulo).toBe('Central Neurálgica');
    expect(body.seccion).toBe('kpis');
    expect(body.kpis).toBeDefined();
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('debe permitir autenticación via parámetro URL ?api_key=', async () => {
    const validKey = process.env.CENTRAL_NEURALGICA_API_KEY || 'cn_live_8f3a9b4c2e1d7065e94b28a1c9704e52';
    const req = new Request(
      `https://propinas-one.vercel.app/api/v1/central-neuralgica?api_key=${validKey}&seccion=kpis`
    );
    const res = await getV1(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.kpis).toBeDefined();
  });

  it('debe permitir autenticación en la ruta legacy /api/central-dashboard con la misma API Key', async () => {
    const validKey = process.env.CENTRAL_NEURALGICA_API_KEY || 'cn_live_8f3a9b4c2e1d7065e94b28a1c9704e52';
    const req = new Request('https://propinas-one.vercel.app/api/central-dashboard?seccion=kpis', {
      headers: {
        'x-api-key': validKey,
      },
    });
    const res = await getLegacy(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.kpis).toBeDefined();
  });

  it('AISLAMIENTO DE SEGURIDAD: La API Key de Central Neurálgica NO otorga acceso a otros módulos (ej. usuarios)', async () => {
    const validKey = process.env.CENTRAL_NEURALGICA_API_KEY || 'cn_live_8f3a9b4c2e1d7065e94b28a1c9704e52';
    const req = new Request('https://propinas-one.vercel.app/api/usuarios', {
      headers: {
        'x-api-key': validKey,
      },
    });
    const res = await getUsuarios(req);
    // Debe rechazar con 401 porque esa API Key es EXCLUSIVA de Central Neurálgica
    expect(res.status).toBe(401);
  });

  it('debe permitir consultar la información y ejemplos de API en /api/central-dashboard/api-key con la API Key', async () => {
    const validKey = process.env.CENTRAL_NEURALGICA_API_KEY || 'cn_live_8f3a9b4c2e1d7065e94b28a1c9704e52';
    const req = new Request('https://propinas-one.vercel.app/api/central-dashboard/api-key', {
      headers: {
        'x-api-key': validKey,
      },
    });
    const res = await getApiKeyInfo(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.apiKey).toBe(validKey);
    expect(body.endpoints.v1).toContain('/api/v1/central-neuralgica');
    expect(body.ejemplosIntegracion.curl).toBeDefined();
    expect(body.ejemplosIntegracion.javascript).toBeDefined();
  });
});
