'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModUsuariosProps {
  currentUser: SessionUser | null;
  onOpenEliminarMaster: (modulo: string, id: string | number, desc: string) => void;
}

export default function ModUsuarios({
  currentUser,
  onOpenEliminarMaster,
}: ModUsuariosProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Modal
  const [modalShow, setModalShow] = useState(false);
  const [usrId, setUsrId] = useState('');
  const [usrNombre, setUsrNombre] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrRol, setUsrRol] = useState('Moderador');
  const [usrEstado, setUsrEstado] = useState('Activo');

  const esMaster =
    currentUser?.id === 'USR-MASTER' ||
    currentUser?.esMaestro ||
    (currentUser?.email && currentUser.email.toLowerCase().includes('master'));

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      setCargando(false);
      if (Array.isArray(data)) setUsuarios(data);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const handleAbrirCrear = () => {
    setUsrId('');
    setUsrNombre('');
    setUsrEmail('');
    setUsrPassword('');
    setUsrRol('Moderador');
    setUsrEstado('Activo');
    setModalShow(true);
  };

  const handleAbrirEditar = (u: any) => {
    setUsrId(u.id);
    setUsrNombre(u.nombre);
    setUsrEmail(u.email);
    setUsrPassword('');
    setUsrRol(u.rol);
    setUsrEstado(u.estado);
    setModalShow(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usrNombre.trim() || !usrEmail.trim()) {
      alert('Por favor complete los campos obligatorios.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: usrId,
          nombre: usrNombre.trim(),
          email: usrEmail.trim(),
          password: usrPassword.trim() || undefined,
          rol: usrRol,
          estado: usrEstado,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setModalShow(false);
        cargarUsuarios();
      }
    } catch (err: any) {
      setCargando(false);
      alert('Error al guardar usuario: ' + err.message);
    }
  };

  const getRolBadge = (rol: string) => {
    if (rol === 'Administrador') return 'bg-danger';
    if (rol === 'Supervisor') return 'bg-primary';
    return 'bg-warning text-dark';
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-1 text-dark">
            <i className="bi bi-person-gear text-primary me-2"></i>
            Administración de Usuarios y Accesos
          </h5>
          <p className="text-muted small mb-0">
            Gobernanza estricta de roles (Administrador, Supervisor, Moderador) y salvaguarda de Cuenta Maestra.
          </p>
        </div>
        <button className="btn btn-primary btn-sm px-3" onClick={handleAbrirCrear}>
          <i className="bi bi-person-plus me-1"></i> Nuevo Usuario
        </button>
      </div>

      <div className="alert alert-info py-2 px-3 small border mb-4">
        <i className="bi bi-shield-lock-fill me-1"></i>
        <strong>Gobernanza de Seguridad:</strong> El <em>Usuario Maestro (USR-MASTER)</em> es inmutable y no puede ser desactivado ni eliminado para garantizar la continuidad operativa.
      </div>

      <div className="table-responsive">
        <table className="table table-hover align-middle small mb-0">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>Nombre del Usuario</th>
              <th>Correo / Identificador</th>
              <th>Rol Asignado</th>
              <th>Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esInmutable = u.esMaestro || u.id === 'USR-MASTER';
              const estadoBadge = u.estado === 'Activo' ? 'bg-success' : 'bg-secondary';

              return (
                <tr key={u.id}>
                  <td>
                    <code>{u.id}</code>
                  </td>
                  <td>
                    <strong>{u.nombre}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${getRolBadge(u.rol)}`}>{u.rol}</span>
                  </td>
                  <td>
                    <span className={`badge ${estadoBadge}`}>{u.estado}</span>
                  </td>
                  <td className="text-center">
                    {esInmutable ? (
                      <span className="badge bg-secondary">Inmutable</span>
                    ) : (
                      <>
                        <button
                          className="btn btn-outline-primary btn-sm py-0 px-2"
                          onClick={() => handleAbrirEditar(u)}
                        >
                          <i className="bi bi-pencil me-1"></i> Editar
                        </button>

                        {esMaster && (
                          <button
                            className="btn btn-outline-danger btn-sm py-0 px-2 ms-1"
                            title="Eliminar cuenta"
                            onClick={() =>
                              onOpenEliminarMaster(
                                'Usuarios',
                                u.id,
                                `Usuario: ${u.nombre} (${u.email})`
                              )
                            }
                          >
                            <i className="bi bi-trash3-fill"></i>
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Usuario */}
      {modalShow && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-primary text-white">
                  <h6 className="modal-title fw-bold">
                    {usrId ? `Editar Usuario: ${usrId}` : 'Crear Nuevo Usuario'}
                  </h6>
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
                        value={usrNombre}
                        onChange={(e) => setUsrNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">
                        Correo Electrónico / Login
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={usrEmail}
                        onChange={(e) => setUsrEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">
                        Contraseña / PIN de Acceso
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder={usrId ? 'Dejar en blanco para mantener la actual' : '••••'}
                        value={usrPassword}
                        onChange={(e) => setUsrPassword(e.target.value)}
                        required={!usrId}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Rol Asignado</label>
                      <select
                        className="form-select"
                        value={usrRol}
                        onChange={(e) => setUsrRol(e.target.value)}
                        required
                      >
                        <option value="Administrador">
                          Administrador (Acceso Total y Usuarios)
                        </option>
                        <option value="Supervisor">Supervisor (Acceso Total Operativo)</option>
                        <option value="Moderador">
                          Moderador (Solo Captura - Aprobación Requerida)
                        </option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Estado de Cuenta</label>
                      <select
                        className="form-select"
                        value={usrEstado}
                        onChange={(e) => setUsrEstado(e.target.value)}
                        required
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
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
                        Guardar Usuario
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
