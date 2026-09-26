'use client';

import React, { useState, useEffect } from 'react';

export default function ModAuditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarAuditoria();
  }, []);

  const cargarAuditoria = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/auditoria');
      const data = await res.json();
      setCargando(false);
      if (Array.isArray(data)) setLogs(data);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const getBadgeClass = (accion: string) => {
    if (accion.includes('Discrepancia') || accion.includes('Alerta') || accion.includes('Eliminación') || accion.includes('Anulación')) {
      return 'badge-subtle-danger';
    }
    if (accion.includes('Sanción') || accion.includes('Falta')) return 'badge-subtle-warning';
    if (accion.includes('Registro') || accion.includes('Alta') || accion.includes('Aprobado')) return 'badge-subtle-success';
    return 'badge-subtle-secondary';
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white" style={{ borderRadius: '16px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="hanko-stamp">
              監査ログ
            </span>
            <span className="badge bg-secondary-subtle text-secondary border px-2 py-0 fw-bold">
              SEGURIDAD & COMPLIANCE
            </span>
          </div>
          <h4 className="fw-bold mb-1 text-slate-900 d-flex align-items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
            <i className="bi bi-shield-check text-danger"></i>
            <span>Bitácora de Auditoría y Trazabilidad</span>
            <span className="text-danger-subtle" style={{ fontSize: '1rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>監査記録</span>
          </h4>
          <p className="text-secondary small mb-0">
            Registro cronológico inmutable de accesos, conciliaciones, modificaciones y eliminaciones.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm shadow-xs"
          onClick={cargarAuditoria}
          disabled={cargando}
        >
          {cargando ? (
            <span className="spinner-border spinner-border-sm me-1"></span>
          ) : (
            <i className="bi bi-arrow-clockwise me-1"></i>
          )}
          Actualizar
        </button>
      </div>

      <div className="table-responsive shadow-xs" style={{ borderRadius: '12px' }}>
        <table className="table table-hover align-middle small mb-0">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Fecha y Hora</th>
              <th style={{ width: '20%' }}>Usuario Responsable</th>
              <th style={{ width: '22%' }}>Acción Realizada</th>
              <th style={{ width: '40%' }}>Detalle del Evento</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-5">
                  No hay registros de auditoría disponibles en esta sede.
                </td>
              </tr>
            ) : (
              logs.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-mono text-secondary small">{ev.fecha}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-secondary fw-bold"
                        style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}
                      >
                        {(ev.usuario || 'U').charAt(0).toUpperCase()}
                      </div>
                      <strong className="text-slate-900">{ev.usuario}</strong>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(ev.accion)}`}>{ev.accion}</span>
                  </td>
                  <td className="text-secondary">{ev.detalle}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
