'use client';

import React from 'react';
import { SessionUser } from '@/lib/auth';

interface NavbarTopProps {
  currentUser: SessionUser | null;
  cicloInfo: { inicio: string; fin: string; estado: string } | null;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function NavbarTop({
  currentUser,
  cicloInfo,
  onToggleSidebar,
  onLogout,
}: NavbarTopProps) {
  const getBadgeClass = (rol?: string) => {
    if (rol === 'Administrador') return 'bg-danger';
    if (rol === 'Supervisor') return 'bg-primary';
    return 'bg-warning text-dark';
  };

  return (
    <header className="navbar-top no-print">
      <div className="d-flex align-items-center gap-2">
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
        <span
          className="badge bg-light text-dark border px-2 py-1 small text-truncate"
          id="cicloActivoBadge"
          style={{ maxWidth: '280px' }}
        >
          <i className="bi bi-calendar-check text-primary me-1"></i>
          {cicloInfo && cicloInfo.inicio
            ? `Ciclo: ${cicloInfo.inicio} al ${cicloInfo.fin} (${cicloInfo.estado})`
            : 'Ciclo: Cargando...'}
        </span>
      </div>

      <div className="d-flex align-items-center gap-2">
        <div className="text-end me-1">
          <div
            className="fw-bold text-dark small text-truncate"
            style={{ maxWidth: '160px' }}
          >
            {currentUser?.nombre || 'Usuario'}
          </div>
          <span className={`badge ${getBadgeClass(currentUser?.rol)} badge-role`}>
            {currentUser?.esMaestro ? 'Maestro' : currentUser?.rol || 'Invitado'}
          </span>
        </div>
        <button
          className="btn btn-outline-danger btn-sm px-2 py-1"
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
