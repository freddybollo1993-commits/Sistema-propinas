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

import { getAreaGroup } from '@/lib/areas';
export { getAreaGroup };

export default function ModRegistroPropinas({
  currentUser,
  onOpenEliminarMaster,
}: ModRegistroPropinasProps) {
  const [subTab, setSubTab] = useState<'captura' | 'historial'>('captura');
  const [fecha, setFecha] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  const [colaboradores, setColaboradores] = useState<WorkerRow[]>([]);
  const [cargando, setCargando] = useState(false);

  // Modalidad de fondos: Regular 60/40 (predeterminada en todas las tiendas) o Modo Especial Equitativo
  const [modoDistribucion, setModoDistribucion] = useState<'60_40' | 'equitativo'>('60_40');
  const [justificacionModo, setJustificacionModo] = useState('');

  // Historial
  const [historial, setHistorial] = useState<any[]>([]);
  const [pendientesCount, setPendientesCount] = useState(0);

  // Modal Anulación Individual
  const [modalAnular, setModalAnular] = useState<{
    show: boolean;
    idReg: number;
    fecha: string;
    monto: number;
    hora?: string;
    turnoNumero?: number;
    turnosEnFecha?: number;
    justificacion: string;
  }>({
    show: false,
    idReg: 0,
    fecha: '',
    monto: 0,
    hora: '',
    turnoNumero: 1,
    turnosEnFecha: 1,
    justificacion: '',
  });

  // Modal Ver Nómina / Personal del Turno
  const [modalDetalleReg, setModalDetalleReg] = useState<{
    show: boolean;
    registro: any | null;
  }>({ show: false, registro: null });

  // Modal Ver Justificación
  const [modalVerJust, setModalVerJust] = useState<{
    show: boolean;
    idReg: number;
    justificacion: string;
    validador: string;
  }>({ show: false, idReg: 0, justificacion: '', validador: '' });

  // Modal Editar Turno (Personal y Horas con Recálculo Automático)
  const [modalEditar, setModalEditar] = useState<{
    show: boolean;
    idReg: number;
    fecha: string;
    createdAt?: string;
    turnoNumero?: number;
    turnosEnFecha?: number;
    montoTotal: number;
    modoDistribucion: '60_40' | 'equitativo';
    colaboradores: WorkerRow[];
    justificacion: string;
  }>({
    show: false,
    idReg: 0,
    fecha: '',
    montoTotal: 0,
    modoDistribucion: '60_40',
    colaboradores: [],
    justificacion: '',
  });

  const formatHoraRegistro = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

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
    cargarHistorial();
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
          }))
          .sort((a, b) => {
            const gA = getAreaGroup(a.area);
            const gB = getAreaGroup(b.area);
            if (gA.groupOrder !== gB.groupOrder) return gA.groupOrder - gB.groupOrder;
            if (gA.subOrder !== gB.subOrder) return gA.subOrder - gB.subOrder;
            return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
          });

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

  // Cálculo en vivo del prorrateo según modalidad (Regular 60/40 o Especial Equitativo)
  const monto = parseFloat(montoTotal) || 0;
  const esEquitativo = modoDistribucion === 'equitativo';

  let totalHorasSalon = 0;
  let totalHorasCocina = 0;
  let totalHorasGlobal = 0;
  let activosSalon = 0;
  let activosCocina = 0;

  colaboradores.forEach((c) => {
    if (c.activo && c.horas > 0) {
      totalHorasGlobal += c.horas;
      if (c.area.includes('Salón')) {
        totalHorasSalon += c.horas;
        activosSalon += 1;
      } else if (c.area.includes('Cocina')) {
        totalHorasCocina += c.horas;
        activosCocina += 1;
      }
    }
  });

  const getPropinaCalculada = (c: WorkerRow) => {
    if (!c.activo || c.horas <= 0) return 0;
    if (esEquitativo) {
      // Reparto equitativo entre todo el personal (ej: 100 soles entre 3 salón y 2 cocina = 20 c/u con horas iguales)
      return totalHorasGlobal > 0 ? (monto * c.horas) / totalHorasGlobal : 0;
    }
    const esSalon = c.area.includes('Salón');
    const totalArea = esSalon ? totalHorasSalon : totalHorasCocina;
    const fondoArea = esSalon ? monto * 0.6 : monto * 0.4;
    return totalArea > 0 ? (fondoArea * c.horas) / totalArea : 0;
  };

  let fondoSalon = 0;
  let fondoCocina = 0;
  if (esEquitativo) {
    colaboradores.forEach((c) => {
      if (c.activo && c.horas > 0) {
        const prop = getPropinaCalculada(c);
        if (c.area.includes('Salón')) fondoSalon += prop;
        else fondoCocina += prop;
      }
    });
  } else {
    fondoSalon = monto * 0.6;
    fondoCocina = monto * 0.4;
  }

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

    if (modoDistribucion === 'equitativo' && !justificacionModo.trim()) {
      alert('Debe ingresar una justificación obligatoria para utilizar el Modo Especial de Reparto Equitativo.');
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
          modoDistribucion,
          justificacion: modoDistribucion === 'equitativo' ? justificacionModo.trim() : '',
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setMontoTotal('');
        setModoDistribucion('60_40');
        setJustificacionModo('');
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

  // Recálculo en tiempo real para el modal de edición
  const editMonto = modalEditar.montoTotal || 0;
  const esEquitativoEdit = modalEditar.modoDistribucion === 'equitativo';
  let editTotalHorasSalon = 0;
  let editTotalHorasCocina = 0;
  let editTotalHorasGlobal = 0;
  let editActivosSalon = 0;
  let editActivosCocina = 0;

  modalEditar.colaboradores.forEach((c) => {
    if (c.activo && c.horas > 0) {
      editTotalHorasGlobal += c.horas;
      if (c.area.includes('Salón')) {
        editTotalHorasSalon += c.horas;
        editActivosSalon += 1;
      } else if (c.area.includes('Cocina')) {
        editTotalHorasCocina += c.horas;
        editActivosCocina += 1;
      }
    }
  });

  const getEditPropinaCalculada = (c: WorkerRow) => {
    if (!c.activo || c.horas <= 0) return 0;
    if (esEquitativoEdit) {
      return editTotalHorasGlobal > 0 ? (editMonto * c.horas) / editTotalHorasGlobal : 0;
    }
    const esSalon = c.area.includes('Salón');
    const totalArea = esSalon ? editTotalHorasSalon : editTotalHorasCocina;
    const fondoArea = esSalon ? editMonto * 0.6 : editMonto * 0.4;
    return totalArea > 0 ? (fondoArea * c.horas) / totalArea : 0;
  };

  let editFondoSalon = 0;
  let editFondoCocina = 0;
  if (esEquitativoEdit) {
    modalEditar.colaboradores.forEach((c) => {
      if (c.activo && c.horas > 0) {
        const prop = getEditPropinaCalculada(c);
        if (c.area.includes('Salón')) editFondoSalon += prop;
        else editFondoCocina += prop;
      }
    });
  } else {
    editFondoSalon = editMonto * 0.6;
    editFondoCocina = editMonto * 0.4;
  }

  const handleAbrirEditar = async (registro: any) => {
    try {
      setCargando(true);
      const res = await fetch('/api/personal');
      const personalList = await res.json();
      setCargando(false);

      const esModoEquitativo = Boolean(
        registro.justificacion?.includes('Modo Especial Equitativo') ||
        registro.justificacion?.includes('50/50') ||
        registro.justificacion?.includes('Equitativo')
      );

      const detalles = Array.isArray(registro.detalles) ? registro.detalles : [];
      const detalleMap = new Map<string, { horas: number; area: string }>();
      detalles.forEach((d: any) => {
        detalleMap.set((d.colaborador || '').trim().toLowerCase(), {
          horas: Number(d.horas) || 12,
          area: d.area || '',
        });
      });

      const mergedWorkers: WorkerRow[] = [];
      const processedNames = new Set<string>();

      if (Array.isArray(personalList)) {
        personalList.forEach((p: any) => {
          const normName = (p.nombre || '').trim().toLowerCase();
          processedNames.add(normName);
          const inDetalle = detalleMap.get(normName);
          if (inDetalle) {
            mergedWorkers.push({
              nombre: p.nombre,
              area: inDetalle.area || p.area || 'Salón',
              activo: true,
              horas: inDetalle.horas,
              prevHoras: inDetalle.horas,
              propinaCalculada: 0,
            });
          } else {
            // Trabajador registrado en la sede pero que no estuvo originalmente en el turno (ej. nuevo apoyo)
            mergedWorkers.push({
              nombre: p.nombre,
              area: p.area || 'Salón',
              activo: false,
              horas: 12,
              prevHoras: 12,
              propinaCalculada: 0,
            });
          }
        });
      }

      // Preservar colaboradores históricos del turno que ya no figuren en la nómina activa
      detalles.forEach((d: any) => {
        const normName = (d.colaborador || '').trim().toLowerCase();
        if (!processedNames.has(normName)) {
          processedNames.add(normName);
          mergedWorkers.push({
            nombre: d.colaborador,
            area: d.area || 'Salón',
            activo: true,
            horas: Number(d.horas) || 12,
            prevHoras: Number(d.horas) || 12,
            propinaCalculada: 0,
          });
        }
      });

      mergedWorkers.sort((a, b) => {
        const gA = getAreaGroup(a.area, esModoEquitativo ? 'equitativo' : '60_40');
        const gB = getAreaGroup(b.area, esModoEquitativo ? 'equitativo' : '60_40');
        if (gA.groupOrder !== gB.groupOrder) return gA.groupOrder - gB.groupOrder;
        if (gA.subOrder !== gB.subOrder) return gA.subOrder - gB.subOrder;
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      });

      setModalEditar({
        show: true,
        idReg: registro.idRegistro,
        fecha: registro.fecha,
        createdAt: registro.createdAt,
        turnoNumero: registro.turnoNumero,
        turnosEnFecha: registro.turnosEnFecha,
        montoTotal: Number(registro.montoTotal) || 0,
        modoDistribucion: esModoEquitativo ? 'equitativo' : '60_40',
        colaboradores: mergedWorkers,
        justificacion: '',
      });
    } catch (err: any) {
      setCargando(false);
      console.error('Error al preparar edición:', err);
      alert('Error al obtener la lista de colaboradores: ' + err.message);
    }
  };

  const handleToggleEditarAsistencia = (index: number) => {
    setModalEditar((prev) => ({
      ...prev,
      colaboradores: prev.colaboradores.map((c, i) => {
        if (i !== index) return c;
        const nuevoActivo = !c.activo;
        return {
          ...c,
          activo: nuevoActivo,
          horas: nuevoActivo ? (c.horas > 0 ? c.horas : (c.prevHoras || 12)) : 0,
          prevHoras: c.horas > 0 ? c.horas : c.prevHoras,
        };
      }),
    }));
  };

  const handleChangeEditarHoras = (index: number, horas: number) => {
    setModalEditar((prev) => ({
      ...prev,
      colaboradores: prev.colaboradores.map((c, i) => {
        if (i !== index) return c;
        const val = Math.max(0, horas);
        return {
          ...c,
          horas: val,
          prevHoras: val > 0 ? val : c.prevHoras,
        };
      }),
    }));
  };

  const handleMarcarTodosEditar = (activos: boolean) => {
    setModalEditar((prev) => ({
      ...prev,
      colaboradores: prev.colaboradores.map((c) => ({
        ...c,
        activo: activos,
        horas: activos ? (c.horas > 0 ? c.horas : (c.prevHoras || 12)) : 0,
        prevHoras: c.horas > 0 ? c.horas : c.prevHoras,
      })),
    }));
  };

  const handleConfirmarEdicion = async () => {
    if (!modalEditar.justificacion.trim()) {
      alert('Debe ingresar una justificación obligatoria para guardar las modificaciones del turno.');
      return;
    }

    const participantesActivos = modalEditar.colaboradores
      .filter((c) => c.activo && c.horas > 0)
      .map((c) => ({
        colaborador: c.nombre,
        area: c.area,
        horas: c.horas,
      }));

    if (participantesActivos.length === 0) {
      alert('Debe haber al menos un trabajador activo con horas laboradas mayor a 0.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/registros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idRegistro: modalEditar.idReg,
          justificacion: modalEditar.justificacion.trim(),
          participantes: participantesActivos,
          modoDistribucion: modalEditar.modoDistribucion,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setModalEditar({
          show: false,
          idReg: 0,
          fecha: '',
          montoTotal: 0,
          modoDistribucion: '60_40',
          colaboradores: [],
          justificacion: '',
        });
        cargarHistorial();
      }
    } catch (err: any) {
      setCargando(false);
      alert('Error al guardar cambios: ' + err.message);
    }
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white" style={{ borderRadius: '16px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="hanko-stamp">
              チップ記録
            </span>
            <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0 fw-bold">
              OPERACIONES DIARIAS
            </span>
          </div>
          <h4 className="fw-bold mb-1 text-slate-900 d-flex align-items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
            <i className="bi bi-pencil-square text-danger"></i>
            <span>Captura y Registro de Propinas</span>
            <span className="text-danger-subtle" style={{ fontSize: '1rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>配分計算</span>
          </h4>
          <p className="text-secondary small mb-0">
            Prorrateo automatizado por horas efectivas según regla legal: 60% Salón (フロア) y 40% Cocina (厨房).
          </p>
        </div>
        <span className="badge bg-white text-secondary border px-3 py-2 shadow-xs">
          <i className="bi bi-clock-history text-danger me-1"></i> Múltiples turnos por día permitidos
        </span>
      </div>

      {/* Pestañas de Navegación Segmentada */}
      <div className="d-flex mb-4 border-bottom pb-2">
        <ul className="nav nav-tabs border-0 gap-2 mb-0">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${subTab === 'captura' ? 'active' : ''}`}
              onClick={() => setSubTab('captura')}
            >
              <i className="bi bi-calendar2-check me-1"></i> Capturar Nuevo Registro
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${subTab === 'historial' ? 'active' : ''}`}
              onClick={() => {
                setSubTab('historial');
                cargarHistorial();
              }}
            >
              <i className="bi bi-clock-history me-1"></i> Historial y Corrección
              {pendientesCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-2">{pendientesCount}</span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Sub-vista 1: Captura */}
      {subTab === 'captura' && (
        <form onSubmit={handleGuardarRegistro}>
          <div className="p-3 bg-light rounded-3 border mb-4">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small fw-bold text-slate-700">Fecha del Registro</label>
                <div className="input-group">
                  <span className="input-group-text bg-white text-secondary border-end-0">
                    <i className="bi bi-calendar3"></i>
                  </span>
                  <input
                    type="date"
                    className="form-control border-start-0"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-bold text-slate-700">Monto Total Recaudado (S/)</label>
                <div className="input-group">
                  <span className="input-group-text bg-white text-primary border-end-0 fw-bold">
                    S/
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-control border-start-0 fw-bold text-primary font-mono"
                    placeholder="0.00"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Banner de Detección de Múltiples Turnos en la misma fecha */}
            {(() => {
              const turnosActivosEnFecha = historial.filter(
                (h) => h.fecha === fecha && h.estado === 'Activo'
              );
              if (turnosActivosEnFecha.length === 0) return null;
              return (
                <div className="alert alert-info py-2 px-3 mt-3 mb-0 d-flex align-items-center gap-2 small border border-info-subtle rounded-3">
                  <i className="bi bi-info-circle-fill text-info fs-5 flex-shrink-0"></i>
                  <div>
                    <strong>Turnos Múltiples en esta fecha:</strong> Ya existe {turnosActivosEnFecha.length} turno(s) activo(s) registrado(s) para el <strong>{fecha}</strong>{' '}
                    ({turnosActivosEnFecha.map((t: any) => `Turno ${t.turnoNumero || 1}: S/ ${t.montoTotal.toFixed(2)}${t.createdAt ? ` [${formatHoraRegistro(t.createdAt)}]` : ''}`).join(', ')}).
                    <div className="text-secondary mt-1" style={{ fontSize: '0.78rem' }}>
                      Este nuevo registro se guardará como <strong>Turno {turnosActivosEnFecha.length + 1} independiente</strong> para esta fecha. Podrás anular o gestionar cualquiera de los turnos de forma independiente en el <em>Historial</em>, y en la liquidación final se unificarán automáticamente.
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Selector de Modalidad de Distribución de Fondos */}
          <div className="card border-0 shadow-xs mb-4 p-3 bg-light rounded-3">
            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <div>
                <label className="form-label small fw-bold text-slate-800 mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-sliders text-danger"></i>
                  <span>Modalidad de Distribución de Propinas</span>
                </label>
                <span className="text-secondary small d-block" style={{ fontSize: '0.8rem' }}>
                  Por defecto, todas las tiendas operan con el Sistema Regular 60% Salón / 40% Cocina.
                </span>
              </div>
              {modoDistribucion === 'equitativo' ? (
                <span className="badge bg-danger text-white border border-danger fw-bold px-2 py-1">
                  <i className="bi bi-people-fill me-1"></i> Modo Especial: Reparto Equitativo Activo
                </span>
              ) : (
                <span className="badge bg-success-subtle text-success border border-success-subtle fw-semibold px-2 py-1">
                  <i className="bi bi-shield-check me-1"></i> Sistema Regular 60% / 40% (Predeterminado)
                </span>
              )}
            </div>

            <div className="row g-2 mb-2">
              {/* Opción 1: Regular 60/40 */}
              <div className="col-12 col-md-6">
                <div
                  className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                    modoDistribucion === '60_40'
                      ? 'bg-white border-primary shadow-xs'
                      : 'bg-white bg-opacity-50 border-secondary-subtle opacity-75'
                  }`}
                  style={{
                    cursor: 'pointer',
                    borderLeft: modoDistribucion === '60_40' ? '4px solid #0d6efd' : undefined,
                  }}
                  onClick={() => {
                    setModoDistribucion('60_40');
                  }}
                >
                  <div className="form-check d-flex align-items-start gap-2 mb-0">
                    <input
                      className="form-check-input mt-1"
                      type="radio"
                      name="modoDistribucion"
                      id="modoReg6040"
                      checked={modoDistribucion === '60_40'}
                      onChange={() => setModoDistribucion('60_40')}
                    />
                    <label className="form-check-label w-100 cursor-pointer" htmlFor="modoReg6040" style={{ cursor: 'pointer' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <strong className="text-slate-900">Sistema Regular (60% / 40%)</strong>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                          Estándar Ley
                        </span>
                      </div>
                      <div className="text-secondary small mt-1" style={{ fontSize: '0.78rem' }}>
                        60% Salón y 40% Cocina. Modalidad oficial predeterminada de la empresa para todas las tiendas.
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Opción 2: Especial Equitativo */}
              <div className="col-12 col-md-6">
                <div
                  className={`p-3 rounded-3 border h-100 cursor-pointer transition-all ${
                    modoDistribucion === 'equitativo'
                      ? 'bg-white border-danger shadow-xs'
                      : 'bg-white bg-opacity-50 border-secondary-subtle opacity-75'
                  }`}
                  style={{
                    cursor: 'pointer',
                    borderLeft: modoDistribucion === 'equitativo' ? '4px solid #dc2626' : undefined,
                  }}
                  onClick={() => {
                    setModoDistribucion('equitativo');
                  }}
                >
                  <div className="form-check d-flex align-items-start gap-2 mb-0">
                    <input
                      className="form-check-input mt-1"
                      type="radio"
                      name="modoDistribucion"
                      id="modoEspEquitativo"
                      checked={modoDistribucion === 'equitativo'}
                      onChange={() => setModoDistribucion('equitativo')}
                    />
                    <label className="form-check-label w-100 cursor-pointer" htmlFor="modoEspEquitativo" style={{ cursor: 'pointer' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <strong className="text-danger">Modo Especial (Reparto Equitativo)</strong>
                        <span className="badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold">
                          Requiere Justificación
                        </span>
                      </div>
                      <div className="text-secondary small mt-1" style={{ fontSize: '0.78rem' }}>
                        Reparto equitativo entre todo el personal (ej: S/ 100 entre 3 salón y 2 cocina = S/ 20 para cada trabajador). Requiere justificación obligatoria.
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Campo Justificación Obligatoria cuando se elige equitativo */}
            {modoDistribucion === 'equitativo' && (
              <div className="mt-2 p-3 bg-danger bg-opacity-10 rounded-3 border border-danger border-opacity-25">
                <div className="d-flex align-items-center gap-2 mb-2 text-danger fw-bold small">
                  <i className="bi bi-pencil-fill"></i>
                  <span>Justificación Obligatoria del Modo Especial Equitativo *</span>
                </div>
                <p className="text-secondary small mb-2" style={{ fontSize: '0.8rem' }}>
                  Por políticas de control corporativo, debes justificar por qué se utilizó el reparto equitativo entre todo el personal en este turno (ej. acuerdo extraordinario de equipo, jornada especial, evento con apoyo cruzado, etc.).
                </p>
                <textarea
                  className="form-control form-control-sm border-danger-subtle"
                  rows={2}
                  placeholder="Escribe aquí la justificación obligatoria del por qué se utilizó el reparto equitativo entre todo el personal..."
                  value={justificacionModo}
                  onChange={(e) => setJustificacionModo(e.target.value)}
                  required
                ></textarea>
                {!justificacionModo.trim() && (
                  <span className="text-danger small mt-1 d-block fw-semibold" style={{ fontSize: '0.75rem' }}>
                    * Campo requerido para poder congelar y registrar las propinas en modo equitativo.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Banner de Reparto Equitativo si está activo */}
          {esEquitativo && (
            <div className="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2 small border border-danger-subtle rounded-3">
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-people-fill fs-5 text-danger"></i>
                <div>
                  <strong className="text-danger">Bolsa Común Equitativa Activa:</strong> El total de S/ {monto.toFixed(2)} se reparte de forma equitativa entre los {activosSalon + activosCocina} trabajadores activos ({totalHorasGlobal.toFixed(1)} hrs en total).
                </div>
              </div>
              {(activosSalon + activosCocina) > 0 && (
                <span className="badge bg-danger text-white px-2 py-1 font-mono fs-6 shadow-xs">
                  ~S/ {(monto / (activosSalon + activosCocina)).toFixed(2)} c/u (horas completas)
                </span>
              )}
            </div>
          )}

          {/* Resumen de Fondos por Área Bento Cards */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div
                className="p-3 rounded-3 border bg-white d-flex justify-content-between align-items-center shadow-xs"
                style={{ borderLeft: esEquitativo ? '5px solid #dc2626 !important' : '5px solid #10b981 !important' }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge ${esEquitativo ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'} px-2 py-0 fw-bold small`}>
                      {esEquitativo ? 'SALÓN (REPARTO EQUITATIVO)' : 'FONDO SALÓN (60%)'}
                    </span>
                    <i className="bi bi-shop text-success"></i>
                    {esEquitativo && (
                      <span className="badge bg-secondary-subtle text-dark border small" style={{ fontSize: '0.68rem' }}>
                        {activosSalon} colab.
                      </span>
                    )}
                  </div>
                  <div className="text-secondary small">
                    Total Horas Salón: <span className="fw-bold font-mono text-dark">{totalHorasSalon.toFixed(1)}</span> hrs
                  </div>
                </div>
                <div className="text-end">
                  <div className="fw-bold text-success fs-4 font-mono">
                    S/ {fondoSalon.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div
                className="p-3 rounded-3 border bg-white d-flex justify-content-between align-items-center shadow-xs"
                style={{ borderLeft: esEquitativo ? '5px solid #dc2626 !important' : '5px solid #f59e0b !important' }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge ${esEquitativo ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'} px-2 py-0 fw-bold small`}>
                      {esEquitativo ? 'COCINA (REPARTO EQUITATIVO)' : 'FONDO COCINA (40%)'}
                    </span>
                    <i className="bi bi-fire text-warning"></i>
                    {esEquitativo && (
                      <span className="badge bg-secondary-subtle text-dark border small" style={{ fontSize: '0.68rem' }}>
                        {activosCocina} colab.
                      </span>
                    )}
                  </div>
                  <div className="text-secondary small">
                    Total Horas Cocina: <span className="fw-bold font-mono text-dark">{totalHorasCocina.toFixed(1)}</span> hrs
                  </div>
                </div>
                <div className="text-end">
                  <div className="fw-bold text-warning-emphasis fs-4 font-mono">
                    S/ {fondoCocina.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Asistencia y Distribución */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h6 className="fw-bold mb-0 text-slate-900">
                <i className="bi bi-people-fill text-primary me-2"></i>
                Plantilla del Personal para este Turno
              </h6>
              <span className="text-secondary small">
                Personal activo cargado de la sede. Desactiva para marcar colaboradores en <strong>descanso o ausencia</strong>.
              </span>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm shadow-xs"
                onClick={() => handleMarcarTodos(true)}
              >
                <i className="bi bi-check-all me-1"></i> Todos Laborando
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm shadow-xs"
                onClick={cargarPlantillaPersonal}
                title="Sincronizar cambios de personal"
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Recargar
              </button>
            </div>
          </div>

          <div className="table-responsive mb-4 shadow-xs" style={{ borderRadius: '12px' }}>
            <table className="table table-hover align-middle small mb-0">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Estado en Turno</th>
                  <th style={{ width: '33%' }}>Colaborador</th>
                  <th style={{ width: '15%' }}>Área Asignada</th>
                  <th style={{ width: '15%' }}>Horas Laboradas</th>
                  <th style={{ width: '15%' }} className="text-end">Propina Asignada</th>
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
                    const infoGrupo = getAreaGroup(c.area, modoDistribucion);

                    const prevWorker = idx > 0 ? colaboradores[idx - 1] : null;
                    const prevGrupo = prevWorker ? getAreaGroup(prevWorker.area, modoDistribucion) : null;
                    const mostrarCabeceraGrupo = idx === 0 || infoGrupo.groupKey !== prevGrupo?.groupKey;

                    return (
                      <React.Fragment key={c.nombre}>
                        {mostrarCabeceraGrupo && (
                          <tr className="table-light">
                            <td
                              colSpan={5}
                              className={`py-2 px-3 fw-bold border-top border-bottom ${infoGrupo.headerClass}`}
                            >
                              <div className="d-flex align-items-center justify-content-between">
                                <span className="d-flex align-items-center gap-2">
                                  <i className={`bi ${infoGrupo.iconClass}`}></i>
                                  <span>{infoGrupo.groupTitle}</span>
                                </span>
                                {infoGrupo.fondoBadge && (
                                  <span
                                    className={`badge ${infoGrupo.badgeClass}`}
                                    style={{ fontSize: '0.72rem' }}
                                  >
                                    {infoGrupo.fondoBadge}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr
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
                                style={{ cursor: 'pointer' }}
                              />
                              <label
                                className={`form-check-label small fw-semibold user-select-none ${
                                  c.activo ? 'text-success' : 'text-muted'
                                }`}
                                htmlFor={`sw_${idx}`}
                                style={{ cursor: 'pointer' }}
                              >
                                {c.activo ? (
                                  <>
                                    <i className="bi bi-check-circle-fill me-1"></i>Laborando
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
                                  : infoGrupo.groupKey === 'salon'
                                  ? 'bg-success-subtle text-success border border-success-subtle'
                                  : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                              }`}
                            >
                              {c.area}
                            </span>
                          </td>
                          <td>
                            <div className="input-group input-group-sm" style={{ maxWidth: '120px' }}>
                              <input
                                type="number"
                                step="0.5"
                                min={c.activo ? '0.5' : '0'}
                                max="24"
                                className="form-control form-control-sm font-mono text-center"
                                value={c.horas}
                                disabled={!c.activo}
                                onChange={(e) => handleHorasChange(idx, parseFloat(e.target.value) || 0)}
                                required={c.activo}
                              />
                              <span className="input-group-text small text-secondary">hrs</span>
                            </div>
                          </td>
                          <td className="text-end">
                            <div
                              className={`fw-bold font-mono ${
                                c.activo ? 'text-success fs-6' : 'text-muted small'
                              }`}
                            >
                              {c.activo ? `S/ ${propina.toFixed(2)}` : 'S/ 0.00'}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2">
            <span className="text-secondary small">
              <i className="bi bi-info-circle text-primary me-1"></i>
              Los cálculos se congelan automáticamente al momento de registrar.
            </span>
            <button
              type="submit"
              className="btn btn-primary px-4 py-2 fs-6 fw-bold shadow-xs rounded-3"
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
                  <th style={{ width: '9%' }}>ID Reg.</th>
                  <th style={{ width: '18%' }}>Fecha y Turno</th>
                  <th style={{ width: '13%' }}>Monto Total</th>
                  <th style={{ width: '16%' }}>Fondo Salón / Cocina</th>
                  <th style={{ width: '13%' }}>Personal</th>
                  <th style={{ width: '12%' }}>Estado</th>
                  <th style={{ width: '19%', textAlign: 'center' }}>Acciones / Anulación</th>
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
                          <strong className="text-slate-900">#{r.idRegistro}</strong>
                        </td>
                        <td>
                          <div className="fw-bold text-slate-800">
                            <i className="bi bi-calendar3 me-1 text-primary"></i>
                            {r.fecha}
                          </div>
                          <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                            {r.createdAt && (
                              <span className="badge bg-light text-secondary border font-mono" style={{ fontSize: '0.72rem' }}>
                                <i className="bi bi-clock me-1"></i>{formatHoraRegistro(r.createdAt)}
                              </span>
                            )}
                            {r.turnosEnFecha > 1 ? (
                              <span
                                className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold"
                                style={{ fontSize: '0.72rem' }}
                                title={`Hay ${r.turnosEnFecha} turnos independientes en la fecha ${r.fecha}`}
                              >
                                <i className="bi bi-layers-fill me-1"></i>Turno {r.turnoNumero} de {r.turnosEnFecha}
                              </span>
                            ) : (
                              <span className="badge bg-light text-muted border" style={{ fontSize: '0.72rem' }}>
                                Turno Único
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="fw-bold text-primary font-mono fs-6">S/ {r.montoTotal.toFixed(2)}</td>
                        <td>
                          <div className="d-flex align-items-center gap-1 mb-1">
                            {r.justificacion?.includes('Equitativo') || r.justificacion?.includes('50/50') ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle small fw-bold">
                                <i className="bi bi-people-fill me-1"></i>Reparto Equitativo Especial
                              </span>
                            ) : (
                              <span className="badge bg-light text-secondary border small">
                                60% / 40% Regular
                              </span>
                            )}
                          </div>
                          <small className="text-success font-mono">
                            Salón: S/ {r.fondoSalon.toFixed(2)}
                          </small>
                          <br />
                          <small className="text-warning font-mono">
                            Cocina: S/ {r.fondoCocina.toFixed(2)}
                          </small>
                        </td>
                        <td>
                          <div>
                            <span className="fw-semibold text-dark">{r.cantParticipantes} colab.</span>
                            {r.detalles && r.detalles.length > 0 && (
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-0 px-2 mt-1 d-block"
                                style={{ fontSize: '0.74rem' }}
                                onClick={() => setModalDetalleReg({ show: true, registro: r })}
                                title="Ver personal registrado en este turno"
                              >
                                <i className="bi bi-people-fill me-1 text-primary"></i>Ver Nómina
                              </button>
                            )}
                          </div>
                        </td>
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
                            <>
                              {r.justificacion && (
                                <button
                                  type="button"
                                  className="btn btn-outline-info btn-sm py-0 px-2 me-1"
                                  title="Ver justificación registrada para este registro"
                                  onClick={() =>
                                    setModalVerJust({
                                      show: true,
                                      idReg: r.idRegistro,
                                      justificacion: r.justificacion,
                                      validador: r.validador || 'Modo Especial Equitativo',
                                    })
                                  }
                                >
                                  <i className="bi bi-chat-left-text me-1"></i>Justificación
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm py-0 px-2 me-1"
                                title="Editar colaboradores y horas de este turno"
                                onClick={() => handleAbrirEditar(r)}
                              >
                                <i className="bi bi-pencil-square me-1"></i>Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-warning btn-sm py-0 px-2"
                                title="Anular únicamente este turno específico"
                                onClick={() =>
                                  setModalAnular({
                                    show: true,
                                    idReg: r.idRegistro,
                                    fecha: r.fecha,
                                    monto: r.montoTotal,
                                    hora: formatHoraRegistro(r.createdAt),
                                    turnoNumero: r.turnoNumero,
                                    turnosEnFecha: r.turnosEnFecha,
                                    justificacion: '',
                                  })
                                }
                              >
                                <i className="bi bi-slash-circle me-1"></i>Anular Turno
                              </button>
                            </>
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
                    Anular / Corregir Turno de Propinas
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() =>
                      setModalAnular({ show: false, idReg: 0, fecha: '', monto: 0, hora: '', turnoNumero: 1, turnosEnFecha: 1, justificacion: '' })
                    }
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded border mb-3 small">
                    <div className="d-flex justify-content-between mb-1">
                      <strong>Turno a Anular:</strong>
                      <span className="badge bg-danger fs-6">Registro #{modalAnular.idReg}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Fecha del Turno:</span>
                      <strong>{modalAnular.fecha} {modalAnular.hora ? `(${modalAnular.hora})` : ''}</strong>
                    </div>
                    {modalAnular.turnosEnFecha && modalAnular.turnosEnFecha > 1 ? (
                      <div className="d-flex justify-content-between mb-1">
                        <span>Orden del Turno:</span>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle fw-bold">
                          Turno {modalAnular.turnoNumero} de {modalAnular.turnosEnFecha} del día
                        </span>
                      </div>
                    ) : null}
                    <div className="d-flex justify-content-between mb-2">
                      <span>Monto Recaudado en este Turno:</span>
                      <strong className="text-danger font-mono fs-6">S/ {modalAnular.monto.toFixed(2)}</strong>
                    </div>
                    <div className="alert alert-warning py-1 px-2 mb-0 border small text-dark" style={{ fontSize: '0.78rem' }}>
                      <i className="bi bi-shield-check text-warning-emphasis me-1"></i>
                      <strong>Anulación Quirúrgica:</strong> Solo se anulará este registro específico (#{modalAnular.idReg}). Los demás turnos registrados en la fecha <strong>{modalAnular.fecha}</strong> permanecerán activos e intactos.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-danger">
                      Motivo o Justificación Obligatoria de la Anulación *
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Indique claramente la razón por la que se anula este turno específico..."
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
                        confirmar, el turno quedará <strong>ANULADO</strong> y excluido formalmente.
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
                      setModalAnular({ show: false, idReg: 0, fecha: '', monto: 0, hora: '', turnoNumero: 1, turnosEnFecha: 1, justificacion: '' })
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

      {/* Modal Ver Nómina / Personal del Turno */}
      {modalDetalleReg.show && modalDetalleReg.registro && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-dark text-white">
                  <div>
                    <h6 className="modal-title fw-bold mb-0">
                      <i className="bi bi-card-checklist me-2 text-danger"></i>
                      Personal y Nómina del Turno #{modalDetalleReg.registro.idRegistro}
                    </h6>
                    <small className="text-white-50">
                      Fecha: {modalDetalleReg.registro.fecha}
                      {modalDetalleReg.registro.createdAt && ` • Hora: ${formatHoraRegistro(modalDetalleReg.registro.createdAt)}`}
                      {modalDetalleReg.registro.turnosEnFecha > 1 && ` • Turno ${modalDetalleReg.registro.turnoNumero} de ${modalDetalleReg.registro.turnosEnFecha}`}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalDetalleReg({ show: false, registro: null })}
                  ></button>
                </div>
                <div className="modal-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded border flex-wrap gap-2">
                    <div>
                      <span className="text-secondary small">Monto Recaudado en Turno:</span>
                      <div className="fw-bold fs-5 text-primary font-mono">
                        S/ {modalDetalleReg.registro.montoTotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="text-secondary small">Distribución de Fondos:</span>
                      <div className="small font-mono">
                        <span className="text-success fw-semibold">Salón: S/ {modalDetalleReg.registro.fondoSalon.toFixed(2)}</span>
                        <span className="mx-2 text-muted">|</span>
                        <span className="text-warning-emphasis fw-semibold">Cocina: S/ {modalDetalleReg.registro.fondoCocina.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '8%' }}>N°</th>
                          <th style={{ width: '38%' }}>Colaborador</th>
                          <th style={{ width: '22%' }}>Área</th>
                          <th style={{ width: '16%' }} className="text-center">Horas</th>
                          <th style={{ width: '16%' }} className="text-end">Propina Asignada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!modalDetalleReg.registro.detalles || modalDetalleReg.registro.detalles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-3">
                              No hay participantes detallados registrados para este turno.
                            </td>
                          </tr>
                        ) : (
                          modalDetalleReg.registro.detalles.map((d: any, idx: number) => {
                            const esSalon = (d.area || '').includes('Salón');
                            return (
                              <tr key={idx}>
                                <td className="text-muted">{idx + 1}</td>
                                <td><strong className="text-dark">{d.colaborador}</strong></td>
                                <td>
                                  <span
                                    className={`badge ${
                                      esSalon
                                        ? 'bg-success-subtle text-success border border-success-subtle'
                                        : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                    }`}
                                  >
                                    {d.area}
                                  </span>
                                </td>
                                <td className="text-center font-mono">{d.horas} hrs</td>
                                <td className="text-end font-mono fw-bold text-success">
                                  S/ {Number(d.propina || 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="table-light fw-bold">
                          <td colSpan={3} className="text-end">TOTALES DEL TURNO:</td>
                          <td className="text-center font-mono">
                            {modalDetalleReg.registro.detalles?.reduce((acc: number, cur: any) => acc + (cur.horas || 0), 0) || 0} hrs
                          </td>
                          <td className="text-end font-mono text-primary">
                            S/ {modalDetalleReg.registro.montoTotal.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
                <div className="modal-footer d-flex justify-content-between">
                  <div>
                    {modalDetalleReg.registro.estado === 'Activo' && (
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            const reg = modalDetalleReg.registro;
                            setModalDetalleReg({ show: false, registro: null });
                            handleAbrirEditar(reg);
                          }}
                        >
                          <i className="bi bi-pencil-square me-1"></i> Editar Turno (#{modalDetalleReg.registro.idRegistro})
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            const reg = modalDetalleReg.registro;
                            setModalDetalleReg({ show: false, registro: null });
                            setModalAnular({
                              show: true,
                              idReg: reg.idRegistro,
                              fecha: reg.fecha,
                              monto: reg.montoTotal,
                              hora: formatHoraRegistro(reg.createdAt),
                              turnoNumero: reg.turnoNumero,
                              turnosEnFecha: reg.turnosEnFecha,
                              justificacion: '',
                            });
                          }}
                        >
                          <i className="bi bi-slash-circle me-1"></i> Anular solo este Turno (#{modalDetalleReg.registro.idRegistro})
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setModalDetalleReg({ show: false, registro: null })}
                  >
                    Cerrar
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
                <div
                  className={`modal-header ${
                    modalVerJust.justificacion?.includes('Equitativo') || modalVerJust.justificacion?.includes('50/50') ? 'bg-danger' : 'bg-secondary'
                  } text-white`}
                >
                  <h6 className="modal-title fw-bold">
                    {modalVerJust.justificacion?.includes('Equitativo') || modalVerJust.justificacion?.includes('50/50') ? (
                      <>
                        <i className="bi bi-people-fill me-2"></i>
                        Justificación de Modo Especial Equitativo - Registro #{modalVerJust.idReg}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-info-circle me-2"></i>
                        Detalle de Registro / Anulación - Registro #{modalVerJust.idReg}
                      </>
                    )}
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
                    <label className="small text-muted fw-bold">
                      {modalVerJust.justificacion?.includes('Equitativo') || modalVerJust.justificacion?.includes('50/50')
                        ? 'Justificación Registrada del Reparto Equitativo:'
                        : 'Motivo Registrado:'}
                    </label>
                    <div className="p-3 bg-light rounded border small text-dark">
                      {modalVerJust.justificacion || '(Sin justificación detallada)'}
                    </div>
                  </div>
                  <div>
                    <label className="small text-muted fw-bold">Responsable / Origen:</label>
                    <div className="small fw-semibold text-primary">
                      {modalVerJust.validador || '(Registro Directo)'}
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

      {/* Modal Editar Turno (Personal y Horas con Recálculo Automático) */}
      {modalEditar.show && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div className="modal-header bg-dark text-white py-3">
                  <div>
                    <h6 className="modal-title fw-bold mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-pencil-square text-warning fs-5"></i>
                      <span>Editar Personal y Horas del Turno #{modalEditar.idReg}</span>
                      <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-2">
                        Recálculo Automático
                      </span>
                    </h6>
                    <small className="text-white-50">
                      Fecha: <strong>{modalEditar.fecha}</strong>
                      {modalEditar.createdAt && ` • Hora: ${formatHoraRegistro(modalEditar.createdAt)}`}
                      {modalEditar.turnosEnFecha && modalEditar.turnosEnFecha > 1 && ` • Turno ${modalEditar.turnoNumero} de ${modalEditar.turnosEnFecha}`}
                      {' • Monto Original: '}
                      <span className="text-warning font-mono fw-bold">S/ {modalEditar.montoTotal.toFixed(2)}</span>
                    </small>
                  </div>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() =>
                      setModalEditar({
                        show: false,
                        idReg: 0,
                        fecha: '',
                        montoTotal: 0,
                        modoDistribucion: '60_40',
                        colaboradores: [],
                        justificacion: '',
                      })
                    }
                  ></button>
                </div>

                <div className="modal-body p-3 p-md-4">
                  {/* Banner Explicativo */}
                  <div className="alert alert-primary bg-primary-subtle text-primary-emphasis border border-primary-subtle py-2 px-3 mb-3 d-flex align-items-center gap-2 small rounded-3">
                    <i className="bi bi-info-circle-fill fs-5 text-primary"></i>
                    <div>
                      <strong>Actualización de Nómina y Horas:</strong> Puedes activar o desactivar trabajadores (incluyendo apoyos registrados con posterioridad) y ajustar sus horas laboradas. Las propinas de este turno se recalculan de forma proporcional e instantánea manteniendo intacto el monto recaudado de <strong>S/ {modalEditar.montoTotal.toFixed(2)}</strong>.
                    </div>
                  </div>

                  {/* Tarjetas de Resumen en Tiempo Real */}
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 border text-center">
                        <span className="text-secondary small d-block">Monto Recaudado</span>
                        <span className="fs-5 fw-bold font-mono text-dark">
                          S/ {modalEditar.montoTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-success-subtle rounded-3 border border-success-subtle text-center">
                        <span className="text-success small fw-semibold d-block">
                          Fondo Salón ({esEquitativoEdit ? 'Equitativo' : '60%'})
                        </span>
                        <span className="fs-5 fw-bold font-mono text-success">
                          S/ {editFondoSalon.toFixed(2)}
                        </span>
                        <div className="text-secondary small" style={{ fontSize: '0.72rem' }}>
                          {editActivosSalon} colab. • {editTotalHorasSalon.toFixed(1)} hrs
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-warning-subtle rounded-3 border border-warning-subtle text-center">
                        <span className="text-warning-emphasis small fw-semibold d-block">
                          Fondo Cocina ({esEquitativoEdit ? 'Equitativo' : '40%'})
                        </span>
                        <span className="fs-5 fw-bold font-mono text-warning-emphasis">
                          S/ {editFondoCocina.toFixed(2)}
                        </span>
                        <div className="text-secondary small" style={{ fontSize: '0.72rem' }}>
                          {editActivosCocina} colab. • {editTotalHorasCocina.toFixed(1)} hrs
                        </div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="p-2 p-md-3 bg-light rounded-3 border text-center">
                        <span className="text-secondary small d-block">Personal Activo</span>
                        <span className="fs-5 fw-bold font-mono text-primary">
                          {editActivosSalon + editActivosCocina} trab.
                        </span>
                        <div className="text-secondary small" style={{ fontSize: '0.72rem' }}>
                          {editTotalHorasGlobal.toFixed(1)} hrs totales
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <span className="small text-secondary fw-semibold">
                      <i className="bi bi-people me-1"></i> Lista completa de trabajadores y apoyos registrados:
                    </span>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm py-0 px-2"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => handleMarcarTodosEditar(true)}
                      >
                        <i className="bi bi-check-all me-1"></i> Activar Todos
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm py-0 px-2"
                        style={{ fontSize: '0.78rem' }}
                        onClick={() => handleMarcarTodosEditar(false)}
                      >
                        <i className="bi bi-x-circle me-1"></i> Desactivar Todos
                      </button>
                    </div>
                  </div>

                  {/* Tabla de Edición de Trabajadores */}
                  <div className="table-responsive shadow-xs mb-3" style={{ maxHeight: '360px', overflowY: 'auto', borderRadius: '10px' }}>
                    <table className="table table-hover table-sm align-middle small mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: '18%' }}>Estado en Turno</th>
                          <th style={{ width: '32%' }}>Colaborador</th>
                          <th style={{ width: '16%' }}>Área</th>
                          <th style={{ width: '18%' }}>Horas Laboradas</th>
                          <th style={{ width: '16%' }} className="text-end">Propina Recalculada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalEditar.colaboradores.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-4">
                              No hay colaboradores disponibles.
                            </td>
                          </tr>
                        ) : (
                          modalEditar.colaboradores.map((c, idx) => {
                            const propina = getEditPropinaCalculada(c);
                            const esApoyo = c.area.toLowerCase().includes('apoyo');
                            const infoGrupo = getAreaGroup(c.area, modalEditar.modoDistribucion);

                            const prevWorker = idx > 0 ? modalEditar.colaboradores[idx - 1] : null;
                            const prevGrupo = prevWorker ? getAreaGroup(prevWorker.area, modalEditar.modoDistribucion) : null;
                            const mostrarCabecera = idx === 0 || infoGrupo.groupKey !== prevGrupo?.groupKey;

                            return (
                              <React.Fragment key={c.nombre}>
                                {mostrarCabecera && (
                                  <tr className="table-light">
                                    <td
                                      colSpan={5}
                                      className={`py-1 px-3 fw-bold border-top border-bottom ${infoGrupo.headerClass}`}
                                      style={{ fontSize: '0.78rem' }}
                                    >
                                      <div className="d-flex align-items-center justify-content-between">
                                        <span className="d-flex align-items-center gap-2">
                                          <i className={`bi ${infoGrupo.iconClass}`}></i>
                                          <span>{infoGrupo.groupTitle}</span>
                                        </span>
                                        {infoGrupo.fondoBadge && (
                                          <span className={`badge ${infoGrupo.badgeClass}`} style={{ fontSize: '0.68rem' }}>
                                            {infoGrupo.fondoBadge}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                <tr className={!c.activo ? 'table-light opacity-50' : ''}>
                                  <td>
                                    <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={c.activo}
                                        onChange={() => handleToggleEditarAsistencia(idx)}
                                        id={`sw_edit_${idx}`}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      <label
                                        className={`form-check-label small fw-semibold user-select-none ${
                                          c.activo ? 'text-success' : 'text-muted'
                                        }`}
                                        htmlFor={`sw_edit_${idx}`}
                                        style={{ cursor: 'pointer', fontSize: '0.76rem' }}
                                      >
                                        {c.activo ? 'Laborando' : 'Inactivo'}
                                      </label>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-1 flex-wrap">
                                      <strong className="text-dark">{c.nombre}</strong>
                                      {esApoyo && (
                                        <span className="badge bg-warning text-dark border border-warning" style={{ fontSize: '0.68rem' }}>
                                          <i className="bi bi-star-fill me-1"></i>Apoyo
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`badge ${
                                        esApoyo
                                          ? 'bg-warning-subtle text-dark border border-warning'
                                          : infoGrupo.groupKey === 'salon'
                                          ? 'bg-success-subtle text-success border border-success-subtle'
                                          : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                                      }`}
                                      style={{ fontSize: '0.72rem' }}
                                    >
                                      {c.area}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="d-flex align-items-center gap-1">
                                      <div className="input-group input-group-sm" style={{ width: '90px' }}>
                                        <input
                                          type="number"
                                          step="0.5"
                                          min={c.activo ? '0.5' : '0'}
                                          max="24"
                                          className="form-control form-control-sm font-mono text-center px-1"
                                          value={c.horas}
                                          disabled={!c.activo}
                                          onChange={(e) =>
                                            handleChangeEditarHoras(idx, parseFloat(e.target.value) || 0)
                                          }
                                        />
                                        <span className="input-group-text px-1 small text-secondary" style={{ fontSize: '0.72rem' }}>
                                          h
                                        </span>
                                      </div>
                                      {c.activo && (
                                        <div className="btn-group btn-group-sm">
                                          {[12, 8, 6, 4].map((hVal) => (
                                            <button
                                              key={hVal}
                                              type="button"
                                              className={`btn btn-xs py-0 px-1 border ${
                                                c.horas === hVal ? 'btn-primary text-white' : 'btn-light text-secondary'
                                              }`}
                                              style={{ fontSize: '0.68rem' }}
                                              onClick={() => handleChangeEditarHoras(idx, hVal)}
                                              title={`Fijar a ${hVal} horas`}
                                            >
                                              {hVal}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-end font-mono">
                                    {c.activo ? (
                                      <strong className="text-success fs-6">
                                        S/ {propina.toFixed(2)}
                                      </strong>
                                    ) : (
                                      <span className="text-muted small">S/ 0.00</span>
                                    )}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Justificación Obligatoria */}
                  <div className="p-3 bg-light rounded-3 border">
                    <label className="form-label small fw-bold text-danger mb-1 d-flex align-items-center gap-1">
                      <i className="bi bi-shield-check"></i>
                      <span>Justificación Obligatoria de la Modificación *</span>
                    </label>
                    <p className="text-secondary small mb-2" style={{ fontSize: '0.78rem' }}>
                      Indica detalladamente el motivo del cambio (ej: se incluyó al colaborador de apoyo Juan Pérez que trabajó en este turno y no estaba en el sistema, y se ajustaron horas de Ana a 8 hrs). Este registro se conservará de forma inmutable en el historial y en la auditoría.
                    </p>
                    <textarea
                      className="form-control form-control-sm border-danger-subtle"
                      rows={2}
                      placeholder="Escribe aquí la justificación obligatoria del cambio..."
                      value={modalEditar.justificacion}
                      onChange={(e) =>
                        setModalEditar((prev) => ({ ...prev, justificacion: e.target.value }))
                      }
                      required
                    ></textarea>
                    {!modalEditar.justificacion.trim() && (
                      <span className="text-danger small mt-1 d-block fw-semibold" style={{ fontSize: '0.74rem' }}>
                        * La justificación es obligatoria para poder guardar y recalcular el turno.
                      </span>
                    )}
                  </div>
                </div>

                <div className="modal-footer d-flex justify-content-between py-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setModalEditar({
                        show: false,
                        idReg: 0,
                        fecha: '',
                        montoTotal: 0,
                        modoDistribucion: '60_40',
                        colaboradores: [],
                        justificacion: '',
                      })
                    }
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm px-3 fw-bold shadow-xs"
                    disabled={cargando || !modalEditar.justificacion.trim() || editTotalHorasGlobal <= 0}
                    onClick={handleConfirmarEdicion}
                  >
                    {cargando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1"></i> Guardar Cambios y Recalcular
                      </>
                    )}
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
