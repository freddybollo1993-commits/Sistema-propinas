'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModPersonalProps {
  currentUser: SessionUser | null;
  onOpenEliminarMaster: (modulo: string, id: string | number, desc: string) => void;
}

export default function ModPersonal({
  currentUser,
  onOpenEliminarMaster,
}: ModPersonalProps) {
  const [personal, setPersonal] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Filtros de búsqueda
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroArea, setFiltroArea] = useState('');

  // Modal
  const [modalShow, setModalShow] = useState(false);
  const [perNombre, setPerNombre] = useState('');
  const [perArea, setPerArea] = useState('Salón');
  const [perEstado, setPerEstado] = useState('Activo');

  const puedeEliminar =
    currentUser?.esMaestro ||
    currentUser?.id === 'USR-MASTER' ||
    currentUser?.rol === 'Administrador' ||
    currentUser?.rol === 'Supervisor';

  useEffect(() => {
    cargarPersonal();
  }, []);

  const cargarPersonal = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/personal');
      const data = await res.json();
      setCargando(false);
      if (Array.isArray(data)) setPersonal(data);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  // Obtener lista única de áreas registradas
  const areasDisponibles = Array.from(
    new Set(personal.map((p) => p.area).filter(Boolean))
  );
  if (!areasDisponibles.includes('Salón')) areasDisponibles.push('Salón');
  if (!areasDisponibles.includes('Cocina')) areasDisponibles.push('Cocina');

  // Filtrado reactivo de colaboradores
  const personalFiltrado = personal.filter((p) => {
    const matchNombre = !filtroNombre.trim() || (p.nombre || '').toLowerCase().includes(filtroNombre.toLowerCase().trim());
    const matchEstado = !filtroEstado || p.estado === filtroEstado;
    const matchArea = !filtroArea || (p.area || '').toLowerCase() === filtroArea.toLowerCase();
    return matchNombre && matchEstado && matchArea;
  });

  const hayFiltrosActivos = !!filtroNombre.trim() || !!filtroEstado || !!filtroArea;

  const limpiarFiltros = () => {
    setFiltroNombre('');
    setFiltroEstado('');
    setFiltroArea('');
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perNombre.trim()) {
      alert('Por favor ingrese el nombre del colaborador.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: perNombre.trim(),
          area: perArea,
          estado: perEstado,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setModalShow(false);
        setPerNombre('');
        setPerArea('Salón');
        setPerEstado('Activo');
        cargarPersonal();
      }
    } catch (err: any) {
      setCargando(false);
      alert('Error al guardar personal: ' + err.message);
    }
  };

  const handleCambiarEstado = async (p: any, nuevoEstado: string) => {
    if (!confirm(`¿Confirmas cambiar el estado de ${p.nombre} a "${nuevoEstado}"?`)) return;

    try {
      setCargando(true);
      const res = await fetch('/api/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: p.nombre,
          area: p.area,
          estado: nuevoEstado,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      cargarPersonal();
    } catch (err: any) {
      setCargando(false);
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-1 text-dark">
            <i className="bi bi-people text-primary me-2"></i>
            Catálogo de Personal
          </h5>
          <p className="text-muted small mb-0">
            Gestión de altas y bajas del personal de Salón y Cocina que participa en el fondo de propinas.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm px-3 shadow-sm"
          onClick={() => {
            setPerNombre('');
            setPerArea('Salón');
            setPerEstado('Activo');
            setModalShow(true);
          }}
        >
          <i className="bi bi-person-plus me-1"></i> Nuevo Colaborador
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card border-0 bg-light p-3 mb-3" style={{ borderRadius: '10px' }}>
        <div className="row g-2 align-items-center">
          {/* Buscar por Nombre */}
          <div className="col-12 col-md-5">
            <label className="form-label small fw-bold text-secondary mb-1">
              <i className="bi bi-search me-1"></i> Buscar por Nombre
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <i className="bi bi-person text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Juan Pérez, María..."
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
              {filtroNombre && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setFiltroNombre('')}
                  title="Borrar texto"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>

          {/* Filtrar por Área */}
          <div className="col-6 col-md-3">
            <label className="form-label small fw-bold text-secondary mb-1">
              <i className="bi bi-geo-alt me-1"></i> Área de Trabajo
            </label>
            <select
              className="form-select form-select-sm"
              value={filtroArea}
              onChange={(e) => setFiltroArea(e.target.value)}
            >
              <option value="">Todas las áreas ({areasDisponibles.length})</option>
              {areasDisponibles.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Filtrar por Estado */}
          <div className="col-6 col-md-2">
            <label className="form-label small fw-bold text-secondary mb-1">
              <i className="bi bi-toggle2-on me-1"></i> Estado
            </label>
            <select
              className="form-select form-select-sm"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="Activo">Activos</option>
              <option value="Inactivo">Inactivos</option>
            </select>
          </div>

          {/* Botón Limpiar y Contador */}
          <div className="col-12 col-md-2 d-flex align-items-end pt-md-3">
            {hayFiltrosActivos ? (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={limpiarFiltros}
                title="Restablecer todos los filtros"
              >
                <i className="bi bi-eraser me-1"></i> Limpiar
              </button>
            ) : (
              <span className="text-muted small text-center w-100 d-none d-md-inline">
                {personal.length} colaboradores
              </span>
            )}
          </div>
        </div>

        {/* Resumen de Resultados Filtrados */}
        {hayFiltrosActivos && (
          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top small text-secondary">
            <span>
              Mostrando <strong>{personalFiltrado.length}</strong> de <strong>{personal.length}</strong> colaboradores
            </span>
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-decoration-none text-secondary"
              onClick={limpiarFiltros}
            >
              Restablecer
            </button>
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle small">
          <thead className="table-light">
            <tr>
              <th>Colaborador</th>
              <th>Área Asignada</th>
              <th>Estado Actual</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personalFiltrado.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-muted py-4">
                  {personal.length === 0 ? (
                    'No hay colaboradores registrados. Presione "+ Nuevo Colaborador" para agregar.'
                  ) : (
                    <div>
                      <i className="bi bi-funnel text-secondary fs-4 d-block mb-1"></i>
                      <span>No se encontraron colaboradores que coincidan con los filtros aplicados.</span>
                      <div className="mt-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm py-1 px-3"
                          onClick={limpiarFiltros}
                        >
                          Limpiar Filtros
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              personalFiltrado.map((p) => {
                const esActivo = p.estado === 'Activo';
                const badge = esActivo ? 'bg-success' : 'bg-secondary';
                const esApoyo = p.area.includes('Apoyo');

                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.nombre}</strong>
                    </td>
                    <td>
                      {esApoyo ? (
                        <span className="badge bg-warning text-dark border border-warning">
                          <i className="bi bi-person-badge me-1"></i>
                          {p.area}
                        </span>
                      ) : (
                        <span className="badge bg-light text-dark border">{p.area}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${badge}`}>{p.estado}</span>
                    </td>
                    <td className="text-center">
                      {esActivo ? (
                        <button
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          onClick={() => handleCambiarEstado(p, 'Inactivo')}
                        >
                          <i className="bi bi-person-x me-1"></i>Dar de Baja
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline-success btn-sm py-0 px-2"
                          onClick={() => handleCambiarEstado(p, 'Activo')}
                        >
                          <i className="bi bi-person-check me-1"></i>Reactivar
                        </button>
                      )}

                      {puedeEliminar && (
                        <button
                          className="btn btn-outline-danger btn-sm py-0 px-2 ms-1"
                          title="Eliminar del catálogo"
                          onClick={() =>
                            onOpenEliminarMaster(
                              'Personal',
                              p.nombre,
                              `Colaborador: ${p.nombre} (${p.area})`
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

      {/* Modal Personal */}
      {modalShow && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-primary text-white">
                  <h6 className="modal-title fw-bold">Registrar Colaborador</h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalShow(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={handleGuardar}>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Nombre Completo</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. Juan Pérez"
                        value={perNombre}
                        onChange={(e) => setPerNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Área de Trabajo</label>
                      <select
                        className="form-select"
                        value={perArea}
                        onChange={(e) => setPerArea(e.target.value)}
                        required
                      >
                        <option value="Salón">Salón (Regular - Fondo 60%)</option>
                        <option value="Cocina">Cocina (Regular - Fondo 40%)</option>
                        <option value="Apoyo Salón">Apoyo Salón (Fondo 60% - Solo día trabajado)</option>
                        <option value="Apoyo Cocina">Apoyo Cocina (Fondo 40% - Solo día trabajado)</option>
                      </select>
                      <div className="form-text small text-muted mt-1">
                        <i className="bi bi-info-circle me-1"></i> El personal de <strong>Apoyo</strong> recibe propina por las horas trabajadas en su jornada, pero <strong>no participa en la redistribución</strong> de sanciones/fondos acumulados.
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Estado</label>
                      <select
                        className="form-select"
                        value={perEstado}
                        onChange={(e) => setPerEstado(e.target.value)}
                        required
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo (Dado de baja)</option>
                      </select>
                    </div>
                    <div className="text-end">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm me-2"
                        onClick={() => setModalShow(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={cargando}>
                        Guardar Colaborador
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
