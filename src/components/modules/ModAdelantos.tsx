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
    <div className="card p-4 shadow-sm border-0 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1 text-dark">
            <i className="bi bi-wallet2 text-success me-2"></i>
            Adelantos y Anticipos de Propinas
          </h5>
          <p className="text-muted small mb-0">
            Gestión de desembolsos anticipados sujetos al saldo acumulado disponible del colaborador en el ciclo.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Formulario */}
        <div className="col-md-4">
          <div className="p-3 border rounded bg-light">
            <h6 className="fw-bold mb-3 text-dark">Registrar Adelanto</h6>
            <form onSubmit={handleGuardarAdelanto}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Fecha</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold">Colaborador</label>
                <select
                  className="form-select form-select-sm"
                  value={colaborador}
                  onChange={(e) => setColaborador(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {personal.map((p) => (
                    <option key={p.nombre} value={p.nombre}>
                      {p.nombre} ({p.area})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2">
                <label className="form-label small fw-semibold">Monto del Adelanto (S/)</label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="form-control form-control-sm fw-bold"
                  placeholder="Ej. 50.00"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">Detalle o Justificación</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Adelanto semanal / urgencia"
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-success btn-sm w-100 fw-semibold"
                disabled={cargando}
              >
                <i className="bi bi-send me-1"></i> Registrar Adelanto
              </button>
            </form>
          </div>
        </div>

        {/* Historial y Bandeja de Aprobaciones */}
        <div className="col-md-8">
          <div className="p-3 border rounded bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="fw-bold mb-0 text-dark">Historial de Adelantos y Estado</h6>
              <span className="badge bg-light text-muted border">Bandeja de Aprobación Activa</span>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle small mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Fecha</th>
                    <th>Colaborador</th>
                    <th>Concepto</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th className="text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        No hay registros de adelantos registrados.
                      </td>
                    </tr>
                  ) : (
                    historial.map((h) => {
                      const badgeClass =
                        h.estado === 'Aprobado'
                          ? 'bg-success'
                          : h.estado === 'Pendiente'
                          ? 'bg-warning text-dark'
                          : 'bg-danger';

                      return (
                        <tr key={h.id}>
                          <td>{h.fecha}</td>
                          <td>
                            <strong>{h.colaborador}</strong>
                          </td>
                          <td>{h.concepto}</td>
                          <td className="fw-semibold">S/ {parseFloat(h.monto).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${badgeClass}`}>{h.estado}</span>
                          </td>
                          <td className="text-center">
                            {h.estado === 'Pendiente' && esAprobador && (
                              <>
                                <button
                                  className="btn btn-outline-success btn-sm py-0 px-2 me-1"
                                  onClick={() => handleResolver(h.id, 'Aprobado')}
                                  title="Aprobar"
                                >
                                  <i className="bi bi-check-lg"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm py-0 px-2"
                                  onClick={() => handleResolver(h.id, 'Rechazado')}
                                  title="Rechazar"
                                >
                                  <i className="bi bi-x-lg"></i>
                                </button>
                              </>
                            )}

                            {puedeEliminar && (
                              <button
                                className="btn btn-outline-danger btn-sm py-0 px-2 ms-1"
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
