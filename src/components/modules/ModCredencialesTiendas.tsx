'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModCredencialesTiendasProps {
  currentUser: SessionUser | null;
  onSelectTienda?: (tiendaId: string) => void;
  onNavigateToModule?: (modulo: string) => void;
}

interface CredencialRol {
  usuario: string;
  usuarioCorto: string;
  pin: string;
  rol: string;
}

interface TiendaCredencialItem {
  id: string;
  nombre: string;
  slug: string;
  direccion: string;
  telefono: string;
  estado: string;
  modalidad: string;
  stats?: {
    personal: number;
    usuarios: number;
    registros: number;
  };
  admin: CredencialRol;
  supervisor: CredencialRol;
  moderador: CredencialRol;
}

export default function ModCredencialesTiendas({
  currentUser,
  onSelectTienda,
  onNavigateToModule,
}: ModCredencialesTiendasProps) {
  const [tiendas, setTiendas] = useState<TiendaCredencialItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'operativas' | 'beta'>('todas');
  const [vistaModo, setVistaModo] = useState<'tarjetas' | 'tabla'>('tarjetas');
  const [mostrarPins, setMostrarPins] = useState(true);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  useEffect(() => {
    cargarCredenciales();
  }, []);

  const cargarCredenciales = async () => {
    try {
      setCargando(true);
      setErrorMsg('');
      const res = await fetch('/api/master/credenciales');
      const data = await res.json();
      setCargando(false);
      if (data.success && Array.isArray(data.data)) {
        setTiendas(data.data);
      } else {
        setErrorMsg(data.message || 'No se pudieron cargar las credenciales.');
      }
    } catch (e: any) {
      setCargando(false);
      setErrorMsg(e.message || 'Error de conexión con el servidor.');
    }
  };

  const copiarTexto = async (texto: string, label: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(label);
      setTimeout(() => {
        setCopiadoId(null);
      }, 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
    }
  };

  const copiarFichaTienda = (t: TiendaCredencialItem) => {
    const texto = `🍣 *CREDENCIALES DE ACCESO - ${t.nombre.toUpperCase()}*
📍 *Tienda:* ${t.nombre} (${t.slug})
🌐 *Portal:* https://propinas-one.vercel.app

👑 *ADMINISTRADOR:*
• Usuario: ${t.admin.usuario} (o ${t.admin.usuarioCorto})
• PIN: ${t.admin.pin}

👔 *SUPERVISOR:*
• Usuario: ${t.supervisor.usuario} (o ${t.supervisor.usuarioCorto})
• PIN: ${t.supervisor.pin}

👥 *MODERADOR:*
• Usuario: ${t.moderador.usuario} (o ${t.moderador.usuarioCorto})
• PIN: ${t.moderador.pin}`;

    copiarTexto(texto, `ficha-${t.id}`);
  };

  const copiarTodasLasCredenciales = () => {
    let texto = `🍣 *DIRECTORIO CORPORATIVO DE CREDENCIALES DE TIENDAS*\n`;
    texto += `Fecha: ${new Date().toLocaleDateString('es-PE')}\n\n`;

    tiendasFiltradas.forEach((t) => {
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      texto += `🏪 *${t.nombre.toUpperCase()}* (${t.slug})\n`;
      texto += `  • Admin: ${t.admin.usuarioCorto} | PIN: ${t.admin.pin}\n`;
      texto += `  • Super: ${t.supervisor.usuarioCorto} | PIN: ${t.supervisor.pin}\n`;
      texto += `  • Mod:   ${t.moderador.usuarioCorto} | PIN: ${t.moderador.pin}\n`;
    });

    copiarTexto(texto, 'todas-las-credenciales');
  };

  const esBeta = (t: TiendaCredencialItem) => {
    const s = (t.slug || '').toLowerCase();
    const n = (t.nombre || '').toLowerCase();
    return s.includes('beta') || t.id === 'tienda-principal' || n.includes('beta') || n.includes('pruebas');
  };

  const tiendasFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return tiendas.filter((t) => {
      // Filtro tipo
      if (filtroTipo === 'operativas' && esBeta(t)) return false;
      if (filtroTipo === 'beta' && !esBeta(t)) return false;

      // Filtro texto
      if (!q) return true;
      return (
        t.nombre.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.direccion.toLowerCase().includes(q) ||
        t.admin.usuario.toLowerCase().includes(q) ||
        t.admin.pin.toLowerCase().includes(q) ||
        t.supervisor.usuario.toLowerCase().includes(q) ||
        t.supervisor.pin.toLowerCase().includes(q) ||
        t.moderador.usuario.toLowerCase().includes(q) ||
        t.moderador.pin.toLowerCase().includes(q)
      );
    });
  }, [tiendas, busqueda, filtroTipo]);

  const totalOperativas = useMemo(() => tiendas.filter((t) => !esBeta(t)).length, [tiendas]);
  const totalBeta = useMemo(() => tiendas.filter((t) => esBeta(t)).length, [tiendas]);

  return (
    <div className="container-fluid p-0">
      {/* Toast Flotante de Copiado */}
      {copiadoId && (
        <div
          className="position-fixed top-0 end-0 p-3"
          style={{ zIndex: 9999, transition: 'all 0.3s ease' }}
        >
          <div className="toast show align-items-center text-white bg-dark border-0 shadow-lg" role="alert">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2">
                <i className="bi bi-check-circle-fill text-success fs-5"></i>
                <span className="fw-semibold">
                  {copiadoId.startsWith('ficha-')
                    ? '¡Ficha completa de credenciales copiada!'
                    : copiadoId === 'todas-las-credenciales'
                    ? '¡Directorio completo copiado al portapapeles!'
                    : '¡Copiado al portapapeles!'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div
        className="card border-0 shadow-sm mb-4"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '16px',
        }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-warning text-dark px-3 py-1 fw-bold text-uppercase" style={{ letterSpacing: '1px' }}>
                  <i className="bi bi-key-fill me-1"></i> Credenciales Corporativas
                </span>
                <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25 px-2 py-1">
                  Exclusivo Usuario Maestro
                </span>
              </div>
              <h2 className="fw-bold mb-2 text-white">Directorio de Credenciales por Tienda</h2>
              <p className="text-white-50 fs-6 mb-3" style={{ maxWidth: '680px' }}>
                Acceso centralizado a los usuarios y PINs de todas las tiendas de la cadena.
                Cada sucursal cuenta con 3 perfiles oficiales independientes: <strong>Administrador</strong>,{' '}
                <strong>Supervisor</strong> y <strong>Moderador</strong>.
              </p>

              <div className="d-flex align-items-center gap-3 flex-wrap">
                <button
                  type="button"
                  className="btn btn-outline-light btn-sm fw-semibold px-3 py-2 shadow-sm d-flex align-items-center gap-2"
                  onClick={cargarCredenciales}
                  disabled={cargando}
                >
                  <i className={`bi bi-arrow-clockwise ${cargando ? 'spin' : ''}`}></i>
                  <span>Actualizar Lista</span>
                </button>

                <button
                  type="button"
                  className="btn btn-light btn-sm fw-bold px-3 py-2 shadow-sm d-flex align-items-center gap-2"
                  onClick={copiarTodasLasCredenciales}
                  disabled={tiendasFiltradas.length === 0}
                >
                  <i className="bi bi-clipboard-data text-primary"></i>
                  <span>Copiar Todo el Directorio</span>
                </button>

                <button
                  type="button"
                  className={`btn btn-sm fw-semibold px-3 py-2 shadow-sm d-flex align-items-center gap-2 ${
                    mostrarPins ? 'btn-outline-warning' : 'btn-warning text-dark'
                  }`}
                  onClick={() => setMostrarPins(!mostrarPins)}
                >
                  <i className={`bi ${mostrarPins ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
                  <span>{mostrarPins ? 'Ocultar PINs' : 'Mostrar PINs'}</span>
                </button>
              </div>
            </div>

            <div className="col-lg-4">
              <div
                className="p-3 rounded-4 shadow-sm border border-secondary border-opacity-25"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
              >
                <div className="text-white-50 small fw-bold text-uppercase mb-2">
                  <i className="bi bi-shield-check me-1 text-warning"></i> Cuenta Corporativa Master
                </div>
                <div className="bg-dark bg-opacity-75 p-3 rounded-3 border border-secondary border-opacity-25">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="badge bg-danger text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>
                      Acceso Total
                    </span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-info p-0 text-decoration-none"
                      onClick={() => copiarTexto('admin.master@propinas.pe', 'master-user')}
                    >
                      <i className="bi bi-copy me-1"></i>Copiar
                    </button>
                  </div>
                  <div className="fw-bold text-white small">USR-MASTER / admin.master</div>
                  <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                    Correo: admin.master@propinas.pe
                  </div>
                  <div className="text-warning mt-1" style={{ fontSize: '0.75rem' }}>
                    <i className="bi bi-info-circle me-1"></i>Acceso sin restricción a todas las tiendas
                  </div>
                </div>

                <div className="row g-2 text-center mt-2">
                  <div className="col-6">
                    <div className="p-2 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
                      <div className="fs-5 fw-bold text-info">{totalOperativas}</div>
                      <div className="text-white-50" style={{ fontSize: '0.7rem' }}>Sedes Operativas</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-2 bg-dark bg-opacity-50 rounded-3 border border-secondary border-opacity-25">
                      <div className="fs-5 fw-bold text-warning">{totalBeta}</div>
                      <div className="text-white-50" style={{ fontSize: '0.7rem' }}>Sede BETA / Sandbox</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center justify-content-between">
            {/* Input de Búsqueda */}
            <div className="col-md-5 col-lg-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0 ps-0"
                  placeholder="Buscar tienda, slug, usuario o PIN..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    className="btn btn-light border-start-0"
                    type="button"
                    onClick={() => setBusqueda('')}
                  >
                    <i className="bi bi-x-lg text-muted"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Filtros de Tipo */}
            <div className="col-md-4 col-lg-4">
              <div className="btn-group w-100" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${filtroTipo === 'todas' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFiltroTipo('todas')}
                >
                  Todas ({tiendas.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filtroTipo === 'operativas' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFiltroTipo('operativas')}
                >
                  Operativas ({totalOperativas})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filtroTipo === 'beta' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFiltroTipo('beta')}
                >
                  BETA ({totalBeta})
                </button>
              </div>
            </div>

            {/* Alternar Vista Tarjetas / Tabla */}
            <div className="col-md-3 col-lg-3 text-md-end">
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${vistaModo === 'tarjetas' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setVistaModo('tarjetas')}
                  title="Vista de Tarjetas Detalladas"
                >
                  <i className="bi bi-grid-fill me-1"></i> Tarjetas
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${vistaModo === 'tabla' ? 'btn-dark' : 'btn-outline-dark'}`}
                  onClick={() => setVistaModo('tabla')}
                  title="Vista de Tabla Compacta"
                >
                  <i className="bi bi-table me-1"></i> Tabla
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estados de Carga y Error */}
      {cargando && (
        <div className="card border-0 shadow-sm p-5 text-center my-4">
          <div className="spinner-border text-primary mx-auto mb-3" style={{ width: '3rem', height: '3rem' }}></div>
          <h5 className="fw-bold">Cargando credenciales corporativas...</h5>
          <p className="text-muted small mb-0">Consultando configuración de seguridad de cada tienda</p>
        </div>
      )}

      {errorMsg && !cargando && (
        <div className="alert alert-danger shadow-sm d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          <div>
            <strong>Error al cargar credenciales:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Resultados Vacíos */}
      {!cargando && !errorMsg && tiendasFiltradas.length === 0 && (
        <div className="card border-0 shadow-sm p-5 text-center my-4">
          <i className="bi bi-search text-muted fs-1 mb-3"></i>
          <h5 className="fw-bold">No se encontraron tiendas</h5>
          <p className="text-muted small mb-3">
            Ninguna tienda coincide con el término de búsqueda <strong>&quot;{busqueda}&quot;</strong>.
          </p>
          <button className="btn btn-outline-primary btn-sm mx-auto" onClick={() => setBusqueda('')}>
            Limpiar búsqueda
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 1: TARJETAS DETALLADAS (Por Tienda) */}
      {/* ========================================================= */}
      {!cargando && !errorMsg && vistaModo === 'tarjetas' && (
        <div className="row g-4">
          {tiendasFiltradas.map((t) => {
            const esTiendaBeta = esBeta(t);
            return (
              <div key={t.id} className="col-12 col-lg-6 col-xl-4">
                <div
                  className="card border-0 shadow-sm h-100"
                  style={{
                    borderRadius: '14px',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    borderLeft: esTiendaBeta ? '4px solid #f59e0b' : '4px solid #3b82f6',
                  }}
                >
                  {/* Encabezado de la Tarjeta */}
                  <div className="card-header bg-white border-bottom border-light pt-3 pb-2 px-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h5 className="fw-bold mb-0 text-dark">{t.nombre}</h5>
                          {esTiendaBeta ? (
                            <span className="badge bg-warning text-dark small">BETA</span>
                          ) : (
                            <span className="badge bg-success bg-opacity-10 text-success small">Operativa</span>
                          )}
                        </div>
                        <div className="text-muted small mt-1 font-monospace">
                          <i className="bi bi-tag-fill me-1 text-secondary"></i>
                          slug: <strong>{t.slug}</strong>
                        </div>
                      </div>

                      {/* Botón copiar ficha completa */}
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          copiadoId === `ficha-${t.id}`
                            ? 'btn-success text-white'
                            : 'btn-outline-secondary'
                        }`}
                        title="Copiar todas las credenciales de esta tienda"
                        onClick={() => copiarFichaTienda(t)}
                      >
                        <i
                          className={`bi ${
                            copiadoId === `ficha-${t.id}` ? 'bi-check-lg' : 'bi-share-fill'
                          } me-1`}
                        ></i>
                        {copiadoId === `ficha-${t.id}` ? '¡Copiado!' : 'Compartir'}
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo de Credenciales */}
                  <div className="card-body p-3">
                    <div className="vstack gap-2">
                      {/* 1. Administrador */}
                      <div
                        className="p-2 rounded-3 border"
                        style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-primary px-2 py-1 small fw-semibold">
                            <i className="bi bi-shield-shaded me-1"></i> Administrador
                          </span>
                          <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '0.65rem' }}>
                            Acceso Total Tienda
                          </span>
                        </div>
                        <div className="row g-1 align-items-center mt-1">
                          <div className="col-7">
                            <div className="text-truncate small fw-semibold text-dark font-monospace" title={t.admin.usuario}>
                              {t.admin.usuario}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              o usuario corto: <strong className="text-dark">{t.admin.usuarioCorto}</strong>
                            </div>
                          </div>
                          <div className="col-5 text-end">
                            <div className="d-flex align-items-center justify-content-end gap-1">
                              <span
                                className={`badge ${
                                  mostrarPins ? 'bg-dark text-warning' : 'bg-secondary'
                                } px-2 py-1 font-monospace`}
                                style={{ letterSpacing: '1px', fontSize: '0.8rem' }}
                              >
                                {mostrarPins ? t.admin.pin : '••••••'}
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm py-0 px-2"
                                title="Copiar PIN"
                                onClick={() => copiarTexto(t.admin.pin, `pin-adm-${t.id}`)}
                              >
                                <i className="bi bi-copy"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Supervisor */}
                      <div
                        className="p-2 rounded-3 border"
                        style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-info text-dark px-2 py-1 small fw-semibold">
                            <i className="bi bi-person-check-fill me-1"></i> Supervisor
                          </span>
                          <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '0.65rem' }}>
                            Aprobaciones / Control
                          </span>
                        </div>
                        <div className="row g-1 align-items-center mt-1">
                          <div className="col-7">
                            <div className="text-truncate small fw-semibold text-dark font-monospace" title={t.supervisor.usuario}>
                              {t.supervisor.usuario}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              o usuario corto: <strong className="text-dark">{t.supervisor.usuarioCorto}</strong>
                            </div>
                          </div>
                          <div className="col-5 text-end">
                            <div className="d-flex align-items-center justify-content-end gap-1">
                              <span
                                className={`badge ${
                                  mostrarPins ? 'bg-dark text-warning' : 'bg-secondary'
                                } px-2 py-1 font-monospace`}
                                style={{ letterSpacing: '1px', fontSize: '0.8rem' }}
                              >
                                {mostrarPins ? t.supervisor.pin : '••••••'}
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline-info btn-sm py-0 px-2"
                                title="Copiar PIN"
                                onClick={() => copiarTexto(t.supervisor.pin, `pin-sup-${t.id}`)}
                              >
                                <i className="bi bi-copy"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Moderador */}
                      <div
                        className="p-2 rounded-3 border"
                        style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="badge bg-secondary px-2 py-1 small fw-semibold">
                            <i className="bi bi-pencil-fill me-1"></i> Moderador
                          </span>
                          <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: '0.65rem' }}>
                            Registro Pendiente
                          </span>
                        </div>
                        <div className="row g-1 align-items-center mt-1">
                          <div className="col-7">
                            <div className="text-truncate small fw-semibold text-dark font-monospace" title={t.moderador.usuario}>
                              {t.moderador.usuario}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                              o usuario corto: <strong className="text-dark">{t.moderador.usuarioCorto}</strong>
                            </div>
                          </div>
                          <div className="col-5 text-end">
                            <div className="d-flex align-items-center justify-content-end gap-1">
                              <span
                                className={`badge ${
                                  mostrarPins ? 'bg-dark text-warning' : 'bg-secondary'
                                } px-2 py-1 font-monospace`}
                                style={{ letterSpacing: '1px', fontSize: '0.8rem' }}
                              >
                                {mostrarPins ? t.moderador.pin : '••••••'}
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                title="Copiar PIN"
                                onClick={() => copiarTexto(t.moderador.pin, `pin-mod-${t.id}`)}
                              >
                                <i className="bi bi-copy"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pie de Tarjeta: Acciones Rápidas */}
                  <div className="card-footer bg-light border-top border-light py-2 px-3 d-flex justify-content-between align-items-center">
                    <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-people me-1"></i>
                      {t.stats?.personal || 0} colabs | {t.stats?.registros || 0} reg.
                    </span>

                    {onSelectTienda && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary fw-semibold px-2 py-1"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => {
                          onSelectTienda(t.id);
                          if (onNavigateToModule) onNavigateToModule('Dashboard');
                        }}
                      >
                        <i className="bi bi-box-arrow-in-right me-1"></i>
                        Ingresar a Tienda
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: TABLA COMPACTA (Para escaneo rápido) */}
      {/* ========================================================= */}
      {!cargando && !errorMsg && vistaModo === 'tabla' && (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                  <th>Tienda / Sucursal</th>
                  <th>Slug</th>
                  <th>Admin (Usuario / PIN)</th>
                  <th>Supervisor (Usuario / PIN)</th>
                  <th>Moderador (Usuario / PIN)</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tiendasFiltradas.map((t) => {
                  const esTiendaBeta = esBeta(t);
                  return (
                    <tr key={t.id}>
                      {/* Tienda */}
                      <td>
                        <div className="fw-bold text-dark">{t.nombre}</div>
                        <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          {esTiendaBeta ? (
                            <span className="badge bg-warning text-dark py-0 px-1">BETA</span>
                          ) : (
                            <span className="badge bg-success bg-opacity-10 text-success py-0 px-1">Operativa</span>
                          )}
                          <span className="ms-2">
                            {t.stats?.personal || 0} colabs
                          </span>
                        </div>
                      </td>

                      {/* Slug */}
                      <td>
                        <span className="badge bg-light text-dark border font-monospace">
                          {t.slug}
                        </span>
                      </td>

                      {/* Admin */}
                      <td>
                        <div className="font-monospace small fw-semibold text-primary">{t.admin.usuarioCorto}</div>
                        <div className="d-flex align-items-center gap-1 mt-1">
                          <span className="badge bg-dark text-warning font-monospace py-0 px-1">
                            {mostrarPins ? t.admin.pin : '••••••'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-muted"
                            title="Copiar PIN Admin"
                            onClick={() => copiarTexto(t.admin.pin, `tbl-adm-${t.id}`)}
                          >
                            <i className="bi bi-copy" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </div>
                      </td>

                      {/* Supervisor */}
                      <td>
                        <div className="font-monospace small fw-semibold text-info">{t.supervisor.usuarioCorto}</div>
                        <div className="d-flex align-items-center gap-1 mt-1">
                          <span className="badge bg-dark text-warning font-monospace py-0 px-1">
                            {mostrarPins ? t.supervisor.pin : '••••••'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-muted"
                            title="Copiar PIN Supervisor"
                            onClick={() => copiarTexto(t.supervisor.pin, `tbl-sup-${t.id}`)}
                          >
                            <i className="bi bi-copy" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </div>
                      </td>

                      {/* Moderador */}
                      <td>
                        <div className="font-monospace small fw-semibold text-secondary">{t.moderador.usuarioCorto}</div>
                        <div className="d-flex align-items-center gap-1 mt-1">
                          <span className="badge bg-dark text-warning font-monospace py-0 px-1">
                            {mostrarPins ? t.moderador.pin : '••••••'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-muted"
                            title="Copiar PIN Moderador"
                            onClick={() => copiarTexto(t.moderador.pin, `tbl-mod-${t.id}`)}
                          >
                            <i className="bi bi-copy" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            title="Copiar ficha de la tienda"
                            onClick={() => copiarFichaTienda(t)}
                          >
                            <i className="bi bi-share-fill"></i>
                          </button>
                          {onSelectTienda && (
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              title="Ingresar a la tienda"
                              onClick={() => {
                                onSelectTienda(t.id);
                                if (onNavigateToModule) onNavigateToModule('Dashboard');
                              }}
                            >
                              <i className="bi bi-box-arrow-in-right"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
