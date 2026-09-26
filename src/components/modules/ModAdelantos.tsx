'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModAdelantosProps {
  currentUser: SessionUser | null;
  onOpenEliminarMaster: (modulo: string, id: number, desc: string) => void;
}

export default function ModAdelantos({
  currentUser,
  onOpenEliminarMaster,
}: ModAdelantosProps) {
  const [personal, setPersonal] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Formulario
  const [fecha, setFecha] = useState('');
  const [colaborador, setColaborador] = useState('');
  const [monto, setMonto] = useState<number | string>('');
  const [detalle, setDetalle] = useState('');

  const esAprobador =
    currentUser?.rol === 'Administrador' ||
    currentUser?.rol === 'Supervisor' ||
    currentUser?.esMaestro;

  const puedeEliminar =
    currentUser?.esMaestro ||
    currentUser?.id === 'USR-MASTER' ||
    currentUser?.rol === 'Administrador' ||
    currentUser?.rol === 'Supervisor';

  useEffect(() => {
    setFecha(new Date().toISOString().split('T')[0]);
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [resPer, resAde] = await Promise.all([
        fetch('/api/personal').then((r) => r.json()),
        fetch('/api/adelantos').then((r) => r.json()),
      ]);
      setCargando(false);

      if (Array.isArray(resPer)) setPersonal(resPer.filter((p: any) => p.estado === 'Activo'));
      if (Array.isArray(resAde)) setHistorial(resAde);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const handleGuardarAdelanto = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoVal = parseFloat(String(monto));
    if (!colaborador || isNaN(montoVal) || montoVal <= 0) {
      alert('Por favor complete los campos obligatorios con un monto mayor a cero.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/adelantos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          colaborador,
          monto: montoVal,
          detalle: detalle.trim() || 'Adelanto de propina',
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setColaborador('');
        setMonto('');
        setDetalle('');
        cargarDatos();
      }
    } catch (err: any) {
      setCargando(false);
      alert('Error al registrar adelanto: ' + err.message);
    }
  };

  const handleResolver = async (id: number, accion: 'Aprobado' | 'Rechazado') => {
    if (!confirm(`¿Confirmas marcar esta solicitud como "${accion}"?`)) return;

    try {
      setCargando(true);
      const res = await fetch('/api/solicitudes/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nuevaAccion: accion }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      cargarDatos();
    } catch (e: any) {
      setCargando(false);
      alert('Error al resolver solicitud: ' + e.message);
    }
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white" style={{ borderRadius: '16px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="hanko-stamp">
              前払い管理
            </span>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0 fw-bold">
              GESTIÓN FINANCIERA
            </span>
          </div>
          <h4 className="fw-bold mb-1 text-slate-900 d-flex align-items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
            <i className="bi bi-wallet2 text-success"></i>
            <span>Adelantos y Anticipos de Propinas</span>
            <span className="text-danger-subtle" style={{ fontSize: '1rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>前渡金</span>
          </h4>
          <p className="text-secondary small mb-0">
            Control de desembolsos a cuenta de propinas del ciclo, sujetos a aprobación y balance acumulado.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-lg-4 col-12">
          <div className="card border-0 bg-light p-3 shadow-xs" style={{ borderRadius: '14px' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-plus-circle-fill text-success fs-5"></i>
              <h6 className="fw-bold mb-0 text-slate-900">Registrar Nuevo Adelanto</h6>
            </div>
            <form onSubmit={handleGuardarAdelanto}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-slate-700 mb-1">Fecha</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-secondary border-end-0">
                    <i className="bi bi-calendar3"></i>
                  </span>
                  <input
                    type="date"
                    className="form-control border-start-0"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-slate-700 mb-1">Colaborador</label>
                <select
                  className="form-select form-select-sm"
                  value={colaborador}
                  onChange={(e) => setColaborador(e.target.value)}
                  required
                >
                  <option value="">Seleccionar colaborador...</option>
                  {personal.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre} ({p.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-slate-700 mb-1">Monto Solicitado (S/)</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white text-success border-end-0 fw-bold">S/</span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-control border-start-0 fw-bold font-mono text-dark"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-slate-700 mb-1">Motivo o Justificación</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Ej. Anticipo personal / urgencia médica"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-success btn-sm w-100 fw-bold py-2 shadow-xs rounded-3"
                disabled={cargando}
              >
                <i className="bi bi-send-fill me-1"></i> Registrar Adelanto
              </button>
            </form>
          </div>
        </div>

        {/* Historial y Bandeja de Aprobaciones */}
        <div className="col-lg-8 col-12">
          <div className="card border p-3 bg-white shadow-xs" style={{ borderRadius: '14px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h6 className="fw-bold mb-0 text-slate-900">
                <i className="bi bi-clock-history text-primary me-2"></i>
                Historial de Solicitudes y Estado
              </h6>
              <span className="badge bg-light text-secondary border">Bandeja de Aprobación Activa</span>
            </div>

            <div className="table-responsive shadow-xs" style={{ borderRadius: '10px' }}>
              <table className="table table-hover align-middle small mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Fecha</th>
                    <th style={{ width: '25%' }}>Colaborador</th>
                    <th style={{ width: '25%' }}>Concepto</th>
                    <th style={{ width: '15%' }}>Monto</th>
                    <th style={{ width: '10%' }}>Estado</th>
                    <th style={{ width: '10%' }} className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No hay adelantos registrados en este ciclo.
                      </td>
                    </tr>
                  ) : (
                    historial.map((h) => {
                      const isAprob = h.estado === 'Aprobado';
                      const isPend = h.estado === 'Pendiente';

                      return (
                        <tr key={h.id}>
                          <td className="text-secondary">{h.fecha}</td>
                          <td>
                            <strong className="text-slate-900">{h.colaborador}</strong>
                          </td>
                          <td className="text-secondary small">{h.concepto}</td>
                          <td className="fw-bold font-mono text-dark">S/ {parseFloat(h.monto).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${isAprob ? 'badge-subtle-success' : isPend ? 'badge-subtle-warning' : 'badge-subtle-danger'}`}>
                              {h.estado}
                            </span>
                          </td>
                          <td className="text-center">
                            {isPend && esAprobador && (
                              <div className="d-inline-flex gap-1">
                                <button
                                  className="btn btn-outline-success btn-sm py-1 px-2 shadow-xs"
                                  onClick={() => handleResolver(h.id, 'Aprobado')}
                                  title="Aprobar adelanto"
                                >
                                  <i className="bi bi-check-lg"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm py-1 px-2 shadow-xs"
                                  onClick={() => handleResolver(h.id, 'Rechazado')}
                                  title="Rechazar adelanto"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </div>
                            )}

                            {puedeEliminar && (
                              <button
                                className="btn btn-outline-danger btn-sm py-1 px-2 ms-1 shadow-xs"
                                title="Eliminar definitivamente"
                                onClick={() =>
                                  onOpenEliminarMaster(
                                    'AdelantosSanciones',
                                    h.id,
                                    `Adelanto: ${h.colaborador} (S/ ${parseFloat(h.monto).toFixed(2)})`
                                  )
                                }
                              >
                                <i className="bi bi-trash3-fill"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
