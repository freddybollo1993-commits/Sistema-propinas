'use client';

import React, { useState } from 'react';

interface Solicitud {
  id: number;
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
  onResolver: (id: number, accion: 'Aprobado' | 'Rechazado') => Promise<void>;
  onRecargar: () => void;
}

export default function ModalNotificaciones({
  show,
  solicitudes,
  cargando,
  onClose,
  onResolver,
  onRecargar,
}: ModalNotificacionesProps) {
  const [resolviendo, setResolviendo] = useState<number | null>(null);

  if (!show) return null;

  const handleResolver = async (id: number, accion: 'Aprobado' | 'Rechazado') => {
    if (resolviendo !== null) return;
    const confirmar = window.confirm(
      `¿Confirmas marcar la solicitud #${id} como "${accion}"?`
    );
    if (!confirmar) return;

    setResolviendo(id);
    await onResolver(id, accion);
    setResolviendo(null);
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
          <div className="modal-content border-0 shadow" style={{ borderRadius: '16px' }}>
            {/* Header */}
            <div
              className="modal-header border-0 px-4 pt-4 pb-3"
              style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '16px 16px 0 0',
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center bg-warning rounded-circle shadow"
                  style={{ width: '44px', height: '44px' }}
                >
                  <i className="bi bi-bell-fill text-dark fs-5" />
                </div>
                <div>
                  <h5 className="modal-title fw-bold text-white mb-0 d-flex align-items-center gap-2">
                    Solicitudes Pendientes de Aprobación
                    {solicitudes.length > 0 && (
                      <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.75rem' }}>
                        {solicitudes.length}
                      </span>
                    )}
                  </h5>
                  <p className="text-white-50 small mb-0 mt-1">
                    Registros enviados por Moderadores que requieren tu aprobación
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

            {/* Body */}
            <div className="modal-body p-4">
              {cargando ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" style={{ width: '2.5rem', height: '2.5rem' }} />
                  <p className="text-secondary small mb-0">Cargando solicitudes...</p>
                </div>
              ) : solicitudes.length === 0 ? (
                <div className="text-center py-5">
                  <div
                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle mb-3"
                    style={{ width: '64px', height: '64px' }}
                  >
                    <i className="bi bi-check2-circle text-success fs-2" />
                  </div>
                  <h6 className="fw-bold text-slate-900 mb-1">¡Todo al día!</h6>
                  <p className="text-secondary small mb-0">
                    No hay solicitudes pendientes de aprobación en este momento.
                  </p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {solicitudes.map((s) => (
                    <div
                      key={s.id}
                      className="border border-warning-subtle rounded-3 p-3 bg-warning-subtle"
                      style={{ borderLeft: '4px solid #fbbf24 !important' }}
                    >
                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <span className="badge bg-warning-subtle text-dark border border-warning fw-bold">
                              #{s.id}
                            </span>
                            <span className="badge bg-light text-secondary border small">
                              {s.concepto}
                            </span>
                            <span className="text-secondary small font-mono">
                              <i className="bi bi-calendar3 me-1" />
                              {s.fecha}
                            </span>
                          </div>

                          <div className="fw-bold text-slate-900 mb-1">
                            <i className="bi bi-person-fill text-secondary me-1" />
                            {s.colaborador}
                          </div>

                          {s.detalle && (
                            <p className="text-secondary small mb-1">
                              <i className="bi bi-chat-text me-1" />
                              {s.detalle}
                            </p>
                          )}

                          <div className="text-muted small">
                            <i className="bi bi-person-check me-1" />
                            Solicitado por: <strong>{s.usuario}</strong>
                          </div>
                        </div>

                        <div className="d-flex flex-column align-items-end gap-2">
                          <div
                            className="fw-bold font-mono text-success fs-5"
                          >
                            S/ {parseFloat(String(s.monto)).toFixed(2)}
                          </div>

                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-success btn-sm px-3 shadow-xs fw-semibold"
                              onClick={() => handleResolver(s.id, 'Aprobado')}
                              disabled={resolviendo === s.id}
                              title="Aprobar solicitud"
                            >
                              {resolviendo === s.id ? (
                                <span className="spinner-border spinner-border-sm me-1" />
                              ) : (
                                <i className="bi bi-check-circle-fill me-1" />
                              )}
                              Aprobar
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm px-3 shadow-xs fw-semibold"
                              onClick={() => handleResolver(s.id, 'Rechazado')}
                              disabled={resolviendo === s.id}
                              title="Rechazar solicitud"
                            >
                              <i className="bi bi-x-circle me-1" />
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer border-0 px-4 pb-4 pt-2 d-flex justify-content-between">
              <button
                type="button"
                className="btn btn-light btn-sm d-flex align-items-center gap-2 shadow-xs"
                onClick={onRecargar}
                disabled={cargando}
              >
                <i className="bi bi-arrow-clockwise" />
                Actualizar
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
