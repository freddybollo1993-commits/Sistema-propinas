'use client';

import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';

interface ModDashboardProps {
  cicloInfo: { inicio: string; fin: string; estado: string } | null;
}

export default function ModDashboard({ cicloInfo }: ModDashboardProps) {
  const [fInicio, setFInicio] = useState('');
  const [fFin, setFFin] = useState('');
  const [datos, setDatos] = useState<any>(null);
  const [modoGrafico, setModoGrafico] = useState<'line' | 'bar'>('line');
  const [cargando, setCargando] = useState(false);

  const lineChartRef = useRef<HTMLCanvasElement | null>(null);
  const donaChartRef = useRef<HTMLCanvasElement | null>(null);
  const lineChartInst = useRef<Chart | null>(null);
  const donaChartInst = useRef<Chart | null>(null);

  const cargarDashboard = async (filtro?: { inicio: string; fin: string }) => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtro?.inicio) params.set('inicio', filtro.inicio);
      if (filtro?.fin) params.set('fin', filtro.fin);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const data = await res.json();
      setDatos(data);
      setCargando(false);
    } catch (e) {
      setCargando(false);
      console.error('Error al cargar dashboard:', e);
    }
  };

  useEffect(() => {
    if (cicloInfo) {
      setFInicio(cicloInfo.inicio || '');
      setFFin(cicloInfo.fin || '');
      cargarDashboard({ inicio: cicloInfo.inicio, fin: cicloInfo.fin });
    } else {
      cargarDashboard();
    }
  }, [cicloInfo]);

  // Renderizar gráficos con Chart.js
  useEffect(() => {
    if (!datos) return;

    // 1. Gráfico de Línea / Barras
    if (lineChartRef.current) {
      if (lineChartInst.current) lineChartInst.current.destroy();

      const ctx = lineChartRef.current.getContext('2d');
      if (ctx) {
        if (modoGrafico === 'line') {
          const labels = datos.puntosRecaudacion?.map((p: any) => p.fecha) || [];
          const values = datos.puntosRecaudacion?.map((p: any) => p.monto) || [];

          // Gradient fill with Torii Lacquer Red
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(201, 42, 42, 0.22)');
          gradient.addColorStop(1, 'rgba(201, 42, 42, 0.00)');

          lineChartInst.current = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels.length > 0 ? labels : ['Sin datos'],
              datasets: [
                {
                  label: 'Recaudación Diaria (S/)',
                  data: values.length > 0 ? values : [0],
                  borderColor: '#c92a2a',
                  borderWidth: 2.5,
                  backgroundColor: gradient,
                  fill: true,
                  tension: 0.38,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBackgroundColor: '#c92a2a',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0f172a',
                  titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
                  bodyFont: { family: 'JetBrains Mono', size: 13 },
                  padding: 10,
                  cornerRadius: 8,
                  callbacks: {
                    label: (context) => ` Recaudación: S/ ${Number(context.raw || 0).toFixed(2)}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: '#f1f5f9' },
                  ticks: {
                    font: { family: 'JetBrains Mono', size: 11 },
                    color: '#64748b',
                    callback: (value) => `S/ ${value}`,
                  },
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
                },
              },
            },
          });
        } else {
          const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          lineChartInst.current = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: diasNombres,
              datasets: [
                {
                  label: 'Total por Día de Semana (S/)',
                  data: datos.comparativaSemana || [0, 0, 0, 0, 0, 0, 0],
                  backgroundColor: 'rgba(37, 99, 235, 0.85)',
                  hoverBackgroundColor: '#2563eb',
                  borderRadius: 8,
                  borderSkipped: false,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#0f172a',
                  titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
                  bodyFont: { family: 'JetBrains Mono', size: 13 },
                  padding: 10,
                  cornerRadius: 8,
                  callbacks: {
                    label: (context) => ` Total acumulado: S/ ${Number(context.raw || 0).toFixed(2)}`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: '#f1f5f9' },
                  ticks: {
                    font: { family: 'JetBrains Mono', size: 11 },
                    color: '#64748b',
                    callback: (value) => `S/ ${value}`,
                  },
                },
                x: {
                  grid: { display: false },
                  ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#64748b' },
                },
              },
            },
          });
        }
      }
    }

    // 2. Gráfico de Dona
    if (donaChartRef.current) {
      if (donaChartInst.current) donaChartInst.current.destroy();

      const ctxDona = donaChartRef.current.getContext('2d');
      if (ctxDona) {
        const salon = datos.totalSalon || 0;
        const cocina = datos.totalCocina || 0;

        donaChartInst.current = new Chart(ctxDona, {
          type: 'doughnut',
          data: {
            labels: ['Salón (60%)', 'Cocina (40%)'],
            datasets: [
              {
                data: salon === 0 && cocina === 0 ? [60, 40] : [salon, cocina],
                backgroundColor: ['#10b981', '#f59e0b'],
                hoverBackgroundColor: ['#059669', '#d97706'],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
                  padding: 14,
                  usePointStyle: true,
                  pointStyle: 'circle',
                },
              },
              tooltip: {
                backgroundColor: '#0f172a',
                titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' },
                bodyFont: { family: 'JetBrains Mono', size: 13 },
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (context) => ` Fondo: S/ ${Number(context.raw || 0).toFixed(2)}`,
                },
              },
            },
            cutout: '72%',
          },
        });
      }
    }

    return () => {
      if (lineChartInst.current) lineChartInst.current.destroy();
      if (donaChartInst.current) donaChartInst.current.destroy();
    };
  }, [datos, modoGrafico]);

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarDashboard({ inicio: fInicio, fin: fFin });
  };

  const handleRestablecerCiclo = () => {
    if (cicloInfo) {
      setFInicio(cicloInfo.inicio || '');
      setFFin(cicloInfo.fin || '');
      cargarDashboard({ inicio: cicloInfo.inicio, fin: cicloInfo.fin });
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Barra de Filtro Analítico */}
      <div className="card p-4 mb-4 shadow-sm border-0 bg-white">
        <div className="row align-items-center g-3">
          <div className="col-lg-5">
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span className="hanko-stamp">
                ダッシュボード
              </span>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0 fw-bold">
                PANEL OPERATIVO
              </span>
              {cicloInfo?.estado && (
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0 font-mono">
                  {cicloInfo.estado}
                </span>
              )}
            </div>
            <h4 className="fw-bold mb-1 text-slate-900 d-flex align-items-center gap-2" style={{ letterSpacing: '-0.02em' }}>
              <span>Dashboard de Recaudación</span>
              <span className="text-danger-subtle" style={{ fontSize: '1rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>チップ集計</span>
            </h4>
            <p className="text-secondary small mb-0">
              Métricas de propinas en tiempo real, desglose por áreas operativas y evolución diaria.
            </p>
          </div>
          <div className="col-lg-7">
            <form
              className="row g-2 justify-content-lg-end align-items-center"
              onSubmit={handleFiltrar}
            >
              <div className="col-auto">
                <span className="small fw-bold text-secondary">Rango:</span>
              </div>
              <div className="col-auto">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fInicio}
                  onChange={(e) => setFInicio(e.target.value)}
                />
              </div>
              <div className="col-auto text-muted small fw-semibold">a</div>
              <div className="col-auto">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fFin}
                  onChange={(e) => setFFin(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm px-3 shadow-xs"
                  disabled={cargando}
                >
                  {cargando ? (
                    <span className="spinner-border spinner-border-sm me-1"></span>
                  ) : (
                    <i className="bi bi-funnel-fill me-1"></i>
                  )}
                  Filtrar
                </button>
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3 shadow-xs"
                  onClick={handleRestablecerCiclo}
                  title="Restablecer fechas al ciclo actual de la sede"
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Ciclo Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI Bento Grid */}
      <div className="row g-3 mb-4">
        {/* Total Recaudado */}
        <div className="col-xl-3 col-md-6 col-12">
          <div className="stat-kpi-card h-100">
            <div className="d-flex align-items-start justify-content-between mb-2">
              <span className="stat-label">Total Recaudado</span>
              <div className="stat-icon-wrapper bg-primary-subtle text-primary">
                <i className="bi bi-cash-stack"></i>
              </div>
            </div>
            <div className="stat-value kpi-amount text-primary">
              S/ {(datos?.totalRecaudado || 0).toFixed(2)}
            </div>
            <div className="mt-2 small text-secondary d-flex align-items-center gap-1">
              {datos?.crecimiento && datos?.crecimiento !== '--' ? (
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0 fw-bold">
                  <i className="bi bi-arrow-up-short"></i> {datos.crecimiento} vs anterior
                </span>
              ) : (
                <span className="text-muted">Ciclo en curso</span>
              )}
            </div>
          </div>
        </div>

        {/* Promedio Diario */}
        <div className="col-xl-3 col-md-6 col-12">
          <div className="stat-kpi-card h-100">
            <div className="d-flex align-items-start justify-content-between mb-2">
              <span className="stat-label">Promedio Diario</span>
              <div className="stat-icon-wrapper bg-slate-100 text-slate-700">
                <i className="bi bi-calendar2-week"></i>
              </div>
            </div>
            <div className="stat-value kpi-amount text-slate-800">
              S/ {(datos?.promedioPropinaDia || 0).toFixed(2)}
            </div>
            <div className="mt-2 small text-muted">
              Por jornada efectiva registrada
            </div>
          </div>
        </div>

        {/* Fondo Salón */}
        <div className="col-xl-3 col-md-6 col-12">
          <div className="stat-kpi-card h-100">
            <div className="d-flex align-items-start justify-content-between mb-2">
              <span className="stat-label text-success">Fondo Salón (60%)</span>
              <div className="stat-icon-wrapper bg-success-subtle text-success">
                <i className="bi bi-shop"></i>
              </div>
            </div>
            <div className="stat-value kpi-amount text-success">
              S/ {(datos?.totalSalon || 0).toFixed(2)}
            </div>
            <div className="mt-2 small text-muted">
              Colaboradores de servicio salón & apoyos
            </div>
          </div>
        </div>

        {/* Fondo Cocina */}
        <div className="col-xl-3 col-md-6 col-12">
          <div className="stat-kpi-card h-100">
            <div className="d-flex align-items-start justify-content-between mb-2">
              <span className="stat-label text-warning-emphasis">Fondo Cocina (40%)</span>
              <div className="stat-icon-wrapper bg-warning-subtle text-warning-emphasis">
                <i className="bi bi-fire"></i>
              </div>
            </div>
            <div className="stat-value kpi-amount text-warning-emphasis">
              S/ {(datos?.totalCocina || 0).toFixed(2)}
            </div>
            <div className="mt-2 small text-muted">
              Equipo de producción de cocina & apoyos
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos Principales */}
      <div className="row g-4 mb-4">
        {/* Gráfico Temporal */}
        <div className="col-lg-8">
          <div className="card p-4 shadow-sm h-100 border-0">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h6 className="fw-bold mb-1 text-slate-900">
                  <i className="bi bi-graph-up text-primary me-2"></i>
                  Evolución Cronológica de Recaudación
                </h6>
                <span className="text-secondary small">
                  Análisis comparativo de montos diarios y distribución semanal
                </span>
              </div>

              {/* Segmented Control */}
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-control-btn ${modoGrafico === 'line' ? 'active' : ''}`}
                  onClick={() => setModoGrafico('line')}
                >
                  <i className="bi bi-activity me-1"></i> Línea Diaria
                </button>
                <button
                  type="button"
                  className={`segmented-control-btn ${modoGrafico === 'bar' ? 'active' : ''}`}
                  onClick={() => setModoGrafico('bar')}
                >
                  <i className="bi bi-bar-chart me-1"></i> Por Día Semana
                </button>
              </div>
            </div>

            <div style={{ position: 'relative', height: '300px' }}>
              <canvas ref={lineChartRef}></canvas>
            </div>
          </div>
        </div>

        {/* Gráfico de Dona */}
        <div className="col-lg-4">
          <div className="card p-4 shadow-sm h-100 border-0 d-flex flex-column">
            <div className="mb-2">
              <h6 className="fw-bold mb-1 text-slate-900">
                <i className="bi bi-pie-chart text-success me-2"></i>
                Prorrateo por Área
              </h6>
              <span className="text-secondary small">
                Distribución legal estatutaria 60/40
              </span>
            </div>

            <div
              style={{ position: 'relative', height: '240px' }}
              className="d-flex justify-content-center align-items-center my-auto"
            >
              <canvas ref={donaChartRef}></canvas>
            </div>

            <div className="p-3 bg-light rounded-3 mt-3 border">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-semibold text-secondary">
                  <i className="bi bi-circle-fill text-success me-1" style={{ fontSize: '0.65rem' }}></i>
                  Salón (60%):
                </span>
                <span className="fw-bold font-mono text-success small">
                  S/ {(datos?.totalSalon || 0).toFixed(2)}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small fw-semibold text-secondary">
                  <i className="bi bi-circle-fill text-warning me-1" style={{ fontSize: '0.65rem' }}></i>
                  Cocina (40%):
                </span>
                <span className="fw-bold font-mono text-warning-emphasis small">
                  S/ {(datos?.totalCocina || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
