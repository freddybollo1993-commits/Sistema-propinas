'use client';

import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { SessionUser } from '@/lib/auth';

interface ModCentralNeuralgicaProps {
  currentUser: SessionUser | null;
  onSelectTienda?: (tiendaId: string) => void;
}

const COLORES_SEDES = [
  '#0284c7', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4',
  '#a855f7', '#d946ef', '#64748b', '#0ea5e9', '#10b981',
  '#d97706', '#dc2626', '#475569', '#2563eb', '#16a34a',
  '#9333ea', '#db2777'
];

export default function ModCentralNeuralgica({ currentUser, onSelectTienda }: ModCentralNeuralgicaProps) {
  const [tabActivo, setTabActivo] = useState<'dashboard' | 'bi'>('dashboard');
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<any>(null);

  // Filtros generales
  const [filtroSede, setFiltroSede] = useState('');
  const [fInicio, setFInicio] = useState('');
  const [fFin, setFFin] = useState('');
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [selectorPeriodo, setSelectorPeriodo] = useState('ultimos30');

  // Modal Auditoría Sanciones
  const [modalSancionesSede, setModalSancionesSede] = useState<any | null>(null);

  // Modal Directorio Sedes
  const [modalDirectorioOpen, setModalDirectorioOpen] = useState(false);

  // Modal Looker Studio
  const [modalLookerOpen, setModalLookerOpen] = useState(false);

  // BI State - Sedes seleccionadas en el gráfico de evolución
  const [sedesSeleccionadasEvolucion, setSedesSeleccionadasEvolucion] = useState<string[]>([]);
  const [verTotalRedEvolucion, setVerTotalRedEvolucion] = useState(true);

  // Heatmap State
  const [heatmapInicio, setHeatmapInicio] = useState('');
  const [heatmapFin, setHeatmapFin] = useState('');

  // Refs de Charts
  const chartTendenciaRef = useRef<HTMLCanvasElement | null>(null);
  const chartTendenciaInst = useRef<Chart | null>(null);
  const chartDiasSemanaRef = useRef<HTMLCanvasElement | null>(null);
  const chartDiasSemanaInst = useRef<Chart | null>(null);

  // Collapse expandido para filas de pérdida 100%
  const [expandedPerdida, setExpandedPerdida] = useState<Record<number, boolean>>({});

  const cargarDatos = async (paramsObj?: { sede?: string; inicio?: string; fin?: string; limite?: number }) => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      const s = paramsObj?.sede !== undefined ? paramsObj.sede : filtroSede;
      const ini = paramsObj?.inicio !== undefined ? paramsObj.inicio : fInicio;
      const fin = paramsObj?.fin !== undefined ? paramsObj.fin : fFin;
      const lim = paramsObj?.limite !== undefined ? paramsObj.limite : (selectorPeriodo === 'ultimos30' ? 30 : 0);

      if (s) params.set('sede', s);
      if (ini) params.set('inicio', ini);
      if (fin) params.set('fin', fin);
      if (lim > 0) params.set('limite', String(lim));

      const res = await fetch(`/api/central-dashboard?${params.toString()}`);
      const data = await res.json();
      setCargando(false);

      if (data.success) {
        setDatos(data);
        if (data.sedesDisponibles && sedesSeleccionadasEvolucion.length === 0) {
          setSedesSeleccionadasEvolucion(data.sedesDisponibles);
        }
      }
    } catch (e) {
      setCargando(false);
      console.error('Error al cargar Central Neurálgica:', e);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Gráficos BI cuando se activa la pestaña BI
  useEffect(() => {
    if (tabActivo !== 'bi' || !datos?.analiticaBI) return;

    const bi = datos.analiticaBI;

    // 1. Gráfico de Evolución Temporal
    if (chartTendenciaRef.current) {
      if (chartTendenciaInst.current) chartTendenciaInst.current.destroy();

      const ctx = chartTendenciaRef.current.getContext('2d');
      if (ctx && bi.seriesTemporales) {
        const datasets: any[] = [];
        if (verTotalRedEvolucion) {
          datasets.push({
            label: 'Total Red',
            data: bi.seriesTemporales.totalRed || [],
            borderColor: '#0f172a',
            backgroundColor: 'rgba(15, 23, 42, 0.05)',
            borderWidth: 3,
            tension: 0.3,
            fill: true,
          });
        }

        const sedesList = datos.sedesDisponibles || [];
        sedesList.forEach((s: string, idx: number) => {
          if (sedesSeleccionadasEvolucion.includes(s)) {
            datasets.push({
              label: s,
              data: bi.seriesTemporales.sedes?.[s] || [],
              borderColor: COLORES_SEDES[idx % COLORES_SEDES.length],
              borderWidth: 2,
              tension: 0.2,
              fill: false,
            });
          }
        });

        chartTendenciaInst.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: bi.seriesTemporales.labels || [],
            datasets,
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: function (context: any) {
                    return `${context.dataset.label}: S/ ${parseFloat(context.parsed.y || 0).toFixed(2)}`;
                  },
                },
              },
            },
            scales: {
              y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
              x: { grid: { display: false } },
            },
          },
        });
      }
    }

    // 2. Gráfico Salón vs Cocina por Día
    if (chartDiasSemanaRef.current) {
      if (chartDiasSemanaInst.current) chartDiasSemanaInst.current.destroy();

      const ctx2 = chartDiasSemanaRef.current.getContext('2d');
      if (ctx2 && bi.diasSemana) {
        chartDiasSemanaInst.current = new Chart(ctx2, {
          type: 'bar',
          data: {
            labels: bi.diasSemana.map((d: any) => d.dia),
            datasets: [
              {
                label: 'Ratio Salón (S//hr)',
                data: bi.diasSemana.map((d: any) => parseFloat(d.ratioSalon || 0)),
                backgroundColor: '#3b82f6',
                borderRadius: 4,
              },
              {
                label: 'Ratio Cocina (S//hr)',
                data: bi.diasSemana.map((d: any) => parseFloat(d.ratioCocina || 0)),
                backgroundColor: '#f59e0b',
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'S/ por Hora' } },
            },
            plugins: { legend: { position: 'bottom' } },
          },
        });
      }
    }

    return () => {
      if (chartTendenciaInst.current) chartTendenciaInst.current.destroy();
      if (chartDiasSemanaInst.current) chartDiasSemanaInst.current.destroy();
    };
  }, [tabActivo, datos, sedesSeleccionadasEvolucion, verTotalRedEvolucion]);

  const handlePeriodoRapido = (opc: string) => {
    setSelectorPeriodo(opc);
    const hoy = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = hoy.getFullYear();
    const m = hoy.getMonth() + 1;
    const d = hoy.getDate();

    if (opc === 'ultimos30') {
      setFInicio('');
      setFFin('');
      cargarDatos({ inicio: '', fin: '', limite: 30 });
      return;
    }

    let ini = '';
    let fin = '';

    if (opc === 'quincenaActual') {
      if (d <= 15) {
        ini = `${y}-${pad(m)}-01`;
        fin = `${y}-${pad(m)}-15`;
      } else {
        const lastDay = new Date(y, m, 0).getDate();
        ini = `${y}-${pad(m)}-16`;
        fin = `${y}-${pad(m)}-${pad(lastDay)}`;
      }
    } else if (opc === 'quincenaAnterior') {
      if (d <= 15) {
        const prevM = m === 1 ? 12 : m - 1;
        const prevY = m === 1 ? y - 1 : y;
        const lastDay = new Date(prevY, prevM, 0).getDate();
        ini = `${prevY}-${pad(prevM)}-16`;
        fin = `${prevY}-${pad(prevM)}-${pad(lastDay)}`;
      } else {
        ini = `${y}-${pad(m)}-01`;
        fin = `${y}-${pad(m)}-15`;
      }
    } else if (opc === 'mesActual') {
      const lastDay = new Date(y, m, 0).getDate();
      ini = `${y}-${pad(m)}-01`;
      fin = `${y}-${pad(m)}-${pad(lastDay)}`;
    } else if (opc === 'mesAnterior') {
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const lastDay = new Date(prevY, prevM, 0).getDate();
      ini = `${prevY}-${pad(prevM)}-01`;
      fin = `${prevY}-${pad(prevM)}-${pad(lastDay)}`;
    }

    if (ini && fin) {
      setFInicio(ini);
      setFFin(fin);
      cargarDatos({ inicio: ini, fin: fin, limite: 0 });
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltroSede('');
    setFInicio('');
    setFFin('');
    setBusquedaTexto('');
    setSelectorPeriodo('ultimos30');
    cargarDatos({ sede: '', inicio: '', fin: '', limite: 30 });
  };

  const registrosFiltrados = (datos?.registros || []).filter((r: any) => {
    if (!busquedaTexto) return true;
    const txt = busquedaTexto.toLowerCase();
    return (
      r.sede.toLowerCase().includes(txt) ||
      r.fecha.toLowerCase().includes(txt) ||
      r.diaSemana.toLowerCase().includes(txt)
    );
  });

  const kpis = datos?.kpis || {};
  const heatmapMatriz = datos?.analiticaBI?.matrizCalor || {};
  const sedesHeatmap = datos?.analiticaBI?.sedes || [];
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  return (
    <div className="container-fluid p-0">
      {/* Banner / Header Central Takumi */}
      <div className="card border-0 shadow-sm mb-3" style={{ background: 'linear-gradient(135deg, #0c1017 0%, #18202e 100%)' }}>
        <div className="card-body p-3 p-md-4 text-white">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-danger bg-opacity-25 p-3 rounded-3 text-danger-subtle border border-danger border-opacity-25 shadow-sm">
                <i className="bi bi-hdd-network-fill fs-2"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h4 className="fw-bold mb-0 text-white">Central Neurálgica & BI Multi-Tienda</h4>
                  <span className="hanko-stamp border-danger text-danger bg-danger-subtle" style={{ fontSize: '0.62rem' }}>
                    統合分析
                  </span>
                  <span className="badge bg-danger-subtle text-danger fw-bold border border-danger-subtle" style={{ fontSize: '0.68rem' }}>
                    v2.8 Verificada
                  </span>
                </div>
                <p className="text-white-50 small mb-0">
                  Torre de Control Corporativa: Ratios Salón/Cocina, Auditoría Disciplinaria, Matriz de Calor y Analítica Predictiva
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-warning btn-sm fw-semibold shadow-sm text-dark d-flex align-items-center gap-1"
                onClick={() => setModalLookerOpen(true)}
              >
                <i className="bi bi-bar-chart-steps"></i> Looker Studio
              </button>
              <button
                type="button"
                className="btn btn-outline-light btn-sm fw-semibold shadow-sm d-flex align-items-center gap-1"
                onClick={() => setModalDirectorioOpen(true)}
              >
                <i className="bi bi-shop"></i> Directorio ({datos?.sedesDisponibles?.length || 0} Sedes)
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm fw-bold shadow-sm d-flex align-items-center gap-1 px-3"
                onClick={() => cargarDatos()}
                disabled={cargando}
              >
                <i className={`bi bi-arrow-repeat ${cargando ? 'spin' : ''}`}></i> Refrescar Red
              </button>
            </div>
          </div>
        </div>

        {/* Selector de Pestañas (Tabs) */}
        <div className="px-3 pb-2 pt-1 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <ul className="nav nav-pills gap-2 small fw-bold">
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-3 rounded-pill text-white ${tabActivo === 'dashboard' ? 'active bg-primary' : 'bg-transparent text-white-50'}`}
                onClick={() => setTabActivo('dashboard')}
              >
                <i className="bi bi-grid-fill me-1"></i> Dashboard & Operaciones
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link py-1 px-3 rounded-pill text-white ${tabActivo === 'bi' ? 'active bg-primary' : 'bg-transparent text-white-50'}`}
                onClick={() => setTabActivo('bi')}
              >
                <i className="bi bi-graph-up-arrow me-1"></i> BI & Analítica Nativa
              </button>
            </li>
          </ul>

          <div className="text-white-50 small d-none d-md-block">
            <i className="bi bi-shield-lock-fill text-success me-1"></i> Monitoreo Centralizado de {datos?.sedesDisponibles?.length || 21} Tiendas
          </div>
        </div>
      </div>

      {/* VISTA 1: DASHBOARD & OPERACIONES */}
      {tabActivo === 'dashboard' && (
        <>
          {/* Tarjetas KPI Superiores */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-sm-6 col-xl-2">
              <div className="card p-3 border-0 shadow-sm h-100 bg-white" style={{ borderLeft: '4px solid #0284c7' }}>
                <span className="text-secondary small fw-bold text-uppercase">Total Recaudado</span>
                <h3 className="fw-bold my-1 text-primary">
                  S/ {parseFloat(kpis.totalRed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <span className="text-muted small">
                  {parseFloat(kpis.totalHoras || 0).toFixed(1)} hrs red
                </span>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <div className="card p-3 border-0 shadow-sm h-100 bg-white" style={{ borderLeft: '4px solid #2563eb' }}>
                <span className="text-secondary small fw-bold text-uppercase">Ratio Salón (60%)</span>
                <h3 className="fw-bold my-1 text-primary">
                  S/ {kpis.ratioPromedioSalon || '0.00'} <small className="fs-6 text-muted">/hr</small>
                </h3>
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle small">
                  Fondo: S/ {parseFloat(kpis.totalSalon || 0).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <div className="card p-3 border-0 shadow-sm h-100 bg-white" style={{ borderLeft: '4px solid #d97706' }}>
                <span className="text-secondary small fw-bold text-uppercase">Ratio Cocina (40%)</span>
                <h3 className="fw-bold my-1 text-warning">
                  S/ {kpis.ratioPromedioCocina || '0.00'} <small className="fs-6 text-muted">/hr</small>
                </h3>
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">
                  Fondo: S/ {parseFloat(kpis.totalCocina || 0).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <div className="card p-3 border-0 shadow-sm h-100 bg-white" style={{ borderLeft: '4px solid #16a34a' }}>
                <span className="text-secondary small fw-bold text-uppercase">Ratio General Red</span>
                <h3 className="fw-bold my-1 text-success">
                  S/ {kpis.ratioPromedioHoraRed || '0.00'} <small className="fs-6 text-muted">/hr</small>
                </h3>
                <span className="badge bg-success-subtle text-success border border-success-subtle small">
                  S/ por hora total
                </span>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <div className="card p-3 border-0 shadow-sm h-100 bg-white" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <span className="text-secondary small fw-bold text-uppercase">Tienda Líder</span>
                <h5 className="fw-bold my-1 text-truncate" title={kpis.sedeLider}>
                  {kpis.sedeLider || '--'}
                </h5>
                <span className="text-muted small">Mayor volumen global</span>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-2">
              <div className="card p-3 border-0 shadow-sm h-100 bg-white" style={{ borderLeft: '4px solid #10b981' }}>
                <span className="text-secondary small fw-bold text-uppercase">Mayor Eficiencia</span>
                <h5 className="fw-bold my-1 text-truncate text-success" title={kpis.sedeMasEficiente}>
                  {kpis.sedeMasEficiente || '--'}
                </h5>
                <span className="text-muted small">Mayor S/ por hora</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtros Interactivos */}
          <div className="card border-0 shadow-sm p-3 mb-3 bg-white">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold mb-1 text-secondary">Filtrar por Sede</label>
                <select
                  className="form-select form-select-sm"
                  value={filtroSede}
                  onChange={(e) => {
                    setFiltroSede(e.target.value);
                    cargarDatos({ sede: e.target.value });
                  }}
                >
                  <option value="">Todas las Sedes ({datos?.sedesDisponibles?.length || 0})</option>
                  {(datos?.sedesDisponibles || []).map((s: string) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small fw-bold mb-1 text-secondary">Desde</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fInicio}
                  onChange={(e) => {
                    setFInicio(e.target.value);
                    cargarDatos({ inicio: e.target.value });
                  }}
                />
              </div>

              <div className="col-6 col-md-2">
                <label className="form-label small fw-bold mb-1 text-secondary">Hasta</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fFin}
                  onChange={(e) => {
                    setFFin(e.target.value);
                    cargarDatos({ fin: e.target.value });
                  }}
                />
              </div>

              <div className="col-12 col-md-3">
                <label className="form-label small fw-bold mb-1 text-secondary">Búsqueda Rápida</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Colaborador, día, sede..."
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                />
              </div>

              <div className="col-12 col-md-2 d-flex align-items-end pt-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm w-100"
                  onClick={handleLimpiarFiltros}
                >
                  <i className="bi bi-eraser me-1"></i> Limpiar
                </button>
              </div>
            </div>
          </div>

          {/* Grilla Central: Ranking de Propinas + Ranking de Sanciones */}
          <div className="row g-3 mb-3">
            {/* Columna 7: Ranking y Ratios por Sede */}
            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm p-3 h-100 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-trophy-fill text-warning me-2"></i>Ranking y Ratios por Sede
                  </h6>
                  <span className="small text-muted">Aportación y Ratios Salón vs Cocina</span>
                </div>

                <div className="d-flex flex-column gap-2 pt-1" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {(datos?.ranking || []).length === 0 ? (
                    <div className="text-center text-muted py-4 small">Sin datos disponibles.</div>
                  ) : (
                    (datos?.ranking || []).map((s: any) => (
                      <div key={s.nombre} className="p-2 border rounded bg-light bg-opacity-50">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-1">
                            <strong className="text-dark">{s.nombre}</strong>
                            {s.alertaInactiva ? (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle ms-1 small">
                                <i className="bi bi-exclamation-triangle"></i> &gt;48h sin datos
                              </span>
                            ) : (
                              <span className="badge bg-success-subtle text-success border border-success-subtle ms-1 small">
                                Al día
                              </span>
                            )}
                          </div>
                          <div className="text-end">
                            <span className="fw-bold text-primary">S/ {parseFloat(s.total).toFixed(2)}</span>{' '}
                            <span className="text-muted small">({s.porcentaje}%)</span>
                          </div>
                        </div>

                        <div className="progress mb-2" style={{ height: '6px' }}>
                          <div
                            className="progress-bar bg-primary"
                            role="progressbar"
                            style={{ width: `${s.porcentaje}%` }}
                          ></div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center small text-muted flex-wrap gap-1">
                          <span>Ratio General: <strong className="text-success">S/ {s.ratioHora}/hr</strong></span>
                          <span>Salón: <span className="badge bg-primary-subtle text-primary border border-primary-subtle">S/ {s.ratioSalon}/hr</span></span>
                          <span>Cocina: <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">S/ {s.ratioCocina}/hr</span></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Columna 5: Ranking de Sanciones Disciplinarias por Tienda */}
            <div className="col-12 col-lg-5">
              <div className="card border-0 shadow-sm p-3 h-100 bg-white" style={{ borderTop: '4px solid #ef4444' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <h6 className="fw-bold mb-0 text-danger">
                      <i className="bi bi-exclamation-octagon-fill me-2"></i>Ranking de Sanciones por Tienda
                    </h6>
                    <small className="text-muted">Clic en una tienda para auditar faltas</small>
                  </div>
                  <span className="badge bg-danger rounded-pill">
                    {(datos?.rankingSanciones || []).reduce((acc: number, item: any) => acc + item.cantidad, 0)} Sanciones
                  </span>
                </div>

                <div className="table-responsive pt-1" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="table table-hover table-sm align-middle mb-0">
                    <thead className="table-light small sticky-top">
                      <tr>
                        <th>Tienda</th>
                        <th className="text-center">Sanciones</th>
                        <th className="text-end">Monto Total</th>
                        <th className="text-center">Auditar</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {(datos?.rankingSanciones || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-3">
                            No hay sanciones registradas en la red.
                          </td>
                        </tr>
                      ) : (
                        (datos?.rankingSanciones || []).map((item: any) => {
                          const tieneSanciones = item.cantidad > 0;
                          const badgeColor =
                            item.cantidad > 5 ? 'bg-danger' : item.cantidad > 0 ? 'bg-warning text-dark' : 'bg-light text-muted';
                          return (
                            <tr
                              key={item.sede}
                              style={{ cursor: tieneSanciones ? 'pointer' : 'default' }}
                              onClick={() => {
                                if (tieneSanciones) setModalSancionesSede(item);
                              }}
                            >
                              <td>
                                <strong className="text-dark">{item.sede}</strong>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                  {item.totalColaboradores} colaboradore(s)
                                </div>
                              </td>
                              <td className="text-center">
                                <span className={`badge ${badgeColor} rounded-pill px-2 py-1`}>
                                  {item.cantidad}
                                </span>
                              </td>
                              <td className={`text-end fw-bold ${item.montoTotal > 0 ? 'text-danger' : 'text-muted'}`}>
                                S/ {parseFloat(item.montoTotal).toFixed(2)}
                              </td>
                              <td className="text-center">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger py-0 px-2"
                                  title="Ver auditoría de sanciones"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalSancionesSede(item);
                                  }}
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Fila de Alerta Crítica: Historial de Pérdida del 100% de Propinas */}
          <div className="card border-0 shadow-sm p-3 mb-3 bg-white" style={{ borderTop: '4px solid #dc2626', borderLeft: '4px solid #dc2626' }}>
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
              <div>
                <h6 className="fw-bold mb-0 text-danger">
                  <i className="bi bi-person-x-fill me-2"></i>Historial de Colaboradores con Pérdida del 100% de Propinas (Ciclo Activo)
                </h6>
                <small className="text-muted">
                  Colaboradores que superaron la tolerancia acumulada o incurrieron en falta grave directa
                </small>
              </div>
              <div className="d-flex gap-2 align-items-center mt-2 mt-md-0">
                <span className="badge bg-danger rounded-pill px-3 py-2">
                  {datos?.totalPerdida100Count || 0} Colaborador{(datos?.totalPerdida100Count || 0) !== 1 ? 'es' : ''}
                </span>
                <span className="badge bg-dark rounded-pill px-3 py-2">
                  S/ {parseFloat(datos?.montoTotalPerdidoRed || 0).toFixed(2)} Confiscado
                </span>
              </div>
            </div>

            <div className="table-responsive pt-1">
              {(datos?.trabajadoresPerdida100 || []).length === 0 ? (
                <div className="alert alert-success d-flex align-items-center mb-0 py-2">
                  <i className="bi bi-check-circle-fill fs-5 me-2"></i>
                  <div>Excelente: No se registran colaboradores con pérdida del 100% de propina en este período.</div>
                </div>
              ) : (
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light small">
                    <tr>
                      <th>Colaborador</th>
                      <th>Sede / Local</th>
                      <th>Área</th>
                      <th className="text-center">Sanciones / Minutos</th>
                      <th>Motivo Técnico de Pérdida Total</th>
                      <th className="text-center">Generado Por</th>
                      <th className="text-end text-danger fw-bold">Propina Perdida</th>
                      <th className="text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="small">
                    {(datos?.trabajadoresPerdida100 || []).map((t: any, i: number) => {
                      const areaNom = t.area || 'Salón';
                      const badgeArea = areaNom.toLowerCase().includes('cocina') ? 'bg-warning-subtle text-warning-emphasis' : 'bg-primary-subtle text-primary';
                      const isExpanded = !!expandedPerdida[i];
                      return (
                        <React.Fragment key={i}>
                          <tr>
                            <td><strong className="text-dark">{t.colaborador}</strong></td>
                            <td><span className="badge bg-secondary">{t.sede}</span></td>
                            <td><span className={`badge ${badgeArea}`}>{areaNom}</span></td>
                            <td className="text-center">
                              <span className="badge bg-warning text-dark fw-bold me-1">{t.cantidadSanciones} sanc.</span>
                              {t.minutosTardanza > 0 ? (
                                <span className="badge bg-danger">{t.minutosTardanza} min</span>
                              ) : (
                                <span className="badge bg-secondary">0 min</span>
                              )}
                            </td>
                            <td><small className="text-danger fw-semibold">{t.motivo}</small></td>
                            <td className="text-center">
                              <span className="badge bg-light text-dark border">{t.generadoPor}</span>
                            </td>
                            <td className="text-end text-danger fw-bold fs-6">S/ {parseFloat(t.montoPropinaPerdida || 0).toFixed(2)}</td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                onClick={() =>
                                  setExpandedPerdida((prev) => ({ ...prev, [i]: !prev[i] }))
                                }
                              >
                                <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="bg-light p-2">
                                <div className="p-2 border rounded bg-white small shadow-sm">
                                  <div className="text-danger fw-bold mb-1">
                                    <i className="bi bi-exclamation-triangle-fill me-1"></i> Detalle de Infracciones del Período:
                                  </div>
                                  <div className="text-secondary">{t.detalle || 'Registros de faltas disciplinarias aprobadas'}</div>
                                  <div className="d-flex justify-content-between mt-2 pt-1 border-top small text-muted">
                                    <span><strong>Destino:</strong> 100% redistribuido al personal del área {areaNom}</span>
                                    <span><strong>Estado:</strong> {t.estado}</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Tabla Consolidada Diaria Multi-Tienda */}
          <div className="card border-0 shadow-sm p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h6 className="fw-bold mb-0 text-dark">
                  <i className="bi bi-table me-2 text-primary"></i>Consolidado Diario de Propinas Multi-Tienda
                </h6>
                <span className="badge bg-primary">
                  {selectorPeriodo === 'ultimos30' ? 'Tope: Últimos 30 registros' : `Período: ${fInicio || '--'} al ${fFin || '--'}`}
                </span>
                <span className="badge bg-secondary">{registrosFiltrados.length} registros</span>
              </div>

              {/* Selector de Período Rápido */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="input-group input-group-sm" style={{ width: 'auto' }}>
                  <span className="input-group-text bg-light fw-semibold small">
                    <i className="bi bi-calendar3 me-1"></i> Período:
                  </span>
                  <select
                    className="form-select form-select-sm"
                    value={selectorPeriodo}
                    onChange={(e) => handlePeriodoRapido(e.target.value)}
                  >
                    <option value="ultimos30">Últimos 30 registros</option>
                    <option value="quincenaActual">Quincena actual</option>
                    <option value="quincenaAnterior">Quincena anterior</option>
                    <option value="mesActual">Mes actual</option>
                    <option value="mesAnterior">Mes anterior</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleLimpiarFiltros}
                  title="Volver a los últimos 30 registros"
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Restablecer
                </button>
              </div>
            </div>

            <div className="table-responsive" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="table table-hover table-striped table-sm align-middle mb-0">
                <thead className="table-dark sticky-top small">
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Sede</th>
                    <th className="text-end">Recaudado</th>
                    <th className="text-end" style={{ background: '#1e3a8a' }}>Salón (60%)</th>
                    <th className="text-center" style={{ background: '#1e3a8a' }}>Horas Salón</th>
                    <th className="text-center" style={{ background: '#1e3a8a' }}>Ratio Salón</th>
                    <th className="text-end" style={{ background: '#78350f' }}>Cocina (40%)</th>
                    <th className="text-center" style={{ background: '#78350f' }}>Horas Cocina</th>
                    <th className="text-center" style={{ background: '#78350f' }}>Ratio Cocina</th>
                    <th className="text-center">Total Horas</th>
                    <th className="text-center">Ratio General</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center text-muted py-4">
                        No hay registros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    registrosFiltrados.map((r: any) => (
                      <tr key={r.id}>
                        <td>{r.fecha}</td>
                        <td><span className="badge bg-light text-dark border">{r.diaSemana}</span></td>
                        <td><strong>{r.sede}</strong></td>
                        <td className="text-end fw-bold">S/ {parseFloat(r.monto).toFixed(2)}</td>
                        <td className="text-end text-primary fw-semibold">S/ {parseFloat(r.salon).toFixed(2)}</td>
                        <td className="text-center">{parseFloat(r.horasSalon).toFixed(1)}h</td>
                        <td className="text-center">
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            S/ {parseFloat(r.ratioSalon).toFixed(2)}/h
                          </span>
                        </td>
                        <td className="text-end text-warning fw-semibold">S/ {parseFloat(r.cocina).toFixed(2)}</td>
                        <td className="text-center">{parseFloat(r.horasCocina).toFixed(1)}h</td>
                        <td className="text-center">
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                            S/ {parseFloat(r.ratioCocina).toFixed(2)}/h
                          </span>
                        </td>
                        <td className="text-center">{parseFloat(r.horas).toFixed(1)}h</td>
                        <td className="text-center">
                          <span className="badge bg-success-subtle text-success border border-success-subtle">
                            S/ {parseFloat(r.ratioHora).toFixed(2)}/h
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VISTA 2: BUSINESS INTELLIGENCE & ANALÍTICA */}
      {tabActivo === 'bi' && (
        <>
          <div className="row g-3 mb-3">
            {/* Gráfico 1: Evolución de Recaudación Diaria Multi-Tienda */}
            <div className="col-12 col-xl-8">
              <div className="card border-0 shadow-sm p-3 bg-white h-100">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom">
                  <div>
                    <h6 className="fw-bold mb-0">
                      <i className="bi bi-graph-up me-2 text-primary"></i>Evolución de Recaudación Diaria
                    </h6>
                    <span className="small text-muted">Comparativa Multi-Sede Independiente</span>
                  </div>

                  <div className="d-flex align-items-center gap-1 flex-wrap">
                    {/* Botones Presets Rápidos */}
                    <div className="btn-group btn-group-sm me-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary py-1 px-2"
                        onClick={() => {
                          setVerTotalRedEvolucion(true);
                          setSedesSeleccionadasEvolucion(datos?.sedesDisponibles || []);
                        }}
                      >
                        Todas
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary py-1 px-2"
                        onClick={() => {
                          setVerTotalRedEvolucion(true);
                          setSedesSeleccionadasEvolucion([]);
                        }}
                      >
                        Solo Red
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary py-1 px-2"
                        onClick={() => {
                          setVerTotalRedEvolucion(false);
                          const top3 = (datos?.ranking || []).slice(0, 3).map((r: any) => r.nombre);
                          setSedesSeleccionadasEvolucion(top3);
                        }}
                      >
                        Top 3
                      </button>
                    </div>

                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                      {sedesSeleccionadasEvolucion.length} sedes activas
                    </span>
                  </div>
                </div>

                <div style={{ position: 'relative', height: '320px' }}>
                  <canvas ref={chartTendenciaRef}></canvas>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Rendimiento Salón vs Cocina por Día */}
            <div className="col-12 col-xl-4">
              <div className="card border-0 shadow-sm p-3 bg-white h-100">
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <div>
                    <h6 className="fw-bold mb-0 text-success">
                      <i className="bi bi-bar-chart-fill me-2"></i>Rendimiento por Día (S//hora)
                    </h6>
                    <span className="small text-muted">Salón vs Cocina</span>
                  </div>
                </div>
                <div style={{ position: 'relative', height: '320px' }}>
                  <canvas ref={chartDiasSemanaRef}></canvas>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen Fin de Semana vs Días Laborables */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderLeft: '5px solid #10b981' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="small fw-bold text-success text-uppercase">
                      Fin de Semana (Viernes, Sábado y Domingo)
                    </span>
                    <h3 className="fw-bold my-1 text-dark">
                      S/ {parseFloat(datos?.analiticaBI?.resumenSemanaVsFds?.totalFDS || 0).toFixed(2)}
                    </h3>
                    <span className="small text-muted">
                      Ratio promedio: S/ {datos?.analiticaBI?.resumenSemanaVsFds?.ratioFDS || '0.00'}/hr
                    </span>
                  </div>
                  <h2 className="fw-bold text-success opacity-75">
                    {datos?.analiticaBI?.resumenSemanaVsFds?.pctFDS || 0}%
                  </h2>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderLeft: '5px solid #6366f1' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="small fw-bold text-indigo text-uppercase" style={{ color: '#4f46e5' }}>
                      Días Laborables (Lunes a Jueves)
                    </span>
                    <h3 className="fw-bold my-1 text-dark">
                      S/ {parseFloat(datos?.analiticaBI?.resumenSemanaVsFds?.totalSemana || 0).toFixed(2)}
                    </h3>
                    <span className="small text-muted">
                      Ratio promedio: S/ {datos?.analiticaBI?.resumenSemanaVsFds?.ratioSemana || '0.00'}/hr
                    </span>
                  </div>
                  <h2 className="fw-bold text-primary opacity-75">
                    {datos?.analiticaBI?.resumenSemanaVsFds?.pctSemana || 0}%
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa de Calor Operativo (Matriz Sede vs Día) */}
          <div className="card border-0 shadow-sm p-3 mb-3 bg-white">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 pb-2 border-bottom">
              <div>
                <h6 className="fw-bold mb-0 text-warning-emphasis">
                  <i className="bi bi-grid-3x3 me-2 text-warning"></i>Mapa de Calor Operativo (Matriz Sede vs Día)
                </h6>
                <span className="small text-muted">
                  Intensidad por Recaudación y Ratios Salón vs Cocina por jornada
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-sm text-center align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th className="text-start" style={{ width: '180px' }}>Sede / Tienda</th>
                    {diasSemana.map((d) => (
                      <th key={d}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="small">
                  {sedesHeatmap.map((s: string) => (
                    <tr key={s}>
                      <td className="text-start fw-bold text-dark">{s}</td>
                      {diasSemana.map((d) => {
                        const celda = heatmapMatriz?.[s]?.[d] || { monto: 0, ratioSalon: '0.00', ratioCocina: '0.00' };
                        let bgStyle: React.CSSProperties = { backgroundColor: '#ffffff' };
                        if (celda.monto > 300) {
                          bgStyle = { backgroundColor: '#bbf7d0', fontWeight: 'bold' };
                        } else if (celda.monto > 150) {
                          bgStyle = { backgroundColor: '#dcfce7' };
                        } else if (celda.monto > 0) {
                          bgStyle = { backgroundColor: '#f0fdf4' };
                        }

                        return (
                          <td key={d} style={bgStyle}>
                            <div>S/ {parseFloat(celda.monto).toFixed(1)}</div>
                            <div style={{ fontSize: '0.7rem' }} className="text-muted">
                              Sal: S/ {celda.ratioSalon} | Coc: S/ {celda.ratioCocina}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL AUDITORÍA DETALLADA DE SANCIONES */}
      {modalSancionesSede && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-exclamation me-2"></i>Auditoría de Sanciones - {modalSancionesSede.sede}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalSancionesSede(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Resumen */}
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded border text-center">
                      <span className="text-secondary small fw-bold text-uppercase">Total Sanciones</span>
                      <h4 className="fw-bold text-danger my-1">{modalSancionesSede.cantidad}</h4>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded border text-center">
                      <span className="text-secondary small fw-bold text-uppercase">Monto Descontado</span>
                      <h4 className="fw-bold text-danger my-1">
                        S/ {parseFloat(modalSancionesSede.montoTotal).toFixed(2)}
                      </h4>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded border text-center">
                      <span className="text-secondary small fw-bold text-uppercase">Colaboradores Afectados</span>
                      <h4 className="fw-bold text-dark my-1">{modalSancionesSede.totalColaboradores}</h4>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold text-dark mb-2">
                  <i className="bi bi-list-check me-1"></i> Listado Detallado de Faltas Registradas:
                </h6>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle mb-0">
                    <thead className="table-light small">
                      <tr>
                        <th style={{ width: '110px' }}>Fecha</th>
                        <th style={{ width: '180px' }}>Colaborador</th>
                        <th style={{ width: '160px' }}>Infracción / Tipo</th>
                        <th className="text-end" style={{ width: '100px' }}>Monto (S/)</th>
                        <th>Comentario / Detalle de la Falta</th>
                        <th style={{ width: '150px' }}>Usuario</th>
                        <th className="text-center" style={{ width: '100px' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {(modalSancionesSede.sanciones || []).map((sanc: any, idx: number) => (
                        <tr key={idx}>
                          <td className="fw-semibold text-secondary">{sanc.fecha}</td>
                          <td><strong>{sanc.colaborador}</strong></td>
                          <td>
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                              {sanc.concepto}
                            </span>
                          </td>
                          <td className={`text-end fw-bold ${sanc.monto > 0 ? 'text-danger' : 'text-muted'}`}>
                            S/ {parseFloat(sanc.monto).toFixed(2)}
                          </td>
                          <td>
                            <div className="p-1 rounded bg-light border text-dark" style={{ fontSize: '0.85rem' }}>
                              <i className="bi bi-chat-left-quote me-1 text-secondary"></i>
                              {sanc.detalle || 'Sin comentario'}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-dark border">
                              <i className="bi bi-person-badge me-1"></i> {sanc.usuario || 'Admin'}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              {sanc.estado || 'Aprobado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalSancionesSede(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DIRECTORIO DE SEDES */}
      {modalDirectorioOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shop me-2"></i>Directorio de Tiendas Conectadas
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalDirectorioOpen(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="small text-muted mb-3">
                  Estado y métricas de todas las sedes satélite sincronizadas en la base de datos central.
                </p>
                <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table className="table table-sm table-bordered align-middle mb-0">
                    <thead className="table-light small sticky-top">
                      <tr>
                        <th>Tienda / Sucursal</th>
                        <th className="text-center">Total Recaudado</th>
                        <th className="text-center">Horas</th>
                        <th className="text-center">Ratio Horario</th>
                        <th className="text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="small">
                      {(datos?.ranking || []).map((s: any) => (
                        <tr key={s.nombre}>
                          <td><strong>{s.nombre}</strong></td>
                          <td className="text-end fw-semibold text-primary">S/ {parseFloat(s.total).toFixed(2)}</td>
                          <td className="text-center">{parseFloat(s.horas).toFixed(1)}h</td>
                          <td className="text-center fw-bold text-success">S/ {s.ratioHora}/hr</td>
                          <td className="text-center">
                            <span className="badge bg-success">Conectado</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalDirectorioOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOOKER STUDIO */}
      {modalLookerOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-bar-chart-steps me-2"></i>Conexión Looker Studio & BI
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalLookerOpen(false)}
                ></button>
              </div>
              <div className="modal-body p-4 text-center">
                <p className="small text-muted">
                  Los datos consolidados están estructurados para conectarse directamente con Google Looker Studio mediante la API o la base de datos central.
                </p>
                <div className="input-group input-group-sm mb-3">
                  <input
                    type="text"
                    className="form-control text-center"
                    value="https://propinas-one.vercel.app/api/central-dashboard"
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText('https://propinas-one.vercel.app/api/central-dashboard');
                      alert('Endpoint de datos copiado al portapapeles.');
                    }}
                  >
                    Copiar
                  </button>
                </div>
                <a
                  href="https://lookerstudio.google.com/navigation/reporting"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm w-100 fw-bold"
                >
                  Abrir Looker Studio <i className="bi bi-box-arrow-up-right ms-1"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
