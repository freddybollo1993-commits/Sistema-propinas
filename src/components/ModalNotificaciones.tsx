'use client';

import React, { useState } from 'react';

export interface Solicitud {
  id: number;
  tipo?: 'ADELANTO' | 'SANCION' | 'ANULACION_PROPINA' | 'RETIRO_FONDO' | string;
  tipoEtiqueta?: string;
  jpEtiqueta?: string;
  moduloDestino?: string;
  fecha: string;
  colaborador: string;
  concepto: string;
  monto: number;
  detalle: string;
  usuario: string;
  createdAt: string;
}

interface ModalNotificacionesProps {
  show: boolean;
  solicitudes: Solicitud[];
  cargando: boolean;
  onClose: () => void;
  onResolver: (id: number, accion: 'Aprobado' | 'Rechazado', tipo?: string) => Promise<void>;
  onRecargar: () => void;
  onUbicar?: (modulo: string) => void;
}

export default function ModalNotificaciones({
  show,
  solicitudes,
  cargando,
  onClose,
  onResolver,
  onRecargar,
  onUbicar,
}: ModalNotificacionesProps) {
  const [resolviendo, setResolviendo] = useState<number | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState<string>('');

  if (!show) return null;

  const handleResolver = async (s: Solicitud, accion: 'Aprobado' | 'Rechazado') => {
    if (resolviendo !== null) return;
    const desc = s.tipoEtiqueta || s.concepto || `Solicitud #${s.id}`;
    const confirmar = window.confirm(
      `¿Confirmas marcar "${desc}" (#${s.id}) como "${accion}"?`
    );
    if (!confirmar) return;

    setResolviendo(s.id);
    await onResolver(s.id, accion, s.tipo);
    setResolviendo(null);
  };

  // Conteo dinámico por categoría
  const conteoTodos = solicitudes.length;
  const conteoAnulaciones = solicitudes.filter((s) => s.tipo === 'ANULACION_PROPINA').length;
  const conteoSanciones = solicitudes.filter((s) => s.tipo === 'SANCION').length;
  const conteoAdelantos = solicitudes.filter((s) => s.tipo === 'ADELANTO').length;
  const conteoRetiros = solicitudes.filter((s) => s.tipo === 'RETIRO_FONDO').length;

  // Filtrado reactivo
  const solicitudesFiltradas = solicitudes.filter((s) => {
    // Filtro por tipo
    if (filtroTipo === 'ANULACION_PROPINA' && s.tipo !== 'ANULACION_PROPINA') return false;
    if (filtroTipo === 'SANCION' && s.tipo !== 'SANCION') return false;
    if (filtroTipo === 'ADELANTO' && s.tipo !== 'ADELANTO') return false;
    if (filtroTipo === 'RETIRO_FONDO' && s.tipo !== 'RETIRO_FONDO') return false;

    // Filtro por texto de búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const matchColab = (s.colaborador || '').toLowerCase().includes(q);
      const matchConcepto = (s.concepto || '').toLowerCase().includes(q);
      const matchUsuario = (s.usuario || '').toLowerCase().includes(q);
      const matchDetalle = (s.detalle || '').toLowerCase().includes(q);
      const matchId = String(s.id).includes(q);
      return matchColab || matchConcepto || matchUsuario || matchDetalle || matchId;
    }

    return true;
  });

  const getTipoBadgeInfo = (s: Solicitud) => {
    switch (s.tipo) {
      case 'ANULACION_PROPINA':
        return {
          bg: 'bg-danger-subtle text-danger border-danger-subtle',
          icon: 'bi-file-earmark-x-fill text-danger',
          label: s.tipoEtiqueta || 'Anulación de Turno',
          jp: s.jpEtiqueta || 'チップ取消',
          cardBorder: '#ef4444',
        };
      case 'SANCION':
        return {
          bg: 'bg-warning-subtle text-warning-emphasis border-warning-subtle',
          icon: 'bi-exclamation-octagon-fill text-warning',
          label: s.tipoEtiqueta || 'Sanción Disciplinaria',
          jp: s.jpEtiqueta || '規律・減点',
          cardBorder: '#f59e0b',
        };
      case 'ADELANTO':
        return {
          bg: 'bg-info-subtle text-info-emphasis border-info-subtle',
          icon: 'bi-wallet2 text-info',
          label: s.tipoEtiqueta || 'Adelanto de Propinas',
          jp: s.jpEtiqueta || '前払い',
          cardBorder: '#0ea5e9',
        };
      case 'RETIRO_FONDO':
        return {
          bg: 'bg-purple-subtle text-purple border-purple-subtle',
          icon: 'bi-box-arrow-up-right text-primary',
          label: s.tipoEtiqueta || 'Retiro de Fondo',
          jp: s.jpEtiqueta || '出金申請',
          cardBorder: '#8b5cf6',
        };
      default:
        return {
          bg: 'bg-secondary-subtle text-secondary border-secondary-subtle',
          icon: 'bi-bell-fill text-secondary',
          label: s.concepto || 'Solicitud Pendiente',
          jp: '承認待ち',
          cardBorder: '#64748b',
        };
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1050 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        style={{ zIndex: 1055 }}
      >
        <div
          className="modal-dialog modal-lg modal-dialog-scrollable"
          role="document"
        >
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '18px' }}>
            {/* Header Moderno con Gradiente y Estética Takumi */}
            <div
              className="modal-header border-0 px-4 pt-4 pb-3"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '18px 18px 0 0',
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center bg-warning rounded-circle shadow"
                  style={{ width: '46px', height: '46px' }}
                >
                  <i className="bi bi-bell-fill text-dark fs-5" />
                </div>
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <h5 className="modal-title fw-bold text-white mb-0">
                      Bandeja de Aprobaciones
                    </h5>
                    <span
                      className="text-warning-subtle fw-bold font-monospace"
                      style={{ fontSize: '0.85rem' }}
                    >
                      承認ポータル
                    </span>
                    {conteoTodos > 0 && (
                      <span className="badge bg-warning text-dark fw-bold ms-1" style={{ fontSize: '0.78rem' }}>
                        {conteoTodos} pendientes
                      </span>
                    )}
                  </div>
                  <p className="text-white-50 small mb-0">
                    Procesos que requieren validación de Administrador o Supervisor para surtir efecto formal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close btn-close-white ms-auto"
                onClick={onClose}
                aria-label="Cerrar"
              />
            </div>

            {/* Barra de Filtros por Categoría */}
            <div className="px-4 pt-3 pb-2 bg-light border-bottom">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="d-flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={`btn btn-sm ${filtroTipo === 'TODOS' ? 'btn-dark' : 'btn-outline-secondary bg-white'} py-1 px-2 rounded-pill shadow-xs`}
                    onClick={() => setFiltroTipo('TODOS')}
                  >
                    Todos <span className="badge bg-white text-dark ms-1">{conteoTodos}</span>
                  </button>

                  {conteoAnulaciones > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filtroTipo === 'ANULACION_PROPINA' ? 'btn-danger' : 'btn-outline-danger bg-white'} py-1 px-2 rounded-pill shadow-xs`}
                      onClick={() => setFiltroTipo('ANULACION_PROPINA')}
                    >
                      <i className="bi bi-file-earmark-x me-1"></i> Anulaciones{' '}
                      <span className="badge bg-white text-danger ms-1">{conteoAnulaciones}</span>
                    </button>
                  )}

                  {conteoSanciones > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filtroTipo === 'SANCION' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark bg-white'} py-1 px-2 rounded-pill shadow-xs`}
                      onClick={() => setFiltroTipo('SANCION')}
                    >
                      <i className="bi bi-exclamation-triangle me-1"></i> Sanciones{' '}
                      <span className="badge bg-dark text-white ms-1">{conteoSanciones}</span>
                    </button>
                  )}

                  {conteoAdelantos > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filtroTipo === 'ADELANTO' ? 'btn-info text-white' : 'btn-outline-info text-dark bg-white'} py-1 px-2 rounded-pill shadow-xs`}
                      onClick={() => setFiltroTipo('ADELANTO')}
                    >
                      <i className="bi bi-wallet2 me-1"></i> Adelantos{' '}
                      <span className="badge bg-white text-dark ms-1">{conteoAdelantos}</span>
                    </button>
                  )}

                  {conteoRetiros > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filtroTipo === 'RETIRO_FONDO' ? 'btn-primary' : 'btn-outline-primary bg-white'} py-1 px-2 rounded-pill shadow-xs`}
                      onClick={() => setFiltroTipo('RETIRO_FONDO')}
                    >
                      <i className="bi bi-box-arrow-up-right me-1"></i> Retiros Fondo{' '}
                      <span className="badge bg-white text-primary ms-1">{conteoRetiros}</span>
                    </button>
                  )}
                </div>

                {/* Buscador Rápido */}
                <div className="input-group input-group-sm" style={{ maxWidth: '240px' }}>
                  <span className="input-group-text bg-white border-end-0 text-secondary">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Buscar solicitud..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  {busqueda && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary bg-white"
                      onClick={() => setBusqueda('')}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body p-4 bg-slate-50">
              {cargando ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" style={{ width: '2.5rem', height: '2.5rem' }} />
                  <p className="text-secondary small mb-0">Consultando solicitudes en tiempo real...</p>
                </div>
              ) : solicitudesFiltradas.length === 0 ? (
                <div className="text-center py-5">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle mb-3"
                    style={{ width: '68px', height: '68px' }}
                  >
                    <i className="bi bi-check2-circle text-success fs-1" />
                  </div>
                  <h6 className="fw-bold text-slate-900 mb-1">
                    {conteoTodos === 0 ? '¡Bandeja al día!' : 'Sin coincidencias con los filtros'}
                  </h6>
                  <p className="text-secondary small mb-0" style={{ maxWidth: '420px', margin: '0 auto' }}>
                    {conteoTodos === 0
                      ? 'No hay procesos pendientes de validación en este momento. Todas las operaciones han sido atendidas.'
                      : 'No se encontraron solicitudes que coincidan con la categoría o texto buscado.'}
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {solicitudesFiltradas.map((s) => {
                    const badgeInfo = getTipoBadgeInfo(s);

                    return (
                      <div
                        key={`${s.tipo || 'item'}-${s.id}`}
                        className="card border shadow-xs rounded-3 p-3 bg-white"
                        style={{ borderLeft: `5px solid ${badgeInfo.cardBorder}` }}
                      >
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div className="flex-grow-1" style={{ minWidth: '260px' }}>
                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                              <span className={`badge border fw-bold ${badgeInfo.bg}`}>
                                <i className={`bi ${badgeInfo.icon} me-1`}></i>
                                {badgeInfo.label}
                              </span>
                              <span
                                className="badge bg-light text-secondary border font-monospace"
                                style={{ fontSize: '0.72rem' }}
                              >
                                {badgeInfo.jp}
                              </span>
                              <span className="badge bg-light text-dark border fw-bold">
                                #{s.id}
                              </span>
                              <span className="text-secondary small font-mono ms-auto d-flex align-items-center gap-1">
                                <i className="bi bi-calendar3" />
                                {s.fecha}
                              </span>
                            </div>

                            <div className="fw-bold text-slate-900 fs-6 mb-1 d-flex align-items-center gap-2">
                              <span>{s.colaborador}</span>
                            </div>

                            {s.concepto && (
                              <div className="text-secondary small mb-1">
                                <strong>Concepto:</strong> {s.concepto}
                              </div>
                            )}

                            {s.detalle && (
                              <div
                                className="p-2 rounded bg-light border text-slate-700 small mb-2"
                                style={{ fontSize: '0.82rem' }}
                              >
                                <i className="bi bi-chat-quote text-secondary me-1" />
                                <em>{s.detalle}</em>
                              </div>
                            )}

                            <div className="d-flex align-items-center gap-3 text-muted small mt-2">
                              <span>
                                <i className="bi bi-person-check me-1 text-primary" />
                                Solicitado por: <strong>{s.usuario}</strong>
                              </span>
                              {s.createdAt && (
                                <span className="font-monospace text-secondary" style={{ fontSize: '0.74rem' }}>
                                  <i className="bi bi-clock me-1" />
                                  {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Lado Derecho: Monto y Botones de Acción Inmediata */}
                          <div className="d-flex flex-column align-items-end justify-content-between gap-3 ms-auto">
                            <div className="text-end">
                              <span className="text-secondary small d-block" style={{ fontSize: '0.72rem' }}>
                                Monto involucrado
                              </span>
                              <span className="fw-bold font-mono text-dark fs-5">
                                S/ {parseFloat(String(s.monto || 0)).toFixed(2)}
                              </span>
                            </div>

                            <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
                              {/* Botón para Ubicar en Módulo */}
                              {s.moduloDestino && onUbicar && (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary btn-sm px-2 py-1 shadow-xs fw-semibold"
                                  onClick={() => onUbicar(s.moduloDestino!)}
                                  title={`Ir al módulo ${s.moduloDestino} para ubicar este registro en contexto`}
                                >
                                  <i className="bi bi-geo-alt-fill me-1" />
                                  Ubicar
                                </button>
                              )}

                              {/* Botón Aprobar */}
                              <button
                                type="button"
                                className="btn btn-success btn-sm px-3 py-1 shadow-xs fw-semibold"
                                onClick={() => handleResolver(s, 'Aprobado')}
                                disabled={resolviendo === s.id}
                                title="Aprobar inmediatamente y consolidar"
                              >
                                {resolviendo === s.id ? (
                                  <span className="spinner-border spinner-border-sm me-1" />
                                ) : (
                                  <i className="bi bi-check-circle-fill me-1" />
                                )}
                                Aprobar
                              </button>

                              {/* Botón Rechazar */}
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm px-3 py-1 shadow-xs fw-semibold"
                                onClick={() => handleResolver(s, 'Rechazado')}
                                disabled={resolviendo === s.id}
                                title="Rechazar la solicitud"
                              >
                                <i className="bi bi-x-circle me-1" />
                                Rechazar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-between bg-white rounded-bottom">
              <button
                type="button"
                className="btn btn-light btn-sm d-flex align-items-center gap-2 shadow-xs border"
                onClick={onRecargar}
                disabled={cargando}
              >
                <i className="bi bi-arrow-clockwise" />
                Actualizar Notificaciones
              </button>
              <button
                type="button"
                className="btn btn-dark btn-sm px-4 shadow-xs"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
