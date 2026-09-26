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
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // Modal
  const [modalShow, setModalShow] = useState(false);
  const [usrId, setUsrId] = useState('');
  const [usrNombre, setUsrNombre] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPassword, setUsrPassword] = useState('');
  const [usrRol, setUsrRol] = useState('Moderador');
  const [usrEstado, setUsrEstado] = useState('Activo');
  const [usrTiendaId, setUsrTiendaId] = useState('');

  const esMaster =
    currentUser?.id === 'USR-MASTER' ||
    currentUser?.esMaestro ||
    (currentUser?.email && currentUser.email.toLowerCase().includes('master'));

  useEffect(() => {
    cargarUsuarios();
    if (esMaster) {
      cargarTiendas();
    }
  }, [esMaster]);

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

  const cargarTiendas = async () => {
    try {
      const res = await fetch('/api/tiendas');
      const data = await res.json();
      if (Array.isArray(data)) setTiendas(data);
    } catch (e) {
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
    setUsrTiendaId(tiendas[0]?.id || currentUser?.tiendaId || '');
    setModalShow(true);
  };

  const handleAbrirEditar = (u: any) => {
    setUsrId(u.id);
    setUsrNombre(u.nombre);
    setUsrEmail(u.email);
    setUsrPassword('');
    setUsrRol(u.rol);
    setUsrEstado(u.estado);
    setUsrTiendaId(u.tiendaId || tiendas[0]?.id || '');
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
          tiendaId: usrTiendaId || undefined,
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
    <div className="card p-4 shadow-sm border-0 bg-white" style={{ borderRadius: '16px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="hanko-stamp">
              ユーザー権限
            </span>
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0 fw-bold">
              ACCESOS & GOBERNANZA
            </span>
          </div>
          <h4 className="fw-bold mb-1 text-slate-900 d-flex align-items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
            <i className="bi bi-person-gear text-danger"></i>
            <span>Administración de Usuarios y Accesos</span>
            <span className="text-danger-subtle" style={{ fontSize: '1rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>権限設定</span>
          </h4>
          <p className="text-secondary small mb-0">
            Gobernanza de credenciales por tienda (Administrador, Supervisor, Moderador) y salvaguarda de Cuenta Maestra.
          </p>
        </div>
        <button className="btn btn-primary px-3 py-2 shadow-xs rounded-3 fw-bold" onClick={handleAbrirCrear}>
          <i className="bi bi-person-plus-fill me-1"></i> Nuevo Usuario
        </button>
      </div>

      <div className="alert alert-info py-3 px-4 small border-0 mb-4 d-flex align-items-center gap-2 rounded-3 shadow-xs" style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb !important' }}>
        <i className="bi bi-shield-lock-fill text-primary fs-5"></i>
        <span className="text-slate-700">
          <strong>Gobernanza Multi-Restaurante:</strong> Los usuarios asignados a una tienda sólo tendrán acceso y visibilidad de los datos de su respectiva sucursal autorizada.
        </span>
      </div>

      <div className="table-responsive shadow-xs" style={{ borderRadius: '12px' }}>
        <table className="table table-hover align-middle small mb-0">
          <thead>
            <tr>
              <th style={{ width: '12%' }}>ID</th>
              <th style={{ width: '22%' }}>Usuario</th>
              <th style={{ width: '20%' }}>Correo / Login</th>
              <th style={{ width: '18%' }}>Tienda / Sede</th>
              <th style={{ width: '10%' }}>Rol</th>
              <th style={{ width: '8%' }}>Estado</th>
              <th style={{ width: '10%' }} className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esInmutable = u.esMaestro || u.id === 'USR-MASTER';
              const esAdmin = u.rol === 'Administrador';
              const esSuper = u.rol === 'Supervisor';
              const esActivo = u.estado === 'Activo';

              return (
                <tr key={u.id}>
                  <td>
                    <code className="text-secondary small font-mono">{u.id}</code>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-light border d-flex align-items-center justify-content-center text-primary fw-bold"
                        style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}
                      >
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <strong className="text-slate-900">{u.nombre}</strong>
                    </div>
                  </td>
                  <td className="font-mono text-secondary small">{u.email}</td>
                  <td>
                    <span className="badge bg-light text-slate-700 border">
                      <i className="bi bi-shop me-1 text-primary"></i>
                      {u.tiendaNombre || 'Sede Principal'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        esAdmin
                          ? 'badge-subtle-danger'
                          : esSuper
                          ? 'badge-subtle-primary'
                          : 'badge-subtle-warning'
                      }`}
                    >
                      {u.rol}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${esActivo ? 'badge-subtle-success' : 'badge-subtle-secondary'}`}>
                      {u.estado}
                    </span>
                  </td>
                  <td className="text-end">
                    {esInmutable ? (
                      <span className="badge badge-subtle-secondary">Inmutable</span>
                    ) : (
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-outline-primary btn-sm py-1 px-2 shadow-xs"
                          onClick={() => handleAbrirEditar(u)}
                          title="Editar usuario"
                        >
                          <i className="bi bi-pencil me-1"></i> Editar
                        </button>

                        {esMaster && (
                          <button
                            className="btn btn-outline-danger btn-sm py-1 px-2 shadow-xs"
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
                      </div>
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
              <div className="modal-content border-0 shadow-lg rounded-4">
                <div className="modal-header bg-primary text-white rounded-top-4 py-3">
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
                      <label className="form-label small fw-semibold">Nombre Completo *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. Juan Pérez"
                        value={usrNombre}
                        onChange={(e) => setUsrNombre(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-semibold">
                        Correo Electrónico / Login *
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="usuario@restaurante.com"
                        value={usrEmail}
                        onChange={(e) => setUsrEmail(e.target.value)}
                        required
                      />
                    </div>

                    {esMaster && (
                      <div className="mb-3">
                        <label className="form-label small fw-semibold">
                          Restaurante / Sucursal Asignada
                        </label>
                        <select
                          className="form-select"
                          value={usrTiendaId}
                          onChange={(e) => setUsrTiendaId(e.target.value)}
                        >
                          {tiendas.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

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
                          Administrador (Gestión Total de Tienda)
                        </option>
                        <option value="Supervisor">Supervisor (Operación y Aprobaciones)</option>
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

                    <div className="text-end pt-2">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm me-2"
                        onClick={() => setModalShow(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm px-3" disabled={cargando}>
                        {cargando ? 'Guardando...' : 'Guardar Usuario'}
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
