'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ModCentralNeuralgica from '@/components/modules/ModCentralNeuralgica';

function StandaloneCentralNeuralgicaContent() {
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState<string>('');
  const [inputKey, setInputKey] = useState<string>('');
  const [validando, setValidando] = useState<boolean>(true);
  const [autorizado, setAutorizado] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    inicializarAcceso();
  }, [searchParams]);

  const inicializarAcceso = async () => {
    setValidando(true);
    setErrorMsg('');

    // 1. Clave enviada por parámetro de URL (?key=... o ?apiKey=... o ?token=...)
    const paramKey =
      searchParams.get('key') ||
      searchParams.get('apiKey') ||
      searchParams.get('token') ||
      searchParams.get('api_key');

    if (paramKey && paramKey.trim()) {
      const ok = await verificarKey(paramKey.trim());
      if (ok) {
        setApiKey(paramKey.trim());
        setAutorizado(true);
        setValidando(false);
        try {
          sessionStorage.setItem('cn_standalone_key', paramKey.trim());
        } catch {}
        return;
      } else {
        setErrorMsg('La clave provista en el enlace no es válida o fue revocada.');
      }
    }

    // 2. Clave guardada en sessionStorage
    try {
      const savedKey = sessionStorage.getItem('cn_standalone_key');
      if (savedKey) {
        const ok = await verificarKey(savedKey);
        if (ok) {
          setApiKey(savedKey);
          setAutorizado(true);
          setValidando(false);
          return;
        }
      }
    } catch {}

    // 3. Comprobar si el usuario tiene sesión activa con Rango Master en este navegador
    try {
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe?.authenticated && dataMe?.user?.esMaestro) {
        setAutorizado(true);
        setValidando(false);
        return;
      }
    } catch {}

    // 4. Si no hay clave ni sesión, mostrar pantalla de ingreso de clave
    setValidando(false);
  };

  const verificarKey = async (clave: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/central-neuralgica?limite=1', {
        headers: {
          'x-api-key': clave,
        },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setValidando(true);
    setErrorMsg('');

    const ok = await verificarKey(inputKey.trim());
    setValidando(false);

    if (ok) {
      setApiKey(inputKey.trim());
      setAutorizado(true);
      try {
        sessionStorage.setItem('cn_standalone_key', inputKey.trim());
      } catch {}
    } else {
      setErrorMsg('Clave de acceso inválida. Verifica tus credenciales corporativas.');
    }
  };

  if (validando) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-dark text-white p-4">
        <div className="spinner-border text-danger mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
        <h5 className="fw-bold text-white mb-1">Cargando Central Neurálgica...</h5>
        <p className="text-white-50 small mb-0">Verificando autorización y canal seguro de datos</p>
      </div>
    );
  }

  if (!autorizado) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-3"
        style={{
          background: 'linear-gradient(135deg, #0c1017 0%, #18202e 60%, #0c1017 100%)',
        }}
      >
        <div className="card border-0 shadow-lg rounded-4 text-white overflow-hidden" style={{ maxWidth: '460px', width: '100%', background: '#111827' }}>
          <div className="card-body p-4 p-md-5 text-center">
            <div className="mb-3">
              <span className="badge bg-danger bg-opacity-25 text-danger-subtle p-3 rounded-circle border border-danger border-opacity-25">
                <i className="bi bi-hdd-network-fill fs-2"></i>
              </span>
            </div>

            <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
              <span className="hanko-stamp border-danger text-danger bg-danger-subtle" style={{ fontSize: '0.65rem' }}>
                統合分析
              </span>
              <span className="badge bg-danger-subtle text-danger fw-bold border border-danger-subtle" style={{ fontSize: '0.7rem' }}>
                Acceso Aislado
              </span>
            </div>

            <h4 className="fw-bold text-white mb-2">Central Neurálgica (BI)</h4>
            <p className="text-white-50 small mb-4">
              Ingresa tu clave de acceso para visualizar los indicadores consolidados de la red multi-tienda.
            </p>

            {errorMsg && (
              <div className="alert alert-danger py-2 px-3 small border-0 rounded-3 text-start mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleManualLogin}>
              <div className="mb-3 text-start">
                <label className="form-label small text-white-50 fw-semibold mb-1">
                  Clave de Acceso (API Key)
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary border-opacity-50 text-white-50">
                    <i className="bi bi-key-fill text-warning"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control bg-dark text-white border-secondary border-opacity-50 font-monospace"
                    placeholder="cn_live_..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-danger w-100 fw-bold py-2 shadow-sm rounded-3 d-flex align-items-center justify-content-center gap-2"
              >
                <span>Acceder al Módulo</span>
                <i className="bi bi-arrow-right"></i>
              </button>
            </form>

            <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-white-50" style={{ fontSize: '0.72rem' }}>
              <i className="bi bi-shield-check me-1 text-success"></i>
              Conexión cifrada • Acceso exclusivo al módulo de BI en modo Solo Lectura.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-slate-50">
      {/* Barra Superior Discreta de Navegación Externa */}
      <div className="bg-dark text-white px-3 py-2 border-bottom border-secondary border-opacity-25 d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-danger p-1 rounded-circle" style={{ width: '8px', height: '8px' }}></span>
          <span className="fw-bold small text-white">Central Neurálgica • Vista Integrada</span>
          <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25" style={{ fontSize: '0.65rem' }}>
            <i className="bi bi-shield-lock-fill me-1"></i>Módulo Aislado (Solo Lectura)
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm text-white-50"
            style={{ fontSize: '0.75rem' }}
            onClick={() => {
              try {
                sessionStorage.removeItem('cn_standalone_key');
              } catch {}
              setAutorizado(false);
              setApiKey('');
            }}
            title="Cerrar vista externa"
          >
            <i className="bi bi-box-arrow-right me-1"></i>Salir
          </button>
        </div>
      </div>

      {/* Renderizado idéntico del módulo Central Neurálgica */}
      <div className="p-2 p-md-3">
        <ModCentralNeuralgica
          apiKey={apiKey || undefined}
          isStandalone={true}
          currentUser={{
            id: 'USR-INTEGRACION-EXTERNA',
            nombre: 'Entorno Centralizado Externo',
            email: 'integracion@corporativo.com',
            rol: 'Master Externo (Solo Lectura)',
            estado: 'Activo',
            esMaestro: true,
          }}
        />
      </div>
    </div>
  );
}

export default function StandaloneCentralNeuralgicaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-dark text-white p-4">
          <div className="spinner-border text-danger mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
          <h5 className="fw-bold text-white mb-1">Cargando Central Neurálgica...</h5>
        </div>
      }
    >
      <StandaloneCentralNeuralgicaContent />
    </Suspense>
  );
}
