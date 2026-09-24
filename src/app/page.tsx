'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';
import Sidebar, { ModuleName } from '@/components/Sidebar';
import NavbarTop from '@/components/NavbarTop';
import LoginView from '@/components/LoginView';
import ModalEliminarMaster from '@/components/ModalEliminarMaster';
import ModalNuevaTienda from '@/components/ModalNuevaTienda';

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

  // Multi-Tienda State
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [activeTiendaId, setActiveTiendaId] = useState<string>('');
  const [modalNuevaTiendaShow, setModalNuevaTiendaShow] = useState(false);

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

  // Key de recarga forzada para componentes que necesiten refrescar datos tras cambio de tienda o eliminación
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    verificarSesion();
  }, []);

  useEffect(() => {
    if (currentUser) {
      cargarTiendas();
      cargarCicloActivo();
    }
  }, [currentUser]);

  const verificarSesion = async () => {
    try {
      setCargandoAuth(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setCargandoAuth(false);
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
        if (data.user.tiendaId) {
          setActiveTiendaId(data.user.tiendaId);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      setCargandoAuth(false);
      setCurrentUser(null);
    }
  };

  const cargarTiendas = async () => {
    try {
      const res = await fetch('/api/tiendas');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setTiendas(data);
        // Si no hay tienda activa o la actual no está en la lista
        setActiveTiendaId((prev) => {
          if (prev && data.some((t: any) => t.id === prev)) return prev;
          return currentUser?.tiendaId || data[0].id;
        });
      }
    } catch (e) {
      console.error('Error al cargar tiendas:', e);
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

  const handleSelectTienda = async (tiendaId: string) => {
    try {
      const res = await fetch('/api/tiendas/activa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiendaId }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveTiendaId(tiendaId);
        await cargarCicloActivo();
        setRefreshKey((k) => k + 1);
      } else {
        alert(data.message || 'Error al cambiar de tienda.');
      }
    } catch (err: any) {
      alert('Error de conexión: ' + err.message);
    }
  };

  const handleTiendaCreada = async (nuevaTienda: any) => {
    setTiendas((prev) => [...prev, nuevaTienda]);
    await handleSelectTienda(nuevaTienda.id);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    setCurrentUser(null);
    setCurrentModule('Dashboard');
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('sidebar-open-mobile', mobileSidebarOpen);
    }
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    }
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      setMobileSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
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

  const activeTiendaObj = tiendas.find((t) => t.id === activeTiendaId);
  const activeTiendaNombre = activeTiendaObj?.nombre || currentUser?.tiendaNombre || 'Sede Principal';

  if (cargandoAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: '#0f172a' }}>
        <div className="text-center text-white">
          <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }}></div>
          <div className="fw-semibold">Cargando sistema multi-restaurante...</div>
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
          if (user.tiendaId) {
            setActiveTiendaId(user.tiendaId);
          }
          cargarTiendas();
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
        className={`sidebar-backdrop ${mobileSidebarOpen ? 'show' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      ></div>

      {/* Sidebar Plegable con Indicador de Restaurante */}
      <Sidebar
        currentModule={currentModule}
        onSelectModule={(mod) => {
          setCurrentModule(mod);
          setMobileSidebarOpen(false);
        }}
        currentUser={currentUser}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isOpenMobile={mobileSidebarOpen}
        activeTiendaNombre={activeTiendaNombre}
      />

      {/* Contenedor Principal */}
      <div className="main-wrapper" id="mainWrapper">
        <NavbarTop
          currentUser={currentUser}
          cicloInfo={cicloInfo}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
          tiendas={tiendas}
          activeTiendaId={activeTiendaId}
          onSelectTienda={handleSelectTienda}
          onOpenCrearTienda={() => setModalNuevaTiendaShow(true)}
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
          <div key={`${currentModule}-${activeTiendaId}-${refreshKey}`}>
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

      {/* Modal Nueva Tienda (SuperAdmin) */}
      <ModalNuevaTienda
        show={modalNuevaTiendaShow}
        onClose={() => setModalNuevaTiendaShow(false)}
        onSuccess={handleTiendaCreada}
      />

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
