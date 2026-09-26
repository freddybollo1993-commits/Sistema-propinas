'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface MasterStoreHubProps {
  currentUser: SessionUser | null;
  tiendas: any[];
  onSelectTienda: (tiendaId: string) => void;
  onNavigateToModule: (modulo: string) => void;
  onOpenCrearTienda: () => void;
}

export default function MasterStoreHub({
  currentUser,
  tiendas,
  onSelectTienda,
  onNavigateToModule,
  onOpenCrearTienda,
}: MasterStoreHubProps) {
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'operativas' | 'beta'>('todas');
  const [resumenCentral, setResumenCentral] = useState<any>(null);

  useEffect(() => {
    fetch('/api/central-dashboard?limite=1')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setResumenCentral(data.kpis);
        }
      })
      .catch(() => {});
  }, []);

  const esBeta = (t: any) => {
    const nom = (t.nombre || '').toLowerCase();
    const slug = (t.slug || '').toLowerCase();
    const id = (t.id || '').toLowerCase();
    return slug.includes('beta') || id === 'tienda-principal' || nom.includes('beta') || nom.includes('pruebas');
  };

  const tiendasOperativas = tiendas.filter((t) => !esBeta(t));
  const tiendasBeta = tiendas.filter((t) => esBeta(t));

  const tiendasFiltradas = tiendas.filter((t) => {
    const matchTexto =
      (t.nombre || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (t.slug || '').toLowerCase().includes(filtroTexto.toLowerCase()) ||
      (t.direccion || '').toLowerCase().includes(filtroTexto.toLowerCase());

    if (!matchTexto) return false;

    if (filtroTipo === 'operativas') return !esBeta(t);
    if (filtroTipo === 'beta') return esBeta(t);
    return true;
  });

  const totalColabsGlobal = tiendas.reduce((acc, t) => acc + (t._count?.personal || 0), 0);
  const totalRegistrosGlobal = tiendas.reduce((acc, t) => acc + (t._count?.registros || 0), 0);

  const handleEntrarTienda = (tiendaId: string, moduloDestino = 'Dashboard') => {
    onSelectTienda(tiendaId);
    onNavigateToModule(moduloDestino);
  };

  return (
    <div className="container-fluid p-0">
      {/* Hero Banner Corporativo Takumi */}
      <div
        className="card border-0 shadow-lg mb-4 text-white overflow-hidden position-relative"
        style={{
          background: 'linear-gradient(135deg, #0c1017 0%, #18202e 60%, #0c1017 100%)',
          borderRadius: '20px',
        }}
      >
        {/* Subtle Ambient Torii Glow */}
        <div
          className="position-absolute"
          style={{
            top: '-50px',
            right: '5%',
            width: '380px',
            height: '380px',
            background: 'radial-gradient(circle, rgba(217, 45, 32, 0.22) 0%, rgba(217, 45, 32, 0) 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        ></div>

        {/* Japanese Kanji Watermark In Banner */}
        <div
          className="position-absolute kanji-watermark text-white"
          style={{
            fontSize: '14rem',
            right: '20px',
            bottom: '-40px',
            zIndex: 0,
            opacity: 0.03,
          }}
        >
          全店舗
        </div>

        <div className="card-body p-4 p-md-5 position-relative" style={{ zIndex: 1 }}>
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                <span className="hanko-stamp border-danger text-danger bg-danger-subtle">
                  <i className="bi bi-shield-lock-fill me-1"></i> 統括ポータル
                </span>
                <span className="badge bg-danger px-3 py-1 fw-bold text-uppercase" style={{ letterSpacing: '0.08em', fontSize: '0.72rem' }}>
                  Panel Maestro Corporativo
                </span>
                <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-1" style={{ fontSize: '0.72rem' }}>
                  <span className="pulse-dot me-1" style={{ width: '6px', height: '6px' }}></span> Acceso Total Autorizado
                </span>
              </div>
              <h2 className="fw-bold mb-2 text-white d-flex align-items-center gap-2 flex-wrap" style={{ letterSpacing: '-0.02em' }}>
                <span>Catálogo de Red y Portal Multi-Tienda</span>
                <span className="text-danger-subtle" style={{ fontSize: '1.2rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>嶋屋</span>
              </h2>
              <p className="text-white-50 fs-6 mb-4" style={{ maxWidth: '680px' }}>
                Hub centralizado de supervisión y gestión. Explora la{' '}
                <strong className="text-white">Central Neurálgica (BI)</strong> para auditar indicadores de la cadena o accede al entorno operativo aislado de cualquiera de las sedes.
              </p>

              <div className="d-flex align-items-center gap-2 gap-sm-3 flex-wrap">
                <button
                  type="button"
                  className="btn btn-primary fw-bold px-4 py-2 shadow-sm d-flex align-items-center gap-2 rounded-3"
                  onClick={() => onNavigateToModule('CentralNeuralgica')}
                >
                  <i className="bi bi-hdd-network-fill fs-5"></i>
                  <span>Central Neurálgica (BI)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-warning text-dark fw-bold px-3 py-2 shadow-sm d-flex align-items-center gap-2 rounded-3"
                  onClick={() => onNavigateToModule('CredencialesTiendas')}
                >
                  <i className="bi bi-key-fill fs-5"></i>
                  <span>Credenciales de Tiendas</span>
                </button>

                <button
                  type="button"
                  className="btn btn-outline-light fw-semibold px-3 py-2 shadow-sm d-flex align-items-center gap-2 rounded-3"
                  onClick={onOpenCrearTienda}
                >
                  <i className="bi bi-plus-circle-fill text-info"></i>
                  <span>Registrar Nueva Tienda</span>
                </button>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="p-3 rounded-4 shadow-sm border border-secondary border-opacity-25"
                style={{ background: 'rgba(255, 255, 255, 0.04)', backdropFilter: 'blur(8px)' }}
              >
                <div className="text-white-50 small fw-bold text-uppercase mb-2" style={{ letterSpacing: '0.06em', fontSize: '0.72rem' }}>
                  <i className="bi bi-graph-up me-1 text-info"></i> Infraestructura de Red
                </div>
                <div className="row g-2 text-center">
                  <div className="col-6">
                    <div className="p-2 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
                      <div className="fs-4 fw-bold text-info font-mono">{tiendasOperativas.length}</div>
                      <div className="text-white-50" style={{ fontSize: '0.74rem' }}>Sedes Operativas</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
                      <div className="fs-4 fw-bold text-warning font-mono">{tiendasBeta.length}</div>
                      <div className="text-white-50" style={{ fontSize: '0.74rem' }}>Sedes Sandbox</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
                      <div className="fs-5 fw-bold text-success font-mono">{totalColabsGlobal}</div>
                      <div className="text-white-50" style={{ fontSize: '0.74rem' }}>Colaboradores</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
                      <div className="fs-5 fw-bold text-primary font-mono">{totalRegistrosGlobal}</div>
                      <div className="text-white-50" style={{ fontSize: '0.74rem' }}>Jornadas Totales</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Destacada: Acceso a Central Neurálgica */}
      <div className="card border-0 shadow-sm mb-4 bg-white" style={{ borderRadius: '16px', borderLeft: '5px solid #2563eb' }}>
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center shadow-xs flex-shrink-0"
                style={{ width: '54px', height: '54px', fontSize: '1.5rem' }}
              >
                <i className="bi bi-hdd-network-fill"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h5 className="fw-bold mb-0 text-slate-900">Central Neurálgica & BI Corporativo</h5>
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                    Torre de Control
                  </span>
                </div>
                <p className="text-secondary small mb-0">
                  Monitoreo de {tiendasOperativas.length} tiendas operativas en tiempo real. Análisis comparativo de ratios Salón/Cocina, Matriz de Calor y Auditoría Disciplinaria.
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              {resumenCentral && (
                <div className="text-end d-none d-md-block pe-3 border-end">
                  <div className="small text-secondary">Recaudación Red:</div>
                  <div className="fw-bold text-primary fs-5 font-mono">
                    S/ {parseFloat(resumenCentral.totalRed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary fw-bold px-4 py-2 shadow-xs d-flex align-items-center gap-2 rounded-3"
                onClick={() => onNavigateToModule('CentralNeuralgica')}
              >
                <span>Acceder a la Central</span>
                <i className="bi bi-arrow-right-circle-fill"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda del Catálogo */}
      <div className="card border-0 shadow-sm p-3 mb-4 bg-white" style={{ borderRadius: '14px' }}>
        <div className="row g-3 align-items-center justify-content-between">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0 text-secondary">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Buscar tienda por nombre, slug o dirección..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-7 d-flex justify-content-md-end align-items-center gap-2 flex-wrap">
            <span className="small fw-bold text-secondary">Filtrar:</span>
            <div className="segmented-control" role="group">
              <button
                type="button"
                className={`segmented-control-btn ${filtroTipo === 'todas' ? 'active' : ''}`}
                onClick={() => setFiltroTipo('todas')}
              >
                Todas ({tiendas.length})
              </button>
              <button
                type="button"
                className={`segmented-control-btn ${filtroTipo === 'operativas' ? 'active' : ''}`}
                onClick={() => setFiltroTipo('operativas')}
              >
                Operativas ({tiendasOperativas.length})
              </button>
              <button
                type="button"
                className={`segmented-control-btn ${filtroTipo === 'beta' ? 'active' : ''}`}
                onClick={() => setFiltroTipo('beta')}
              >
                BETA / Pruebas ({tiendasBeta.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: TIENDAS OPERATIVAS */}
      {(filtroTipo === 'todas' || filtroTipo === 'operativas') && (
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-shop text-primary fs-5"></i>
            <h5 className="fw-bold mb-0 text-slate-900">Tiendas y Sucursales Operativas</h5>
            <span className="badge bg-secondary rounded-pill">{tiendasOperativas.length} sedes</span>
          </div>

          <div className="row g-3">
            {tiendasFiltradas
              .filter((t) => !esBeta(t))
              .map((tienda) => {
                const esMancomunado = (tienda.slug || '').includes('punta-mar') || (tienda.nombre || '').toLowerCase().includes('mancomunado');
                const adminUser = `admin.${tienda.slug || tienda.id.replace('tienda-', '')}@propinas.pe`;

                return (
                  <div key={tienda.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div
                      className="card h-100 border-0 shadow-sm bg-white"
                      style={{
                        borderRadius: '16px',
                        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(15, 23, 42, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '';
                      }}
                    >
                      <div className="card-body p-4 d-flex flex-column justify-content-between">
                        <div>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 small fw-semibold">
                              <i className="bi bi-shop me-1"></i> Sucursal
                            </span>

                            {esMancomunado ? (
                              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">
                                Fondo Mancomunado
                              </span>
                            ) : (
                              <span className="badge bg-success-subtle text-success border border-success-subtle small">
                                Clásico 60/40
                              </span>
                            )}
                          </div>

                          <h5 className="fw-bold text-slate-900 mb-1 text-truncate" title={tienda.nombre}>
                            {tienda.nombre}
                          </h5>
                          <div className="text-secondary small mb-3">
                            <i className="bi bi-person-badge me-1"></i>
                            <span className="font-mono text-truncate d-inline-block" style={{ fontSize: '0.78rem', maxWidth: '200px' }}>
                              {adminUser}
                            </span>
                          </div>

                          <div className="row g-2 mb-3 text-center">
                            <div className="col-6">
                              <div className="p-2 bg-light rounded-3 border">
                                <div className="fw-bold text-dark font-mono small">
                                  {tienda._count?.personal || 0}
                                </div>
                                <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Colaboradores</div>
                              </div>
                            </div>
                            <div className="col-6">
                              <div className="p-2 bg-light rounded-3 border">
                                <div className="fw-bold text-primary font-mono small">
                                  {tienda._count?.registros || 0}
                                </div>
                                <div className="text-secondary" style={{ fontSize: '0.72rem' }}>Jornadas</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm w-100 fw-bold py-2 shadow-xs rounded-3 d-flex align-items-center justify-content-center gap-1"
                            onClick={() => handleEntrarTienda(tienda.id, 'Dashboard')}
                          >
                            <i className="bi bi-box-arrow-in-right"></i>
                            <span>Ingresar a {tienda.nombre}</span>
                          </button>

                          <div className="d-flex gap-1 mt-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm flex-fill py-1"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => handleEntrarTienda(tienda.id, 'Personal')}
                              title="Ver Personal de esta tienda"
                            >
                              Personal
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm flex-fill py-1"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => handleEntrarTienda(tienda.id, 'RegistroPropinas')}
                              title="Ver Propinas de esta tienda"
                            >
                              Propinas
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm flex-fill py-1"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => handleEntrarTienda(tienda.id, 'Liquidacion')}
                              title="Ver Liquidación de esta tienda"
                            >
                              Liquidación
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SECCIÓN 2: ENTORNO DE PRUEBAS / SANDBOX (BETA) */}
      {(filtroTipo === 'todas' || filtroTipo === 'beta') && tiendasBeta.length > 0 && (
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-flask text-warning fs-5"></i>
            <h5 className="fw-bold mb-0 text-slate-900">Entorno de Pruebas & Simulación (Sandbox)</h5>
            <span className="badge bg-warning text-dark rounded-pill">Aislado de la Central</span>
          </div>

          <div className="row g-3">
            {tiendasBeta.map((tienda) => (
              <div key={tienda.id} className="col-12 col-lg-6">
                <div
                  className="card border-0 shadow-sm bg-white"
                  style={{
                    borderRadius: '16px',
                    borderLeft: '5px solid #f59e0b',
                    background: 'linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)',
                  }}
                >
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-warning text-dark border border-warning px-2 py-1 small fw-bold">
                        <i className="bi bi-flask-fill me-1"></i> SEDE BETA / PRUEBAS
                      </span>
                      <span className="badge bg-secondary-subtle text-dark small">
                        Modo Sandbox Seguro
                      </span>
                    </div>

                    <h4 className="fw-bold text-dark mb-1">{tienda.nombre}</h4>
                    <p className="text-secondary small mb-3">
                      Esta tienda funciona como <strong>entorno de pruebas aislado</strong>. Cualquier cambio de configuración, registro de turnos o simulación de sanciones efectuado aquí <em>no</em> altera los KPIs ni las estadísticas de las tiendas en producción ni de la Central Neurálgica.
                    </p>

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                      <div className="small text-secondary">
                        <i className="bi bi-key-fill text-warning me-1"></i>
                        Usuario: <span className="font-mono fw-semibold text-dark">admin.beta@propinas.pe</span> (PIN: 1234)
                      </div>

                      <button
                        type="button"
                        className="btn btn-warning fw-bold px-3 py-2 shadow-xs rounded-3 text-dark d-flex align-items-center gap-1"
                        onClick={() => handleEntrarTienda(tienda.id, 'Dashboard')}
                      >
                        <i className="bi bi-play-circle-fill"></i>
                        <span>Ingresar a Modo Pruebas</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
