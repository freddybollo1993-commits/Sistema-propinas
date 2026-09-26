'use client';

import React from 'react';
import { SessionUser } from '@/lib/auth';

export type ModuleName =
  | 'CatalogoTiendas'
  | 'CredencialesTiendas'
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

interface MenuItem {
  id: ModuleName;
  label: string;
  icon: string;
  jpLabel?: string;
  adminOnly?: boolean;
  maestroOnly?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface MenuSection {
  title: string;
  jpTitle: string;
  items: MenuItem[];
}

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

  const sections: MenuSection[] = [
    ...(currentUser?.esMaestro
      ? [
          {
            title: 'Corporativo Multi-Sede',
            jpTitle: '統括ポータル',
            items: [
              {
                id: 'CatalogoTiendas' as ModuleName,
                label: 'Catálogo de Tiendas',
                jpLabel: '店舗一覧',
                icon: 'bi-grid-3x3-gap-fill',
                maestroOnly: true,
              },
              {
                id: 'CredencialesTiendas' as ModuleName,
                label: 'Credenciales de Tiendas',
                jpLabel: '認証情報',
                icon: 'bi-key-fill',
                maestroOnly: true,
              },
            ],
          },
        ]
      : []),
    {
      title: 'Operaciones & Control',
      jpTitle: '業務統括',
      items: [
        { id: 'Dashboard', label: 'Dashboard Local', jpLabel: 'ダッシュボード', icon: 'bi-speedometer2' },
        { id: 'CentralNeuralgica', label: 'Central Neurálgica (BI)', jpLabel: '統合分析', icon: 'bi-diagram-3' },
        { id: 'RegistroPropinas', label: 'Registro de Propinas', jpLabel: 'チップ記録', icon: 'bi-pencil-square' },
      ],
    },
    {
      title: 'Gestión de Equipo',
      jpTitle: '人事・報酬',
      items: [
        { id: 'Personal', label: 'Personal & Catálogo', jpLabel: 'スタッフ管理', icon: 'bi-people' },
        { id: 'Sanciones', label: 'Sanciones & Faltas', jpLabel: '規律・減点', icon: 'bi-exclamation-octagon' },
        { id: 'Adelantos', label: 'Adelantos de Propinas', jpLabel: '前払い管理', icon: 'bi-wallet2' },
        { id: 'FechasActivas', label: 'Fechas & Ciclos', jpLabel: '締め期間', icon: 'bi-calendar-range' },
        { id: 'Liquidacion', label: 'Liquidación & Boletas', jpLabel: '精算・明細', icon: 'bi-file-earmark-spreadsheet' },
      ],
    },
    {
      title: 'Seguridad & Auditoría',
      jpTitle: '監査・権限',
      items: [
        { id: 'Auditoria', label: 'Registro de Auditoría', jpLabel: '監査ログ', icon: 'bi-shield-check' },
        { id: 'Usuarios', label: 'Usuarios & Accesos', jpLabel: 'ユーザー権限', icon: 'bi-person-gear', adminOnly: true },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${isOpenMobile ? 'mobile-open' : ''} no-print`} id="appSidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="d-flex align-items-center gap-2">
          <div className="brand-logo-wrapper position-relative">
            <img
              src="/icons/icon-192x192.png"
              alt="Logo Shimaya"
            />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold fs-6 text-white lh-sm">Shimaya</span>
              <span className="sidebar-brand-japanese">嶋屋</span>
            </div>
            <div className="text-white-50 d-flex align-items-center gap-1" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
              <span>PROPINAS</span>
              <span className="opacity-50">/</span>
              <span className="text-danger fw-bold" style={{ fontSize: '0.62rem' }}>匠 TAKUMI</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-close btn-close-white d-lg-none"
          onClick={onCloseMobile}
          aria-label="Cerrar menú"
        ></button>
      </div>

      {/* Sede Activa Capsule con Pulsing Dot & Hanko Touch */}
      {activeTiendaNombre && (
        <div className="sidebar-store-capsule" title={`Conectado a: ${activeTiendaNombre}`}>
          <span className="pulse-dot"></span>
          <div className="overflow-hidden flex-grow-1">
            <div className="d-flex align-items-center justify-content-between text-white-50" style={{ fontSize: '0.64rem', letterSpacing: '0.06em' }}>
              <span className="text-uppercase fw-bold">Sede Conectada</span>
              <span className="text-danger-subtle fw-semibold font-monospace" style={{ fontSize: '0.58rem' }}>拠点</span>
            </div>
            <div className="text-white fw-bold small text-truncate">
              {activeTiendaNombre}
            </div>
          </div>
          <i className="bi bi-shop text-danger opacity-75"></i>
        </div>
      )}

      {/* Navegación por Categorías */}
      <nav className="nav flex-column">
        {sections.map((sec, sIdx) => {
          // Filtrar items según rol
          const visibleItems = sec.items.filter((item) => {
            if (item.adminOnly && !esAdminOMaestro) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.title || sIdx} className="mb-2">
              <div className="sidebar-category">
                <span>{sec.title}</span>
                <span className="sidebar-category-jp">{sec.jpTitle}</span>
              </div>
              {visibleItems.map((item) => {
                const isActive = currentModule === item.id;
                return (
                  <a
                    key={item.id}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectModule(item.id);
                      onCloseMobile();
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <i className={`bi ${item.icon}`}></i>
                    <span className="flex-grow-1 text-truncate">{item.label}</span>
                    {item.badge && (
                      <span className={`badge ${item.badgeColor || 'bg-danger'} ms-auto`} style={{ fontSize: '0.68rem' }}>
                        {item.badge}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
