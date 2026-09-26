'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModFechasActivasProps {
  currentUser: SessionUser | null;
  onCicloActualizado: () => void;
}

export default function ModFechasActivas({
  currentUser,
  onCicloActualizado,
}: ModFechasActivasProps) {
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [estado, setEstado] = useState('Abierto');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarCiclo();
  }, []);

  const cargarCiclo = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/ciclo');
      const data = await res.json();
      setCargando(false);
      if (data.inicio) setInicio(data.inicio);
      if (data.fin) setFin(data.fin);
      if (data.estado) setEstado(data.estado);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inicio > fin) {
      alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/ciclo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inicio, fin, estado }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        onCicloActualizado();
      }
    } catch (err: any) {
      setCargando(false);
      alert('Error al guardar ciclo: ' + err.message);
    }
  };

  return (
    <div
      className="card p-4 p-sm-5 shadow-sm border-0 bg-white"
      style={{ maxWidth: '580px', margin: '20px auto', borderRadius: '20px' }}
    >
      <div className="text-center mb-4">
        <div
          className="bg-danger-subtle text-danger rounded-circle d-inline-flex justify-content-center align-items-center mb-3 shadow-xs"
          style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}
        >
          <i className="bi bi-calendar-range"></i>
        </div>
        <div className="d-flex justify-content-center align-items-center gap-2 mb-2 flex-wrap">
          <span className="hanko-stamp">
            締め期間
          </span>
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0 fw-bold">
            PARÁMETROS DE SEDE
          </span>
        </div>
        <h4 className="fw-bold mb-1 text-slate-900 d-flex align-items-center justify-content-center gap-2" style={{ letterSpacing: '-0.02em' }}>
          <span>Fechas Activas del Ciclo</span>
          <span className="text-danger-subtle" style={{ fontSize: '1rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>期間設定</span>
        </h4>
        <p className="text-secondary small mb-0">
          Periodo oficial para el cómputo de recaudaciones, liquidaciones y auditorías de propina.
        </p>
      </div>

      <form onSubmit={handleGuardar}>
        <div className="mb-3">
          <label className="form-label small fw-bold text-slate-700 mb-1">
            Fecha de Inicio del Periodo
          </label>
          <div className="input-group">
            <span className="input-group-text bg-white text-secondary border-end-0">
              <i className="bi bi-calendar-event"></i>
            </span>
            <input
              type="date"
              className="form-control border-start-0"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label small fw-bold text-slate-700 mb-1">
            Fecha de Fin del Periodo
          </label>
          <div className="input-group">
            <span className="input-group-text bg-white text-secondary border-end-0">
              <i className="bi bi-calendar-check"></i>
            </span>
            <input
              type="date"
              className="form-control border-start-0"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label small fw-bold text-slate-700 mb-1">Estado Operativo del Ciclo</label>
          <select
            className="form-select"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="Abierto">Abierto (En curso - Permite capturas)</option>
            <option value="Cerrado">Cerrado (Liquidado y Bloqueado)</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 py-2 fs-6 fw-bold shadow-xs rounded-3"
          disabled={cargando}
        >
          {cargando ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span> Guardando...
            </>
          ) : (
            <>
              <i className="bi bi-check2-circle me-1"></i> Guardar y Aplicar Ciclo
            </>
          )}
        </button>
      </form>
    </div>
  );
}
