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
    <div className="card p-4 shadow-sm border-0 bg-white" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="text-center mb-3">
        <div
          className="bg-primary text-white rounded-circle d-inline-flex justify-content-center align-items-center mb-2"
          style={{ width: '50px', height: '50px' }}
        >
          <i className="bi bi-calendar-range fs-4"></i>
        </div>
        <h5 className="fw-bold mb-1 text-dark">Asignación de Fechas Activas (Ciclo)</h5>
        <p className="text-muted small">
          Configuración del periodo operativo oficial que rige la liquidación y las métricas por defecto.
        </p>
      </div>

      <form onSubmit={handleGuardar}>
        <div className="mb-3">
          <label className="form-label small fw-semibold">Fecha de Inicio del Ciclo</label>
          <input
            type="date"
            className="form-control"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label small fw-semibold">Fecha de Fin del Ciclo</label>
          <input
            type="date"
            className="form-control"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            required
          />
        </div>

        <div className="mb-4">
          <label className="form-label small fw-semibold">Estado del Periodo</label>
          <select
            className="form-select"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="Abierto">Abierto (En curso)</option>
            <option value="Cerrado">Cerrado (Liquidado y Bloqueado)</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 fw-semibold shadow-sm"
          disabled={cargando}
        >
          <i className="bi bi-save me-1"></i> Actualizar Ciclo Activo
        </button>
      </form>
    </div>
  );
}
