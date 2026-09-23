'use client';

import React, { useState } from 'react';

interface ModalEliminarMasterProps {
  show: boolean;
  modulo: string;
  idOParam: string | number;
  descripcionVisual: string;
  onClose: () => void;
  onConfirmSuccess: () => void;
}

export default function ModalEliminarMaster({
  show,
  modulo,
  idOParam,
  descripcionVisual,
  onClose,
  onConfirmSuccess,
}: ModalEliminarMasterProps) {
  const [justificacion, setJustificacion] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!show) return null;

  const handleConfirmar = async () => {
    if (!justificacion.trim()) {
      alert('Debe ingresar una justificación obligatoria para la eliminación.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/master/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modulo,
          idOParam,
          justificacion: justificacion.trim(),
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setJustificacion('');
        onClose();
        onConfirmSuccess();
      }
    } catch (e: any) {
      setCargando(false);
      alert('Error al procesar la eliminación: ' + e.message);
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 100000 }}></div>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 100005 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header bg-danger text-white">
              <h6 className="modal-title fw-bold">
                <i className="bi bi-shield-exclamation me-2"></i>
                Eliminación Definitiva de Registro
              </h6>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body p-4">
              <div className="alert alert-danger py-2 px-3 small border mb-3">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                <strong>Acción Crítica:</strong> Esta eliminación es permanente en
                la base de datos y quedará documentada de forma inmutable en la
                bitácora de <strong>Auditoría</strong>.
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">
                  Elemento a eliminar:
                </label>
                <div className="p-2 bg-light rounded border fw-bold text-dark small">
                  {descripcionVisual || 'Registro seleccionado'}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-bold text-danger">
                  Motivo o Justificación Obligatoria *
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  placeholder="Ingrese el motivo detallado de la eliminación..."
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                ></textarea>
              </div>

              <div className="text-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm me-2"
                  onClick={onClose}
                  disabled={cargando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm fw-semibold"
                  onClick={handleConfirmar}
                  disabled={cargando}
                >
                  <i className="bi bi-trash3-fill me-1"></i>
                  {cargando ? 'Eliminando...' : 'Confirmar Eliminación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
