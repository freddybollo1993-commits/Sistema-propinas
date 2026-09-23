'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModRegistroPropinasProps {
  currentUser: SessionUser | null;
  onOpenEliminarMaster: (modulo: string, id: number, desc: string) => void;
}

interface WorkerRow {
  nombre: string;
  area: string;
  activo: boolean;
  horas: number;
  prevHoras: number;
  propinaCalculada: number;
}

export default function ModRegistroPropinas({
  currentUser,
  onOpenEliminarMaster,
}: ModRegistroPropinasProps) {
  const [subTab, setSubTab] = useState<'captura' | 'historial'>('captura');
  const [fecha, setFecha] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [colaboradores, setColaboradores] = useState<WorkerRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Historial
  const [historial, setHistorial] = useState<any[]>([]);
  const [pendientesCount, setPendientesCount] = useState(0);

  // Modal Anulación
  const [modalAnular, setModalAnular] = useState<{
    show: boolean;
    idReg: number;
    fecha: string;
    monto: number;
    justificacion: string;
  }>({ show: false, idReg: 0, fecha: '', monto: 0, justificacion: '' });

  // Modal Ver Justificación
  const [modalVerJust, setModalVerJust] = useState<{
    show: boolean;
    idReg: number;
    justificacion: string;
    validador: string;
  }>({ show: false, idReg: 0, justificacion: '', validador: '' });

  const esValidador =
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
    cargarPlantillaPersonal();
  }, []);

  const cargarPlantillaPersonal = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/personal');
      const data = await res.json();
      setCargando(false);

      if (Array.isArray(data)) {
        const activos = data
          .filter((p: any) => p.estado.toLowerCase() !== 'inactivo')
          .map((p: any) => ({
            nombre: p.nombre,
            area: p.area,
            activo: true,
            horas: 12,
            prevHoras: 12,
            propinaCalculada: 0,
          }));
        setColaboradores(activos);
      }
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const cargarHistorial = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/registros');
      const data = await res.json();
      setCargando(false);

      if (Array.isArray(data)) {
        setHistorial(data);
        const pCount = data.filter((r) => r.estado === 'Pendiente de Anulación').length;
        setPendientesCount(pCount);
      }
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  // Cálculo en vivo del prorrateo 60/40
  const monto = parseFloat(montoTotal) || 0;
  const fondoSalon = monto * 0.6;
  const fondoCocina = monto * 0.4;

  let totalHorasSalon = 0;
  let totalHorasCocina = 0;

  colaboradores.forEach((c) => {
    if (c.activo) {
      if (c.area.includes('Salón')) totalHorasSalon += c.horas;
      else if (c.area.includes('Cocina')) totalHorasCocina += c.horas;
    }
  });

  const getPropinaCalculada = (c: WorkerRow) => {
    if (!c.activo || c.horas <= 0) return 0;
    const esSalon = c.area.includes('Salón');
    const totalArea = esSalon ? totalHorasSalon : totalHorasCocina;
    const fondoArea = esSalon ? fondoSalon : fondoCocina;
    return totalArea > 0 ? (fondoArea * c.horas) / totalArea : 0;
  };

  const handleToggleAsistencia = (index: number) => {
    setColaboradores((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const nuevoActivo = !c.activo;
        return {
          ...c,
          activo: nuevoActivo,
          horas: nuevoActivo ? (c.prevHoras > 0 ? c.prevHoras : 12) : 0,
          prevHoras: c.activo && c.horas > 0 ? c.horas : c.prevHoras,
        };
      })
    );
  };

  const handleHorasChange = (index: number, val: number) => {
    setColaboradores((prev) =>
      prev.map((c, i) => (i === index ? { ...c, horas: Math.max(0, val) } : c))
    );
  };

  const handleMarcarTodos = (activo: boolean) => {
    setColaboradores((prev) =>
      prev.map((c) => ({
        ...c,
        activo,
        horas: activo ? (c.prevHoras > 0 ? c.prevHoras : 12) : 0,
      }))
    );
  };

  const handleGuardarRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      alert('Por favor ingrese un monto recaudado válido mayor a cero.');
      return;
    }

    const participantes = colaboradores
      .filter((c) => c.activo && c.horas > 0)
      .map((c) => ({
        colaborador: c.nombre,
        area: c.area,
        horas: c.horas,
      }));

    if (participantes.length === 0) {
      alert('Debe haber al menos un colaborador en estado "Laborando" con horas asignadas.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          montoTotal: monto,
          participantes,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setMontoTotal('');
        cargarPlantillaPersonal();
      }
    } catch (err: any) {
      setCargando(false);
      alert('Error al guardar registro: ' + err.message);
    }
  };

  const handleConfirmarAnulacion = async () => {
    if (!modalAnular.justificacion.trim()) {
      alert('Debe ingresar una justificación obligatoria para la anulación.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/registros/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: modalAnular.idReg,
          justificacion: modalAnular.justificacion.trim(),
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      setModalAnular({ show: false, idReg: 0, fecha: '', monto: 0, justificacion: '' });
      cargarHistorial();
    } catch (e: any) {
      setCargando(false);
      alert('Error al anular registro: ' + e.message);
    }
  };

  const handleResolverAnulacion = async (idReg: number, accion: 'Aprobar' | 'Rechazar') => {
    const verbo =
      accion === 'Aprobar'
        ? 'APROBAR la anulación y excluir'
        : 'RECHAZAR la anulación y mantener activo';
    if (!confirm(`¿Confirmas ${verbo} el Registro #${idReg}?`)) return;

    try {
      setCargando(true);
      const res = await fetch('/api/registros/anular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: idReg,
          accion,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      cargarHistorial();
    } catch (e: any) {
      setCargando(false);
      alert('Error al resolver anulación: ' + e.message);
    }
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1 text-dark">
            <i className="bi bi-pencil-square text-primary me-2"></i>
            Captura y Registro de Propinas
          </h5>
          <p className="text-muted small mb-0">
            Prorrateo estricto por horas efectivas trabajadas según regla 60% Salón y 40% Cocina.
          </p>
        </div>
        <span className="badge bg-light text-primary border px-3 py-2">
          <i className="bi bi-clock-history me-1"></i> Múltiples registros permitidos por día
        </span>
      </div>

      {/* Pestañas internas */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${subTab === 'captura' ? 'active' : ''}`}
            onClick={() => setSubTab('captura')}
          >
            <i className="bi bi-calendar2-check me-1"></i> Capturar Nuevo Registro
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link fw-semibold ${subTab === 'historial' ? 'active' : ''}`}
            onClick={() => {
              setSubTab('historial');
              cargarHistorial();
            }}
          >
            <i className="bi bi-clock-history me-1"></i> Historial y Corrección de Registros
            {pendientesCount > 0 && (
              <span className="badge bg-danger ms-1">{pendientesCount}</span>
            )}
          </button>
        </li>
      </ul>

      {/* Sub-vista 1: Captura */}
      {subTab === 'captura' && (
        <form onSubmit={handleGuardarRegistro}>
          <div className="row g-3 p-3 bg-light rounded border mb-4">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Fecha del Registro</label>
              <input
                type="date"
                className="form-control"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Monto Total Recaudado (S/)</label>
              <input
                type="number"
                step="any"
                min="0.01"
                className="form-control fw-bold text-primary"
                placeholder="0.00"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Resumen de Fondos por Área */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="p-3 border rounded border-success bg-white d-flex justify-content-between align-items-center shadow-sm">
                <div>
                  <div className="small fw-bold text-success text-uppercase">
                    Fondo Salón (60%)
                  </div>
                  <div className="text-muted small">
                    Total Horas Salón: <span className="fw-bold">{totalHorasSalon.toFixed(1)}</span> hrs
                  </div>
                </div>
                <h3 className="fw-bold text-success mb-0">S/ {fondoSalon.toFixed(2)}</h3>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-3 border rounded border-warning bg-white d-flex justify-content-between align-items-center shadow-sm">
                <div>
                  <div className="small fw-bold text-warning text-uppercase">
                    Fondo Cocina (40%)
                  </div>
                  <div className="text-muted small">
                    Total Horas Cocina: <span className="fw-bold">{totalHorasCocina.toFixed(1)}</span> hrs
                  </div>
                </div>
                <h3 className="fw-bold text-warning mb-0">S/ {fondoCocina.toFixed(2)}</h3>
              </div>
            </div>
          </div>

          {/* Tabla de Asistencia y Distribución */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-people-fill text-primary me-2"></i>
                Plantilla del Personal para este Registro
              </h6>
              <span className="text-muted small">
                Cargado automáticamente desde <strong>Personal</strong>. Desactiva el interruptor en caso de <strong>descanso o ausencia</strong>.
              </span>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handleMarcarTodos(true)}
              >
                <i className="bi bi-check-all me-1"></i> Todos Laborando
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={cargarPlantillaPersonal}
                title="Sincronizar cambios de personal"
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Recargar Personal
              </button>
            </div>
          </div>

          <div className="table-responsive mb-4">
            <table className="table table-bordered align-middle small mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '20%' }}>Estado en Turno</th>
                  <th style={{ width: '35%' }}>Colaborador</th>
                  <th style={{ width: '15%' }}>Área Asignada</th>
                  <th style={{ width: '15%' }}>Horas Laboradas</th>
                  <th style={{ width: '15%' }}>Propina Calculada</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No hay colaboradores activos en el catálogo. Por favor agréguelos en el módulo <strong>Personal</strong>.
                    </td>
                  </tr>
                ) : (
                  colaboradores.map((c, idx) => {
                    const propina = getPropinaCalculada(c);
                    const esApoyo = c.area.includes('Apoyo');
                    return (
                      <tr
                        key={c.nombre}
                        className={!c.activo ? 'table-light opacity-50' : ''}
                      >
                        <td>
                          <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={c.activo}
                              onChange={() => handleToggleAsistencia(idx)}
                              id={`sw_${idx}`}
                            />
                            <label
                              className={`form-check-label small fw-semibold ${
                                c.activo ? 'text-success' : 'text-muted'
                              }`}
                              htmlFor={`sw_${idx}`}
                            >
                              {c.activo ? (
                                <>
                                  <i className="bi bi-check-circle me-1"></i>Laborando
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-moon-stars me-1"></i>Descanso
                                </>
                              )}
                            </label>
                          </div>
                        </td>
                        <td>
                          <strong className="text-dark">{c.nombre}</strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              esApoyo
                                ? 'bg-warning text-dark border border-warning'
                                : 'bg-light text-dark border'
                            }`}
                          >
                            {c.area}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.5"
                            min={c.activo ? '0.5' : '0'}
                            max="24"
                            className="form-control form-control-sm"
                            value={c.horas}
                            disabled={!c.activo}
                            onChange={(e) => handleHorasChange(idx, parseFloat(e.target.value) || 0)}
                            required={c.activo}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className={`form-control form-control-sm fw-bold ${
                              c.activo ? 'text-success' : 'text-muted'
                            }`}
                            value={c.activo ? `S/ ${propina.toFixed(2)}` : 'S/ 0.00 (Descanso)'}
                            readOnly
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-end">
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 fw-semibold shadow-sm"
              disabled={cargando || colaboradores.length === 0}
            >
              <i className="bi bi-check2-circle me-1"></i> Registrar y Congelar Propinas
            </button>
          </div>
        </form>
      )}

      {/* Sub-vista 2: Historial */}
      {subTab === 'historial' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="fw-bold mb-1 text-dark">
                <i className="bi bi-journals text-primary me-2"></i>
                Historial de Registros Realizados
              </h6>
              <p className="text-muted small mb-0">
                Para corregir un registro erróneo, solicita o valida la anulación ingresando una justificación obligatoria.
              </p>
            </div>
            <button className="btn btn-outline-secondary btn-sm" onClick={cargarHistorial}>
              <i className="bi bi-arrow-clockwise me-1"></i> Actualizar
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle small">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '10%' }}>ID Reg.</th>
                  <th style={{ width: '12%' }}>Fecha</th>
                  <th style={{ width: '15%' }}>Monto Total</th>
                  <th style={{ width: '18%' }}>Fondo Salón / Cocina</th>
                  <th style={{ width: '12%' }}>Personal</th>
                  <th style={{ width: '15%' }}>Estado</th>
                  <th style={{ width: '18%', textAlign: 'center' }}>Acciones / Validación</th>
                </tr>
              </thead>
              <tbody>
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      No hay registros de recaudación previos.
                    </td>
                  </tr>
                ) : (
                  historial.map((r) => {
                    const esAnulado = r.estado === 'Anulado';
                    const esPendiente = r.estado === 'Pendiente de Anulación';

                    return (
                      <tr
                        key={r.idRegistro}
                        className={esAnulado ? 'table-light opacity-75' : ''}
                      >
                        <td>
                          <strong>#{r.idRegistro}</strong>
                        </td>
                        <td>{r.fecha}</td>
                        <td className="fw-bold text-primary">S/ {r.montoTotal.toFixed(2)}</td>
                        <td>
                          <small className="text-success">
                            Salón: S/ {r.fondoSalon.toFixed(2)}
                          </small>
                          <br />
                          <small className="text-warning">
                            Cocina: S/ {r.fondoCocina.toFixed(2)}
                          </small>
                        </td>
                        <td>{r.cantParticipantes} colab.</td>
                        <td>
                          <span
                            className={`badge ${
                              esAnulado
                                ? 'bg-danger'
                                : esPendiente
                                ? 'bg-warning text-dark'
                                : 'bg-success'
                            }`}
                          >
                            {r.estado}
                          </span>
                        </td>
                        <td className="text-center">
                          {esAnulado ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-0 px-2"
                              onClick={() =>
                                setModalVerJust({
                                  show: true,
                                  idReg: r.idRegistro,
                                  justificacion: r.justificacion,
                                  validador: r.validador,
                                })
                              }
                            >
                              <i className="bi bi-info-circle me-1"></i>Ver Motivo
                            </button>
                          ) : esPendiente ? (
                            esValidador ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm py-0 px-2 me-1"
                                  onClick={() => handleResolverAnulacion(r.idRegistro, 'Aprobar')}
                                >
                                  <i className="bi bi-check-lg me-1"></i>Validar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm py-0 px-2 me-1"
                                  onClick={() => handleResolverAnulacion(r.idRegistro, 'Rechazar')}
                                >
                                  <i className="bi bi-x-lg me-1"></i>Rechazar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-info btn-sm py-0 px-2"
                                  onClick={() =>
                                    setModalVerJust({
                                      show: true,
                                      idReg: r.idRegistro,
                                      justificacion: r.justificacion,
                                      validador: r.validador,
                                    })
                                  }
                                >
                                  <i className="bi bi-chat-left-text"></i>
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="badge bg-warning text-dark me-1">
                                  Pendiente Validación
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm py-0 px-2"
                                  onClick={() =>
                                    setModalVerJust({
                                      show: true,
                                      idReg: r.idRegistro,
                                      justificacion: r.justificacion,
                                      validador: r.validador,
                                    })
                                  }
                                >
                                  <i className="bi bi-chat-left-text"></i>
                                </button>
                              </>
                            )
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline-warning btn-sm py-0 px-2"
                              onClick={() =>
                                setModalAnular({
                                  show: true,
                                  idReg: r.idRegistro,
                                  fecha: r.fecha,
                                  monto: r.montoTotal,
                                  justificacion: '',
                                })
                              }
                            >
                              <i className="bi bi-slash-circle me-1"></i>Anular
                            </button>
                          )}

                          {puedeEliminar && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm py-0 px-2 ms-1"
                              title="Eliminar definitivamente"
                              onClick={() =>
                                onOpenEliminarMaster(
                                  'RegistroPropinas',
                                  r.idRegistro,
                                  `Registro #${r.idRegistro} - S/ ${r.montoTotal.toFixed(2)} (${r.fecha})`
                                )
                              }
                            >
                              <i className="bi bi-trash3-fill me-1"></i>Eliminar
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
      )}

      {/* Modal Anular Registro */}
      {modalAnular.show && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-danger text-white">
                  <h6 className="modal-title fw-bold">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Anular / Corregir Registro de Propinas
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() =>
                      setModalAnular({ show: false, idReg: 0, fecha: '', monto: 0, justificacion: '' })
                    }
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded border mb-3 small">
                    <div className="d-flex justify-content-between mb-1">
                      <strong>Registro a Modificar:</strong>
                      <span className="badge bg-primary fs-6">#{modalAnular.idReg}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Fecha del Turno:</span>
                      <strong>{modalAnular.fecha}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Monto Total Recaudado:</span>
                      <strong className="text-success">S/ {modalAnular.monto.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-danger">
                      Motivo o Justificación Obligatoria de la Anulación *
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Indique claramente la razón por la que se anula este registro..."
                      value={modalAnular.justificacion}
                      onChange={(e) =>
                        setModalAnular((prev) => ({ ...prev, justificacion: e.target.value }))
                      }
                      required
                    ></textarea>
                  </div>

                  <div
                    className={`alert ${
                      esValidador ? 'alert-warning' : 'alert-info'
                    } py-2 px-3 small border mb-0`}
                  >
                    {esValidador ? (
                      <>
                        <i className="bi bi-shield-check me-1"></i> Como{' '}
                        <strong>{currentUser?.rol}</strong>, tu validación es inmediata: al
                        confirmar, el registro quedará <strong>ANULADO</strong> y excluido formalmente.
                      </>
                    ) : (
                      <>
                        <i className="bi bi-info-circle me-1"></i> Como{' '}
                        <strong>Moderador</strong>, esta solicitud quedará en estado{' '}
                        <strong>PENDIENTE</strong> hasta validación por Administrador o Supervisor.
                      </>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setModalAnular({ show: false, idReg: 0, fecha: '', monto: 0, justificacion: '' })
                    }
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleConfirmarAnulacion}
                  >
                    <i className="bi bi-trash3 me-1"></i> Confirmar Anulación
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Ver Justificación */}
      {modalVerJust.show && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-secondary text-white">
                  <h6 className="modal-title fw-bold">
                    Detalle de Anulación - Registro #{modalVerJust.idReg}
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() =>
                      setModalVerJust({ show: false, idReg: 0, justificacion: '', validador: '' })
                    }
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="small text-muted fw-bold">Motivo Registrado:</label>
                    <div className="p-3 bg-light rounded border small text-dark">
                      {modalVerJust.justificacion || '(Sin justificación detallada)'}
                    </div>
                  </div>
                  <div>
                    <label className="small text-muted fw-bold">Responsable / Validación:</label>
                    <div className="small fw-semibold text-primary">
                      {modalVerJust.validador || '(No asignado)'}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setModalVerJust({ show: false, idReg: 0, justificacion: '', validador: '' })
                    }
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
