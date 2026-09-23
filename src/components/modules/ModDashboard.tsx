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

          lineChartInst.current = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels.length > 0 ? labels : ['Sin datos'],
              datasets: [
                {
                  label: 'Recaudación Diaria (S/)',
                  data: values.length > 0 ? values : [0],
                  borderColor: '#0284c7',
                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                  fill: true,
                  tension: 0.35,
                  pointRadius: 4,
                  pointBackgroundColor: '#0284c7',
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } },
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
                  backgroundColor: '#3b82f6',
                  borderRadius: 6,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } },
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
                backgroundColor: ['#22c55e', '#eab308'],
                hoverOffset: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
            },
            cutout: '70%',
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
      {/* Filtro independiente para el Dashboard */}
      <div className="card p-3 mb-4 shadow-sm border-0 bg-white">
        <div className="row align-items-center g-3">
          <div className="col-md-5">
            <h5 className="fw-bold mb-1">
              <i className="bi bi-speedometer2 text-primary me-2"></i>
              Panel de Control Analítico
            </h5>
            <p className="text-muted small mb-0">
              Visualización de recaudación, fondos de propinas y comparativas temporales.
            </p>
          </div>
          <div className="col-md-7">
            <form
              className="row g-2 justify-content-md-end align-items-center"
              onSubmit={handleFiltrar}
            >
              <div className="col-auto">
                <span className="small fw-semibold text-secondary">Filtro de Análisis:</span>
              </div>
              <div className="col-auto">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fInicio}
                  onChange={(e) => setFInicio(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <span className="text-muted small">a</span>
              </div>
              <div className="col-auto">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={fFin}
                  onChange={(e) => setFFin(e.target.value)}
                />
              </div>
              <div className="col-auto">
                <button type="submit" className="btn btn-primary btn-sm px-3" disabled={cargando}>
                  <i className="bi bi-funnel me-1"></i> Filtrar
                </button>
              </div>
              <div className="col-auto">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleRestablecerCiclo}
                >
                  Ciclo Activo
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="row g-3 mb-4">
        <div className="col-md-2 col-6">
          <div className="card p-3 border-start border-primary border-4 shadow-sm h-100">
            <span className="text-muted small fw-semibold">Total Recaudado</span>
            <h4 className="fw-bold text-primary mt-1 mb-1">
              S/ {(datos?.totalRecaudado || 0).toFixed(2)}
            </h4>
            <span className="small text-muted">
              {datos?.crecimiento && datos?.crecimiento !== '--' ? (
                <span className="text-success fw-bold">
                  <i className="bi bi-arrow-up-right"></i> {datos.crecimiento}
                </span>
              ) : (
                'Primer ciclo'
              )}
            </span>
          </div>
        </div>

        <div className="col-md-2 col-6">
          <div className="card p-3 border-start border-secondary border-4 shadow-sm h-100">
            <span className="text-muted small fw-semibold">Promedio Diario</span>
            <h4 className="fw-bold text-secondary mt-1 mb-1">
              S/ {(datos?.promedioPropinaDia || 0).toFixed(2)}
            </h4>
            <span className="small text-muted">Por jornada registrada</span>
          </div>
        </div>

        <div className="col-md-2 col-6">
          <div className="card p-3 border-start border-success border-4 shadow-sm h-100">
            <span className="text-muted small fw-semibold">Fondo Salón (60%)</span>
            <h4 className="fw-bold text-success mt-1 mb-1">
              S/ {(datos?.totalSalon || 0).toFixed(2)}
            </h4>
            <span className="small text-muted">FOH proporcional</span>
          </div>
        </div>

        <div className="col-md-2 col-6">
          <div className="card p-3 border-start border-warning border-4 shadow-sm h-100">
            <span className="text-muted small fw-semibold">Fondo Cocina (40%)</span>
            <h4 className="fw-bold text-warning mt-1 mb-1">
              S/ {(datos?.totalCocina || 0).toFixed(2)}
            </h4>
            <span className="small text-muted">BOH proporcional</span>
          </div>
        </div>

        <div className="col-md-4 col-12">
          <div className="card p-3 border-start border-info border-4 shadow-sm h-100">
            <span className="text-muted small fw-semibold">Total Liquidado a la Fecha</span>
            <h4 className="fw-bold text-info mt-1 mb-1">
              S/ {(datos?.totalLiquidado || 0).toFixed(2)}
            </h4>
            <span className="small text-muted">Total asignado por horas</span>
          </div>
        </div>
      </div>

      {/* Gráficos Principales */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card p-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-graph-up text-primary me-2"></i>
                Evolución de Recaudación: Cronología y Días de la Semana
              </h6>
              <div className="btn-group btn-group-sm">
                <button
                  className={`btn btn-outline-primary ${modoGrafico === 'line' ? 'active' : ''}`}
                  onClick={() => setModoGrafico('line')}
                >
                  Tendencia Diaria
                </button>
                <button
                  className={`btn btn-outline-primary ${modoGrafico === 'bar' ? 'active' : ''}`}
                  onClick={() => setModoGrafico('bar')}
                >
                  Por Día de Semana
                </button>
              </div>
            </div>
            <div style={{ position: 'relative', height: '280px' }}>
              <canvas ref={lineChartRef}></canvas>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card p-4 shadow-sm">
            <h6 className="fw-bold mb-3 text-dark">
              <i className="bi bi-pie-chart text-success me-2"></i>
              Distribución de Fondos
            </h6>
            <div
              style={{ position: 'relative', height: '240px' }}
              className="d-flex justify-content-center align-items-center"
            >
              <canvas ref={donaChartRef}></canvas>
            </div>
            <div className="text-center mt-3 small text-muted">
              <span className="badge bg-success me-2">Salón 60%</span>
              <span className="badge bg-warning text-dark">Cocina 40%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
