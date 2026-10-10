import { describe, expect, it } from 'vitest';
import {
  CORS_HEADERS,
  extractApiKey,
  formatearFechaIso,
  generateRandomApiKey,
  isValidCentralNeuralgicaApiKey,
} from '../central-neuralgica';

describe('Módulo Central Neurálgica - API y Utilidades', () => {
  describe('formatearFechaIso', () => {
    it('debe formatear objetos Date correctamente a YYYY-MM-DD', () => {
      const fecha = new Date('2026-10-10T12:00:00Z');
      expect(formatearFechaIso(fecha)).toBe('2026-10-10');
    });

    it('debe preservar fechas en formato YYYY-MM-DD', () => {
      expect(formatearFechaIso('2026-10-05')).toBe('2026-10-05');
      expect(formatearFechaIso('2026-12-31T23:59:59')).toBe('2026-12-31');
    });

    it('debe convertir fechas en formato DD/MM/YYYY a YYYY-MM-DD', () => {
      expect(formatearFechaIso('15/10/2026')).toBe('2026-10-15');
      expect(formatearFechaIso('01-05-2026')).toBe('2026-05-01');
    });

    it('debe retornar cadena vacía ante valores nulos o indefinidos', () => {
      expect(formatearFechaIso(null)).toBe('');
      expect(formatearFechaIso(undefined)).toBe('');
    });
  });

  describe('extractApiKey', () => {
    it('debe extraer la clave desde el header x-api-key', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica', {
        headers: {
          'x-api-key': 'cn_live_test_header_key_123',
        },
      });
      expect(extractApiKey(req)).toBe('cn_live_test_header_key_123');
    });

    it('debe extraer la clave desde el header Authorization Bearer', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica', {
        headers: {
          Authorization: 'Bearer cn_live_test_bearer_456',
        },
      });
      expect(extractApiKey(req)).toBe('cn_live_test_bearer_456');
    });

    it('debe extraer la clave desde el header Authorization ApiKey', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica', {
        headers: {
          Authorization: 'ApiKey cn_live_test_apikey_789',
        },
      });
      expect(extractApiKey(req)).toBe('cn_live_test_apikey_789');
    });

    it('debe extraer la clave desde el header custom x-central-api-key', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica', {
        headers: {
          'x-central-api-key': 'cn_live_custom_header_999',
        },
      });
      expect(extractApiKey(req)).toBe('cn_live_custom_header_999');
    });

    it('debe extraer la clave desde los parámetros de consulta URL (api_key)', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica?api_key=cn_live_query_param_key');
      expect(extractApiKey(req)).toBe('cn_live_query_param_key');
    });

    it('debe extraer la clave desde el parámetro token de la URL', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica?token=cn_live_token_param_key');
      expect(extractApiKey(req)).toBe('cn_live_token_param_key');
    });

    it('debe retornar null si no se envía ninguna clave de acceso', () => {
      const req = new Request('https://propinas-one.vercel.app/api/v1/central-neuralgica');
      expect(extractApiKey(req)).toBeNull();
    });
  });

  describe('generateRandomApiKey', () => {
    it('debe generar una clave que empiece con el prefijo cn_live_', () => {
      const key = generateRandomApiKey();
      expect(key.startsWith('cn_live_')).toBe(true);
      expect(key.length).toBeGreaterThan(25);
    });

    it('debe generar claves aleatorias únicas en llamadas sucesivas', () => {
      const key1 = generateRandomApiKey();
      const key2 = generateRandomApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('CORS_HEADERS', () => {
    it('debe permitir llamadas desde cualquier origen (Access-Control-Allow-Origin: *)', () => {
      expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
    });

    it('debe permitir métodos GET y OPTIONS para preflight', () => {
      expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('GET');
      expect(CORS_HEADERS['Access-Control-Allow-Methods']).toContain('OPTIONS');
    });

    it('debe permitir headers de autenticación como x-api-key y Authorization', () => {
      expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('x-api-key');
      expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('Authorization');
    });
  });

  describe('isValidCentralNeuralgicaApiKey', () => {
    it('debe validar correctamente la API Key configurada', async () => {
      const validKey = process.env.CENTRAL_NEURALGICA_API_KEY || 'cn_live_8f3a9b4c2e1d7065e94b28a1c9704e52';
      const isValid = await isValidCentralNeuralgicaApiKey(validKey);
      expect(isValid).toBe(true);
    });

    it('debe rechazar claves incorrectas o maliciosas', async () => {
      expect(await isValidCentralNeuralgicaApiKey('clave_invalida_123')).toBe(false);
      expect(await isValidCentralNeuralgicaApiKey('')).toBe(false);
      expect(await isValidCentralNeuralgicaApiKey(null as any)).toBe(false);
    });
  });
});
