'use client';

import React from 'react';
import { SessionUser } from '@/lib/auth';

export type ModuleName =
  | 'Dashboard'
  | 'CentralNeuralgica'
  | 'RegistroPropinas'
  | 'Personal'
  | 'Sanciones'
  | 'Adelantos'
  | 'FechasActivas'
  | 'Liquidacion'
  | 'Auditoria'
  | 'Usuarios';

interface SidebarProps {
  currentModule: ModuleName;
  onSelectModule: (module: ModuleName) => void;
  currentUser: SessionUser | null;
  onCloseMobile: () => void;
  isOpenMobile?: boolean;
  activeTiendaNombre?: string;
}

export default function Sidebar({
  currentModule,
  onSelectModule,
  currentUser,
  onCloseMobile,
  isOpenMobile = false,
  activeTiendaNombre,
}: SidebarProps) {
  const esAdminOMaestro =
    currentUser?.rol === 'Administrador' ||
    currentUser?.esMaestro ||
    currentUser?.id === 'USR-MASTER';

  const menuItems: { id: ModuleName; label: string; icon: string; adminOnly?: boolean; maestroOnly?: boolean }[] = [
    { id: 'Dashboard', label: 'Dashboard Local', icon: 'bi-grid-1x2' },
    { id: 'CentralNeuralgica', label: 'Central Neurálgica (BI)', icon: 'bi-hdd-network' },
    { id: 'RegistroPropinas', label: 'Registro de Propinas', icon: 'bi-pencil-square' },
    { id: 'Personal', label: 'Personal', icon: 'bi-people' },
    { id: 'Sanciones', label: 'Sanciones y Faltas', icon: 'bi-exclamation-octagon' },
    { id: 'Adelantos', label: 'Adelantos', icon: 'bi-wallet2' },
    { id: 'FechasActivas', label: 'Fechas Activas', icon: 'bi-calendar-range' },
    { id: 'Liquidacion', label: 'Liquidación y Boletas', icon: 'bi-file-earmark-spreadsheet' },
    { id: 'Auditoria', label: 'Auditoría', icon: 'bi-shield-check' },
    { id: 'Usuarios', label: 'Usuarios y Accesos', icon: 'bi-person-gear', adminOnly: true },
  ];

  return (
    <aside className={`sidebar ${isOpenMobile ? 'mobile-open' : ''} no-print`} id="appSidebar">
      <div className="sidebar-brand">
        <div className="d-flex align-items-center gap-2">
          <div
            className="bg-primary text-white rounded p-1 d-flex align-items-center justify-content-center"
            style={{ width: '32px', height: '32px' }}
          >
            <i className="bi bi-cash-coin fs-6"></i>
          </div>
          <span className="fs-6 fw-bold">Gestión de Propinas</span>
        </div>
        <button
          type="button"
          className="btn-close btn-close-white d-lg-none"
          onClick={onCloseMobile}
        ></button>
      </div>

      {activeTiendaNombre && (
        <div className="px-3 py-2 bg-dark bg-opacity-25 text-white-50 small border-bottom border-secondary d-flex align-items-center gap-2">
          <i className="bi bi-shop text-warning"></i>
          <span className="text-truncate fw-semibold text-white small" title={activeTiendaNombre}>
            {activeTiendaNombre}
          </span>
        </div>
      )}

      <nav className="nav flex-column mt-3">
        {menuItems.map((item) => {
          if (item.adminOnly && !esAdminOMaestro) return null;
          const isActive = currentModule === item.id;
          return (
            <a
              key={item.id}
              className={`nav-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectModule(item.id);
                onCloseMobile();
              }}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
