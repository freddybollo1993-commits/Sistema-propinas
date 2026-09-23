'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModLiquidacionProps {
  currentUser: SessionUser | null;
  cicloInfo: { inicio: string; fin: string; estado: string } | null;
}

export default function ModLiquidacion({
  currentUser,
  cicloInfo,
}: ModLiquidacionProps) {
  const [fInicio, setFInicio] = useState('');
  const [fFin, setFFin] = useState('');
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  // Boleta Individual Modal
  const [boletaModal, setBoletaModal] = useState<{
    show: boolean;
    colaborador: any;
    fechaEmision: string;
    periodoTexto: string;
  }>({ show: false, colaborador: null, fechaEmision: '', periodoTexto: '' });

  useEffect(() => {
    if (cicloInfo) {
      setFInicio(cicloInfo.inicio || '');
      setFFin(cicloInfo.fin || '');
      cargarLiquidacion({ inicio: cicloInfo.inicio, fin: cicloInfo.fin });
    } else {
      cargarLiquidacion();
    }
  }, [cicloInfo]);

  const cargarLiquidacion = async (filtro?: { inicio?: string; fin?: string }) => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (filtro?.inicio) params.set('inicio', filtro.inicio);
      if (filtro?.fin) params.set('fin', filtro.fin);

      const res = await fetch(`/api/liquidacion?${params.toString()}`);
      const data = await res.json();
      setDatos(data);
      setCargando(false);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarLiquidacion({ inicio: fInicio, fin: fFin });
  };

  const handleRestablecerCiclo = () => {
    if (cicloInfo) {
      setFInicio(cicloInfo.inicio || '');
      setFFin(cicloInfo.fin || '');
      cargarLiquidacion({ inicio: cicloInfo.inicio, fin: cicloInfo.fin });
    }
  };

  const handleVerTodo = () => {
    setFInicio('');
    setFFin('');
    cargarLiquidacion({ inicio: '', fin: '' });
  };

  const handleAbrirBoleta = (c: any) => {
    const ahora = new Date();
    const fechaEmision =
      ahora.toLocaleDateString('es-PE') +
      ' ' +
      ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const periodoTexto = fInicio && fFin ? `${fInicio} al ${fFin}` : 'Ciclo Completo';

    setBoletaModal({
      show: true,
      colaborador: c,
      fechaEmision,
      periodoTexto,
    });
  };

  // Impresión Planilla A4 Horizontal
  const handleImprimirPlanilla = () => {
    if (!datos?.lista || datos.lista.length === 0) {
      alert('No hay datos de liquidación para imprimir.');
      return;
    }

    document.body.classList.add('imprimiendo-planilla');
    document.body.classList.remove('imprimiendo-boleta');

    let stylePage = document.getElementById('dynamicPageStyle');
    if (!stylePage) {
      stylePage = document.createElement('style');
      stylePage.id = 'dynamicPageStyle';
      document.head.appendChild(stylePage);
    }
    stylePage.innerHTML = '@page { size: A4 landscape; margin: 5mm 7mm; }';

    window.print();

    setTimeout(() => {
      document.body.classList.remove('imprimiendo-planilla');
    }, 1000);
  };

  // Impresión Boleta A4 Portrait
  const handleImprimirBoleta = () => {
    document.body.classList.add('imprimiendo-boleta');
    document.body.classList.remove('imprimiendo-planilla');

    let stylePage = document.getElementById('dynamicPageStyle');
    if (!stylePage) {
      stylePage = document.createElement('style');
      stylePage.id = 'dynamicPageStyle';
      document.head.appendChild(stylePage);
    }
    stylePage.innerHTML = '@page { size: A4 portrait; margin: 6mm 8mm; }';

    window.print();

    setTimeout(() => {
      document.body.classList.remove('imprimiendo-boleta');
    }, 1000);
  };

  const esFondo = datos?.modoActivo === 'FONDO_MANCOMUNADO';
  const fondoLiq = datos?.fondoMancomunado;

  return (
    <div className="container-fluid p-0">
      {/* Filtro de Periodo */}
      <div className="card p-3 mb-4 shadow-sm border-0 bg-white no-print">
        <div className="row align-items-center g-3">
          <div className="col-md-5">
            <h5 className="fw-bold mb-1">
              <i className="bi bi-file-earmark-spreadsheet text-primary me-2"></i>
              Reportería y Liquidación de Propinas
            </h5>
            <p className="text-muted small mb-0">
              Consolidado administrativo por horas efectivas y emisión de boletas individuales.
            </p>
          </div>
          <div className="col-md-7">
            <form className="row g-2 justify-content-md-end align-items-center" onSubmit={handleFiltrar}>
              <div className="col-auto">
                <span className="small fw-semibold text-secondary">Periodo:</span>
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
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleRestablecerCiclo}>
                  Ciclo Activo
                </button>
              </div>
              <div className="col-auto">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleVerTodo}>
                  Ver Todo
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Banner de Fondo Mancomunado si aplica */}
      {esFondo && fondoLiq && (
        <div className="alert alert-success d-flex justify-content-between align-items-center py-2 px-3 mb-4 shadow-sm no-print">
          <div>
            <i className="bi bi-piggy-bank-fill me-2 fs-5"></i>
            <strong>Modalidad Fondo Mancomunado Activa:</strong> Las sanciones alimentan el fondo común del equipo.
          </div>
          <span className="badge bg-success fs-6">
            Saldo Acumulado: S/ {(fondoLiq.saldoDisponibleActual || 0).toFixed(2)}
          </span>
        </div>
      )}

      {/* Resumen Consolidado de Administración Interna */}
      <div className="card p-4 mb-4 bg-light border-0 shadow-sm no-print">
        <h6 className="fw-bold text-uppercase small text-muted mb-3">
          <i className="bi bi-calculator me-1"></i> Resumen Consolidado de Administración Interna
        </h6>
        <div className="row text-center g-3">
          <div className="col-md-2 col-6">
            <div className="p-2 bg-white rounded border h-100">
              <div className="small text-muted">Horas Computadas</div>
              <div className="fw-bold fs-6 mt-1 text-dark">
                {datos?.horasSalon || 0} hrs Salón / {datos?.horasCocina || 0} hrs Cocina
              </div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="p-2 bg-white rounded border h-100">
              <div className="small text-muted">Total Bruto Propinas</div>
              <div className="fw-bold fs-5 mt-1 text-primary">
                S/ {(datos?.totalBruto || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="p-2 bg-white rounded border h-100">
              <div className="small text-muted">Total Deducciones</div>
              <div className="fw-bold fs-5 mt-1 text-danger">
                S/ {(datos?.totalDeducciones || 0).toFixed(2)}
              </div>
              <div className="small text-muted">(Sanciones + Adelantos)</div>
            </div>
          </div>
          <div className="col-md-2 col-6">
            <div className="p-2 bg-white rounded border h-100">
              <div className="small text-muted">
                {esFondo ? 'Fondo Mancomunado' : 'Fondo Redistribuido'}
              </div>
              <div className="fw-bold fs-5 mt-1 text-success">
                S/{' '}
                {esFondo && fondoLiq
                  ? (fondoLiq.totalIngresosCiclo || 0).toFixed(2)
                  : (datos?.totalRedistribuido || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="col-md-3 col-12">
            <div className="p-2 bg-white rounded border border-primary h-100">
              <div className="small fw-bold text-primary text-uppercase">NETO GENERAL A PAGAR</div>
              <div className="fw-bold fs-4 mt-1 text-primary">
                S/ {(datos?.totalNetoGeneral || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Liquidación por Colaborador */}
      <div className="card p-4 shadow-sm border-0 bg-white no-print">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h6 className="fw-bold mb-0 text-dark">
              <i className="bi bi-table text-primary me-2"></i>
              Desglose Individual por Colaborador
            </h6>
            <span className="text-muted small">
              Todos los colaboradores activos se encuentran sincronizados automáticamente.
            </span>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-success btn-sm fw-semibold shadow-sm me-2"
              onClick={handleImprimirPlanilla}
            >
              <i className="bi bi-printer-fill me-1"></i> Imprimir Hoja de Liquidación A4
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => cargarLiquidacion({ inicio: fInicio, fin: fFin })}
            >
              <i className="bi bi-arrow-clockwise me-1"></i> Actualizar
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle small mb-0">
            <thead className="table-light">
              <tr>
                <th>Colaborador</th>
                <th>Área</th>
                <th>Días Trab.</th>
                <th>Horas Trab.</th>
                <th>Propina Bruta</th>
                <th>Deducciones (Sanc. + Adel.)</th>
                <th>{esFondo ? 'Fondo Común' : 'Bono Redistribución'}</th>
                <th>Monto Neto Final</th>
                <th className="text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {!datos?.lista || datos.lista.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-4">
                    No hay colaboradores registrados en el sistema.
                  </td>
                </tr>
              ) : (
                datos.lista.map((c: any) => {
                  const esApoyo = c.area.includes('Apoyo');
                  return (
                    <tr key={c.colaborador}>
                      <td>
                        <strong>{c.colaborador}</strong>
                        {c.perdidaTotal && (
                          <span
                            className="badge bg-danger ms-1"
                            title="Pérdida de 100% por reincidencia de sanciones"
                          >
                            100% Retenido
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            esApoyo
                              ? 'bg-warning text-dark border border-warning'
                              : 'bg-light text-dark border'
                          }`}
                        >
                          {c.area}
                        </span>
                      </td>
                      <td>{c.diasTrabajados} días</td>
                      <td>{c.horasTrabajadas.toFixed(1)} hrs</td>
                      <td className="text-primary fw-semibold">S/ {c.propinaBruta.toFixed(2)}</td>
                      <td className="text-danger">S/ {c.deducciones.toFixed(2)}</td>
                      <td>
                        {esFondo ? (
                          <span
                            className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25"
                            title="Sanciones destinadas al Fondo Mancomunado"
                          >
                            <i className="bi bi-piggy-bank me-1"></i>Fondo
                          </span>
                        ) : esApoyo ? (
                          <span className="text-muted small">
                            S/ 0.00{' '}
                            <span className="badge bg-light text-secondary border">Apoyo</span>
                          </span>
                        ) : c.bonoRedistribucion > 0 ? (
                          <span className="text-success fw-semibold">
                            + S/ {c.bonoRedistribucion.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted small">S/ 0.00</span>
                        )}
                      </td>
                      <td className="fw-bold text-dark fs-6">S/ {c.montoNeto.toFixed(2)}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm py-0 px-2"
                          onClick={() => handleAbrirBoleta(c)}
                        >
                          <i className="bi bi-file-text me-1"></i> Boleta
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

      {/* ========================================================= */}
      {/* MODAL: BOLETA INDIVIDUAL (1 HOJA A4 PORTRAIT) */}
      {/* ========================================================= */}
      {boletaModal.show && boletaModal.colaborador && (
        <>
          <div className="modal-backdrop fade show no-print" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-primary text-white no-print">
                  <h6 className="modal-title fw-bold">
                    <i className="bi bi-receipt me-2"></i>
                    Boleta Individual de Liquidación de Propinas
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setBoletaModal({ show: false, colaborador: null, fechaEmision: '', periodoTexto: '' })}
                  ></button>
                </div>

                <div className="modal-body p-3" id="modalBoletaPrintArea">
                  <div className="boleta-a4-individual">
                    {/* Cabecera Oficial */}
                    <div
                      className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2"
                      style={{ borderBottom: '2px solid #0f172a !important' }}
                    >
                      <div>
                        <h5
                          className="fw-bold mb-0 text-uppercase text-dark"
                          style={{ fontSize: '12pt', letterSpacing: '0.5px' }}
                        >
                          BOLETA DE LIQUIDACIÓN DE PROPINAS
                        </h5>
                        <span className="text-muted" style={{ fontSize: '7.5pt' }}>
                          COMPROBANTE OFICIAL DE ENTREGA QUINCENAL
                        </span>
                      </div>
                      <div className="text-end" style={{ fontSize: '7.5pt' }}>
                        <div>
                          <strong>Periodo Liquidado:</strong> <span>{boletaModal.periodoTexto}</span>
                        </div>
                        <div>
                          <strong>Fecha de Emisión:</strong> <span>{boletaModal.fechaEmision}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ficha del Colaborador */}
                    <div className="mb-2">
                      <table className="table-info-colab">
                        <tbody>
                          <tr>
                            <td className="lbl">Colaborador:</td>
                            <td className="val-name">{boletaModal.colaborador.colaborador}</td>
                            <td className="lbl">Área:</td>
                            <td className="val">{boletaModal.colaborador.area}</td>
                            <td className="lbl">Días Trab.:</td>
                            <td className="val">{boletaModal.colaborador.diasTrabajados} días</td>
                            <td className="lbl">Horas Acum.:</td>
                            <td className="val">
                              {boletaModal.colaborador.horasTrabajadas.toFixed(1)} hrs
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Contenedor 2 Columnas */}
                    <div className="boleta-grid-2col">
                      {/* COLUMNA IZQUIERDA: 1. Jornadas Diarias + 2. Resumen Contable */}
                      <div className="boleta-col-izq">
                        {/* 1. Jornadas Diarias */}
                        <div className="mb-2">
                          <div className="boleta-box-title d-flex justify-content-between">
                            <span>
                              <i className="bi bi-calendar-check me-1"></i> 1. Jornadas y Propinas Diarias
                            </span>
                            <span className="fw-bold text-primary">
                              S/ {boletaModal.colaborador.propinaBruta.toFixed(2)}
                            </span>
                          </div>
                          <table className="tabla-boleta-dias">
                            <thead>
                              <tr>
                                <th style={{ width: '28%' }}>Fecha</th>
                                <th style={{ width: '27%' }}>Turno / ID</th>
                                <th style={{ width: '20%' }}>Horas</th>
                                <th style={{ width: '25%' }} className="text-end">
                                  Propina (S/)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {boletaModal.colaborador.detalleDias.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="text-center text-muted py-2">
                                    No registra jornadas trabajadas en este ciclo.
                                  </td>
                                </tr>
                              ) : (
                                boletaModal.colaborador.detalleDias.map((d: any, idx: number) => (
                                  <tr key={idx}>
                                    <td>
                                      <i className="bi bi-calendar-check text-success me-1"></i>
                                      {d.fecha}
                                    </td>
                                    <td>Reg #{d.idRegistro}</td>
                                    <td className="text-center">{d.horas.toFixed(1)} hrs</td>
                                    <td className="text-end fw-semibold text-primary">
                                      S/ {d.propina.toFixed(2)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <th colSpan={2} style={{ textAlign: 'right' }}>
                                  TOTAL BRUTO:
                                </th>
                                <th>{boletaModal.colaborador.horasTrabajadas.toFixed(1)}h</th>
                                <th className="text-end text-primary">
                                  S/ {boletaModal.colaborador.propinaBruta.toFixed(2)}
                                </th>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* 2. Resumen Contable */}
                        <div className="mb-2">
                          <div
                            className="boleta-box-title d-flex justify-content-between"
                            style={{ background: '#e2e8f0', color: '#0f172a' }}
                          >
                            <span>
                              <i className="bi bi-calculator me-1"></i> Resumen Contable de Liquidación
                            </span>
                            <span className="small text-muted">Cálculo Oficial</span>
                          </div>
                          <table className="tabla-boleta-totales">
                            <tbody>
                              <tr>
                                <td>(+) Propina Bruta Acumulada:</td>
                                <td className="text-end fw-bold">
                                  {boletaModal.colaborador.perdidaTotal
                                    ? 'S/ 0.00 (Retenido 100%)'
                                    : `S/ ${boletaModal.colaborador.propinaBruta.toFixed(2)}`}
                                </td>
                              </tr>
                              <tr className="text-danger">
                                <td>(-) Deducciones por Sanciones:</td>
                                <td className="text-end">
                                  - S/ {boletaModal.colaborador.sanciones.toFixed(2)}
                                </td>
                              </tr>
                              <tr className="text-danger">
                                <td>(-) Deducciones por Adelantos:</td>
                                <td className="text-end">
                                  - S/ {boletaModal.colaborador.adelantos.toFixed(2)}
                                </td>
                              </tr>
                              {!esFondo && (
                                <tr className="text-success">
                                  <td>(+) Bonificación Equitativa:</td>
                                  <td className="text-end">
                                    + S/ {boletaModal.colaborador.bonoRedistribucion.toFixed(2)}
                                  </td>
                                </tr>
                              )}
                              <tr className="row-neto-final">
                                <td className="lbl-neto">MONTO NETO A PERCIBIR (S/):</td>
                                <td className="text-end val-neto">
                                  S/ {boletaModal.colaborador.montoNeto.toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* COLUMNA DERECHA: Sanciones, Adelantos y Fondo/Bono */}
                      <div className="boleta-col-der">
                        {/* 3. Sanciones Disciplinarias */}
                        <div className="mb-2">
                          <div className="boleta-box-title text-danger d-flex justify-content-between">
                            <span>
                              <i className="bi bi-exclamation-octagon-fill me-1"></i> 2. Sanciones Disciplinarias
                            </span>
                            <span className="fw-bold text-danger">
                              - S/ {boletaModal.colaborador.sanciones.toFixed(2)}
                            </span>
                          </div>
                          <table className="tabla-boleta-sub">
                            <thead>
                              <tr>
                                <th style={{ width: '28%' }}>Fecha</th>
                                <th style={{ width: '47%' }}>Infracción</th>
                                <th style={{ width: '25%' }} className="text-end">
                                  Monto
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {boletaModal.colaborador.detalleSanciones.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-center text-success py-1" style={{ fontSize: '7pt' }}>
                                    <i className="bi bi-check-circle me-1"></i>Sin sanciones en el periodo (S/ 0.00).
                                  </td>
                                </tr>
                              ) : (
                                boletaModal.colaborador.detalleSanciones.map((s: any, idx: number) => (
                                  <tr key={idx}>
                                    <td>{s.fecha}</td>
                                    <td>
                                      <strong className="text-danger">{s.infraccion}</strong>
                                    </td>
                                    <td className="text-end fw-semibold text-danger">
                                      - S/ {parseFloat(s.monto).toFixed(2)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* 4. Adelantos de Propinas */}
                        <div className="mb-2">
                          <div
                            className="boleta-box-title d-flex justify-content-between"
                            style={{ color: '#b45309' }}
                          >
                            <span>
                              <i className="bi bi-cash-stack me-1"></i> 3. Adelantos de Propinas
                            </span>
                            <span className="fw-bold" style={{ color: '#b45309' }}>
                              - S/ {boletaModal.colaborador.adelantos.toFixed(2)}
                            </span>
                          </div>
                          <table className="tabla-boleta-sub">
                            <thead>
                              <tr>
                                <th style={{ width: '28%' }}>Fecha</th>
                                <th style={{ width: '47%' }}>Concepto / Detalle</th>
                                <th style={{ width: '25%' }} className="text-end">
                                  Monto
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {boletaModal.colaborador.detalleAdelantos.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-center text-muted py-1" style={{ fontSize: '7pt' }}>
                                    Sin adelantos registrados en el ciclo (S/ 0.00).
                                  </td>
                                </tr>
                              ) : (
                                boletaModal.colaborador.detalleAdelantos.map((a: any, idx: number) => (
                                  <tr key={idx}>
                                    <td>{a.fecha}</td>
                                    <td>
                                      <strong>{a.concepto}</strong>
                                    </td>
                                    <td className="text-end fw-semibold text-danger">
                                      - S/ {parseFloat(a.monto).toFixed(2)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* 5. Bonificación / Fondo */}
                        <div className="mb-2">
                          <div className="boleta-box-title text-success d-flex justify-content-between">
                            <span>
                              <i className="bi bi-gift-fill me-1"></i>{' '}
                              {esFondo ? '4. Fondo Mancomunado' : '4. Bono Redistribución'}
                            </span>
                            <span className="fw-bold text-success">
                              {esFondo
                                ? 'Fondo Común'
                                : `+ S/ ${boletaModal.colaborador.bonoRedistribucion.toFixed(2)}`}
                            </span>
                          </div>
                          <div
                            className="p-1 px-2 text-muted border border-top-0 bg-light"
                            style={{ fontSize: '7pt' }}
                          >
                            {boletaModal.colaborador.motivoBono}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN DE FIRMAS DE CONFORMIDAD */}
                    <div className="boleta-firmas-container mt-2">
                      <div className="row-firmas-boleta">
                        <div className="box-firma-boleta">
                          <div className="linea-firma-boleta"></div>
                          <div className="fw-bold" style={{ fontSize: '8pt', color: '#0f172a' }}>
                            RECIBIDO CONFORME
                          </div>
                          <div className="text-muted" style={{ fontSize: '7pt' }}>
                            Firma del Trabajador
                          </div>
                          <div style={{ fontSize: '7pt', color: '#475569' }}>
                            DNI: _________________________ Fecha: ___/___/______
                          </div>
                        </div>
                        <div className="box-firma-boleta">
                          <div className="linea-firma-boleta"></div>
                          <div className="fw-bold" style={{ fontSize: '8pt', color: '#0f172a' }}>
                            ENTREGADO Y AUTORIZADO
                          </div>
                          <div className="text-muted" style={{ fontSize: '7pt' }}>
                            Administración / Restaurante
                          </div>
                          <div style={{ fontSize: '7pt', color: '#475569' }}>
                            Sello y Firma del Administrador
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer no-print">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setBoletaModal({ show: false, colaborador: null, fechaEmision: '', periodoTexto: '' })}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm fw-semibold"
                    onClick={handleImprimirBoleta}
                  >
                    <i className="bi bi-printer me-1"></i> Imprimir Boleta A4
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* CONTENEDOR DE IMPRESIÓN OFICIAL: 1 HOJA A4 EN VISTA HORIZONTAL */}
      {/* ========================================================= */}
      <div id="printPlanillaA4" style={{ display: 'none' }}>
        <div className="hoja-a4-horizontal">
          {/* Cabecera Institucional */}
          <div
            className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-1"
            style={{ borderBottom: '2px solid #0f172a !important' }}
          >
            <div>
              <h5
                className="fw-bold mb-0 text-uppercase text-dark"
                style={{ fontSize: '11pt', letterSpacing: '0.5px' }}
              >
                PLANILLA CONSOLIDADA DE LIQUIDACIÓN DE PROPINAS
              </h5>
              <span className="text-muted" style={{ fontSize: '7.5pt' }}>
                REPORTE OFICIAL DE CIERRE QUINCENAL
              </span>
            </div>
            <div className="text-end" style={{ fontSize: '7.5pt' }}>
              <div>
                <strong>Ciclo Operativo:</strong>{' '}
                <span>{fInicio && fFin ? `${fInicio} al ${fFin}` : 'Ciclo Completo'}</span>
              </div>
              <div>
                <strong>Fecha y Hora de Emisión:</strong>{' '}
                <span>{new Date().toLocaleString('es-PE')}</span>
              </div>
            </div>
          </div>

          {/* Resumen Ejecutivo en 1 Fila Horizontal */}
          <table className="table-resumen-print">
            <tbody>
              <tr>
                <td className="lbl">Horas Salón / Cocina:</td>
                <td className="val">
                  {datos?.horasSalon || 0} hrs / {datos?.horasCocina || 0} hrs
                </td>
                <td className="lbl">Total Bruto Propinas:</td>
                <td className="val text-primary">S/ {(datos?.totalBruto || 0).toFixed(2)}</td>
                <td className="lbl">Total Deducciones:</td>
                <td className="val text-danger">S/ {(datos?.totalDeducciones || 0).toFixed(2)}</td>
                <td className="lbl">
                  {esFondo ? 'Fondo Mancomunado:' : 'Fondo Redistribuido:'}
                </td>
                <td className="val text-success">
                  S/{' '}
                  {esFondo && fondoLiq
                    ? (fondoLiq.totalIngresosCiclo || 0).toFixed(2)
                    : (datos?.totalRedistribuido || 0).toFixed(2)}
                </td>
                <td className="lbl highlight">NETO GENERAL A PAGAR:</td>
                <td className="val highlight text-primary" style={{ fontSize: '9pt' }}>
                  S/ {(datos?.totalNetoGeneral || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Banner de Fondo Mancomunado si aplica */}
          {esFondo && fondoLiq && (
            <div
              style={{
                fontSize: '7pt',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                padding: '2px 6px',
                marginBottom: '3px',
                color: '#166534',
              }}
            >
              <strong>MODALIDAD FONDO MANCOMUNADO ACTIVA:</strong> Las penalizaciones no se redistribuyen; alimentan el fondo común del personal.
              Saldo Inicial Arrastrado: <strong>S/ {(fondoLiq.saldoInicialCiclo || 0).toFixed(2)}</strong> | Ingresos Ciclo: <strong>S/ {(fondoLiq.totalIngresosCiclo || 0).toFixed(2)}</strong> | Retiros Comunes: <strong>S/ {(fondoLiq.totalRetirosCiclo || 0).toFixed(2)}</strong> | Saldo Remanente que pasa a la siguiente quincena: <strong>S/ {(fondoLiq.saldoCicloRemanente || 0).toFixed(2)}</strong>.
            </div>
          )}

          {/* Tabla Consolidada de Liquidación */}
          <table className="tabla-planilla-print">
            <thead>
              <tr>
                <th style={{ width: '22px' }}>N°</th>
                <th style={{ width: '145px', textAlign: 'left' }}>Colaborador</th>
                <th style={{ width: '60px' }}>Área</th>
                <th style={{ width: '35px' }}>Días</th>
                <th style={{ width: '45px' }}>Horas</th>
                <th style={{ width: '75px' }}>Propina Bruta</th>
                <th style={{ width: '65px' }}>Adelantos</th>
                <th style={{ width: '65px' }}>Sanciones</th>
                <th style={{ width: '75px' }}>
                  {esFondo ? 'Bono / Fondo' : 'Bono Redist.'}
                </th>
                <th style={{ width: '85px' }}>Neto a Pagar</th>
                <th style={{ width: '145px' }}>Firma de Conformidad</th>
              </tr>
            </thead>
            <tbody>
              {datos?.lista?.map((c: any, idx: number) => {
                const aviso = c.perdidaTotal ? ' [100% Retenido]' : '';
                return (
                  <tr key={c.colaborador}>
                    <td>{idx + 1}</td>
                    <td className="col-nombre">
                      {c.colaborador}
                      {aviso && (
                        <span style={{ fontSize: '6.5pt', color: '#dc2626', fontWeight: 'bold' }}>
                          {aviso}
                        </span>
                      )}
                    </td>
                    <td>{c.area}</td>
                    <td>{c.diasTrabajados}</td>
                    <td>{c.horasTrabajadas.toFixed(1)}</td>
                    <td>S/ {c.propinaBruta.toFixed(2)}</td>
                    <td style={{ color: '#b91c1c' }}>
                      {c.adelantos > 0 ? `S/ ${c.adelantos.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ color: '#b91c1c' }}>
                      {c.sanciones > 0 ? `S/ ${c.sanciones.toFixed(2)}` : '-'}
                    </td>
                    <td>
                      {esFondo ? (
                        <span style={{ color: '#15803d', fontSize: '7pt' }}>Fondo</span>
                      ) : c.bonoRedistribucion > 0 ? (
                        `+S/ ${c.bonoRedistribucion.toFixed(2)}`
                      ) : (
                        'S/ 0.00'
                      )}
                    </td>
                    <td className="col-neto">S/ {c.montoNeto.toFixed(2)}</td>
                    <td className="col-firma">
                      <div className="linea-firma-trabajador">
                        <span style={{ fontSize: '6pt', color: '#94a3b8' }}>DNI: _____________</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} style={{ textAlign: 'right' }}>
                  TOTALES GENERALES:
                </th>
                <th>
                  {datos?.lista?.reduce((acc: number, c: any) => acc + (c.diasTrabajados || 0), 0) || 0}
                </th>
                <th>
                  {datos?.lista?.reduce((acc: number, c: any) => acc + (c.horasTrabajadas || 0), 0).toFixed(1) || '0.0'}
                </th>
                <th>S/ {(datos?.totalBruto || 0).toFixed(2)}</th>
                <th style={{ color: '#b91c1c' }}>
                  S/{' '}
                  {datos?.lista
                    ?.reduce((acc: number, c: any) => acc + (c.adelantos || 0), 0)
                    .toFixed(2) || '0.00'}
                </th>
                <th style={{ color: '#b91c1c' }}>
                  S/{' '}
                  {datos?.lista
                    ?.reduce((acc: number, c: any) => acc + (c.sanciones || 0), 0)
                    .toFixed(2) || '0.00'}
                </th>
                <th>
                  {esFondo
                    ? '-'
                    : `S/ ${
                        datos?.lista
                          ?.reduce((acc: number, c: any) => acc + (c.bonoRedistribucion || 0), 0)
                          .toFixed(2) || '0.00'
                      }`}
                </th>
                <th style={{ fontSize: '9pt', background: '#cbd5e1 !important' }}>
                  S/ {(datos?.totalNetoGeneral || 0).toFixed(2)}
                </th>
                <th></th>
              </tr>
            </tfoot>
          </table>

          {/* Firmas Administrativas de Cierre */}
          <div className="pie-firmas-print">
            <div className="row-firmas-print">
              <div className="box-firma-print">
                <div className="linea-guia"></div>
                <strong>Elaborado por (Administración)</strong>
              </div>
              <div className="box-firma-print">
                <div className="linea-guia"></div>
                <strong>Revisado por (Supervisión)</strong>
              </div>
              <div className="box-firma-print">
                <div className="linea-guia"></div>
                <strong>V°B° Aprobado (Gerencia General)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
