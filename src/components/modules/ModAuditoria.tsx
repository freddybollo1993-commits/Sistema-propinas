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
    if (accion.includes('Discrepancia') || accion.includes('Alerta') || accion.includes('Eliminación')) {
      return 'bg-danger text-white';
    }
    if (accion.includes('Sanción')) return 'bg-warning text-dark';
    if (accion.includes('Registro') || accion.includes('Alta')) return 'bg-primary text-white';
    return 'bg-light text-dark border';
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1 text-dark">
            <i className="bi bi-shield-check text-success me-2"></i>
            Bitácora de Auditoría y Trazabilidad
          </h5>
          <p className="text-muted small mb-0">
            Historial cronológico inmutable de accesos, conciliaciones y modificaciones del sistema.
          </p>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={cargarAuditoria}
          disabled={cargando}
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Actualizar
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle small mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: '20%' }}>Fecha y Hora</th>
              <th style={{ width: '20%' }}>Usuario Responsable</th>
              <th style={{ width: '25%' }}>Acción Realizada</th>
              <th style={{ width: '35%' }}>Detalle del Evento</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-3">
                  No hay registros de auditoría disponibles.
                </td>
              </tr>
            ) : (
              logs.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.fecha}</td>
                  <td>
                    <strong>{ev.usuario}</strong>
                  </td>
                  <td>
                    <span className={`badge ${getBadgeClass(ev.accion)}`}>{ev.accion}</span>
                  </td>
                  <td>{ev.detalle}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
