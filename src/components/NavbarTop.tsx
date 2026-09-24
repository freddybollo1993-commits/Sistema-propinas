'use client';

import React from 'react';
import { SessionUser } from '@/lib/auth';

interface NavbarTopProps {
  currentUser: SessionUser | null;
  cicloInfo: { inicio: string; fin: string; estado: string } | null;
  onToggleSidebar: () => void;
  onLogout: () => void;
  tiendas?: any[];
  activeTiendaId?: string;
  onSelectTienda?: (tiendaId: string) => void;
  onOpenCrearTienda?: () => void;
  onOpenCatalogo?: () => void;
}

export default function NavbarTop({
  currentUser,
  cicloInfo,
  onToggleSidebar,
  onLogout,
  tiendas = [],
  activeTiendaId = '',
  onSelectTienda,
  onOpenCrearTienda,
  onOpenCatalogo,
}: NavbarTopProps) {
  const getBadgeClass = (rol?: string) => {
    if (rol === 'Administrador') return 'bg-danger';
    if (rol === 'Supervisor') return 'bg-primary';
    return 'bg-warning text-dark';
  };

  const tiendaActual = tiendas.find((t) => t.id === activeTiendaId);
  const nombreTiendaActual =
    tiendaActual?.nombre || currentUser?.tiendaNombre || 'Sede Principal';

  return (
    <header className="navbar-top no-print">
      {/* Lado Izquierdo: Botón Menú + Selector Multi-Tienda + Ciclo */}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <button
          type="button"
          className="btn-toggle-sidebar"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSidebar();
          }}
          title="Mostrar/Ocultar Menú"
          style={{ touchAction: 'manipulation' }}
        >
          <i className="bi bi-list fs-4"></i>
        </button>

        {/* Selector de Tienda para SuperAdmin / Usuario Maestro */}
        {currentUser?.esMaestro ? (
          <div className="d-flex align-items-center gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-warning btn-sm px-2 py-1 shadow-sm d-flex align-items-center gap-1 text-dark fw-bold"
              onClick={onOpenCatalogo}
              title="Abrir Catálogo General de Todas las Tiendas"
            >
              <i className="bi bi-grid-3x3-gap-fill"></i>
              <span className="d-none d-sm-inline">Catálogo</span>
            </button>

            <div className="input-group input-group-sm" style={{ maxWidth: '230px' }}>
              <span
                className="input-group-text bg-primary text-white border-primary py-1 px-2"
                title="Sede Activa"
              >
                <i className="bi bi-shop"></i>
              </span>
              <select
                className="form-select form-select-sm fw-bold text-dark border-primary shadow-sm"
                value={activeTiendaId || ''}
                onChange={(e) => onSelectTienda && onSelectTienda(e.target.value)}
                title="Cambiar Tienda / Sucursal Activa"
              >
                {tiendas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm px-2 py-1 shadow-sm d-flex align-items-center gap-1"
              onClick={onOpenCrearTienda}
              title="Crear Nueva Tienda / Restaurante con Plantilla Base Clonada"
            >
              <i className="bi bi-plus-circle-fill"></i>
              <span className="d-none d-md-inline small fw-semibold">Nueva Tienda</span>
            </button>
          </div>
        ) : (
          /* Indicador de Tienda Fija para Usuarios Locales */
          <span
            className="badge bg-primary text-white px-2 py-2 small text-truncate d-flex align-items-center gap-1 shadow-sm"
            title={`Restaurante Asignado: ${nombreTiendaActual}`}
          >
            <i className="bi bi-shop"></i>
            <span className="fw-semibold">{nombreTiendaActual}</span>
          </span>
        )}

        {/* Badge de Ciclo Activo */}
        <span
          className="badge bg-light text-dark border px-2 py-1 small text-truncate d-none d-md-inline"
          id="cicloActivoBadge"
          style={{ maxWidth: '280px' }}
        >
          <i className="bi bi-calendar-check text-primary me-1"></i>
          {cicloInfo && cicloInfo.inicio
            ? `Ciclo: ${cicloInfo.inicio} al ${cicloInfo.fin} (${cicloInfo.estado})`
            : 'Ciclo: Cargando...'}
        </span>
      </div>

      {/* Lado Derecho: Usuario + Salir */}
      <div className="d-flex align-items-center gap-2">
        <div className="text-end me-1">
          <div
            className="fw-bold text-dark small text-truncate"
            style={{ maxWidth: '160px' }}
          >
            {currentUser?.nombre || 'Usuario'}
          </div>
          <span className={`badge ${getBadgeClass(currentUser?.rol)} badge-role`}>
            {currentUser?.esMaestro ? 'Maestro Corporativo' : currentUser?.rol || 'Invitado'}
          </span>
        </div>
        <button
          className="btn btn-outline-danger btn-sm px-2 py-1 shadow-sm"
          onClick={onLogout}
          title="Cerrar Sesión"
        >
          <i className="bi bi-box-arrow-right"></i>
          <span className="btn-logout-text ms-1">Salir</span>
        </button>
      </div>
    </header>
  );
}
