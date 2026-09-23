'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';
import Sidebar, { ModuleName } from '@/components/Sidebar';
import NavbarTop from '@/components/NavbarTop';
import LoginView from '@/components/LoginView';
import ModalEliminarMaster from '@/components/ModalEliminarMaster';

import ModDashboard from '@/components/modules/ModDashboard';
import ModRegistroPropinas from '@/components/modules/ModRegistroPropinas';
import ModPersonal from '@/components/modules/ModPersonal';
import ModSanciones from '@/components/modules/ModSanciones';
import ModAdelantos from '@/components/modules/ModAdelantos';
import ModFechasActivas from '@/components/modules/ModFechasActivas';
import ModLiquidacion from '@/components/modules/ModLiquidacion';
import ModAuditoria from '@/components/modules/ModAuditoria';
import ModUsuarios from '@/components/modules/ModUsuarios';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [currentModule, setCurrentModule] = useState<ModuleName>('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Ciclo activo global
  const [cicloInfo, setCicloInfo] = useState<{
    inicio: string;
    fin: string;
    estado: string;
    id?: number;
  } | null>(null);

  // Modal Maestro Global de Eliminación
  const [modalMaster, setModalMaster] = useState<{
    show: boolean;
    modulo: string;
    idOParam: string | number;
    descripcionVisual: string;
  }>({ show: false, modulo: '', idOParam: '', descripcionVisual: '' });

  // Key de recarga forzada para componentes que necesiten refrescar datos tras eliminación
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    verificarSesion();
    cargarCicloActivo();
  }, []);

  const verificarSesion = async () => {
    try {
      setCargandoAuth(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setCargandoAuth(false);
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      setCargandoAuth(false);
      setCurrentUser(null);
    }
  };

  const cargarCicloActivo = async () => {
    try {
      const res = await fetch('/api/ciclo');
      const data = await res.json();
      if (data.inicio && data.fin) {
        setCicloInfo(data);
      }
    } catch (e) {
      console.error('Error al cargar ciclo:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setCurrentUser(null);
    setCurrentModule('Dashboard');
  };

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleOpenEliminarMaster = (
    modulo: string,
    idOParam: string | number,
    descripcionVisual: string
  ) => {
    setModalMaster({
      show: true,
      modulo,
      idOParam,
      descripcionVisual,
    });
  };

  if (cargandoAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: '#0f172a' }}>
        <div className="text-center text-white">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
          <div className="fw-semibold">Cargando sistema...</div>
        </div>
      </div>
    );
  }

  // Vista de login si no hay sesión activa
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          cargarCicloActivo();
          setCurrentModule('Dashboard');
        }}
      />
    );
  }

  return (
    <div
      className={`${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${
        mobileSidebarOpen ? 'sidebar-open-mobile' : ''
      }`}
    >
      {/* Backdrop Móvil */}
      <div
        className="sidebar-backdrop"
        onClick={() => setMobileSidebarOpen(false)}
      ></div>

      {/* Sidebar Plegable */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={(mod) => setCurrentModule(mod)}
        currentUser={currentUser}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Contenedor Principal */}
      <div className="main-wrapper" id="mainWrapper">
        <NavbarTop
          currentUser={currentUser}
          cicloInfo={cicloInfo}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
        />

        {/* Notificación de Modo Moderador */}
        {currentUser.rol === 'Moderador' && (
          <div className="px-3 pt-2 no-print">
            <div className="alert alert-warning py-2 px-3 small border mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-info-circle-fill fs-6"></i>
              <span>
                <strong>Modo Moderador:</strong> Tus registros de propina, sanciones y solicitudes quedan en estado <em>Pendiente</em> hasta que un Administrador o Supervisor los apruebe.
              </span>
            </div>
          </div>
        )}

        {/* Contenido Dinámico del Módulo Seleccionado */}
        <main className="main-content">
          <div key={`${currentModule}-${refreshKey}`}>
            {currentModule === 'Dashboard' && <ModDashboard cicloInfo={cicloInfo} />}
            {currentModule === 'RegistroPropinas' && (
              <ModRegistroPropinas
                currentUser={currentUser}
                onOpenEliminarMaster={handleOpenEliminarMaster}
              />
            )}
            {currentModule === 'Personal' && (
              <ModPersonal
                currentUser={currentUser}
                onOpenEliminarMaster={handleOpenEliminarMaster}
              />
            )}
            {currentModule === 'Sanciones' && (
              <ModSanciones
                currentUser={currentUser}
                onOpenEliminarMaster={handleOpenEliminarMaster}
              />
            )}
            {currentModule === 'Adelantos' && (
              <ModAdelantos
                currentUser={currentUser}
                onOpenEliminarMaster={handleOpenEliminarMaster}
              />
            )}
            {currentModule === 'FechasActivas' && (
              <ModFechasActivas
                currentUser={currentUser}
                onCicloActualizado={cargarCicloActivo}
              />
            )}
            {currentModule === 'Liquidacion' && (
              <ModLiquidacion currentUser={currentUser} cicloInfo={cicloInfo} />
            )}
            {currentModule === 'Auditoria' && <ModAuditoria />}
            {currentModule === 'Usuarios' && (
              <ModUsuarios
                currentUser={currentUser}
                onOpenEliminarMaster={handleOpenEliminarMaster}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modal Global de Eliminación Master */}
      <ModalEliminarMaster
        show={modalMaster.show}
        modulo={modalMaster.modulo}
        idOParam={modalMaster.idOParam}
        descripcionVisual={modalMaster.descripcionVisual}
        onClose={() =>
          setModalMaster({ show: false, modulo: '', idOParam: '', descripcionVisual: '' })
        }
        onConfirmSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
