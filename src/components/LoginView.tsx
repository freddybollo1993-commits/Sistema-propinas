'use client';

import React, { useState } from 'react';
import { SessionUser } from '@/lib/auth';

interface LoginViewProps {
  onLoginSuccess: (user: SessionUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.trim(), pass: pass.trim() }),
      });

      const data = await res.json();
      setCargando(false);

      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Error al iniciar sesión.');
      }
    } catch (err: any) {
      setCargando(false);
      setError('Error de conexión con el servidor: ' + err.message);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e293b, #0f172a)',
        padding: '20px',
      }}
    >
      <div
        className="card p-4 p-sm-5 shadow-lg border-0"
        style={{ width: '100%', maxWidth: '440px', borderRadius: '20px' }}
      >
        <div className="text-center mb-4">
          <div
            className="bg-primary text-white rounded-circle d-inline-flex justify-content-center align-items-center mb-3 shadow"
            style={{ width: '70px', height: '70px' }}
          >
            <i className="bi bi-buildings fs-2"></i>
          </div>
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 mb-2 fw-semibold">
            Portal Único Multi-Restaurante
          </span>
          <h4 className="fw-bold text-dark mb-1">Gestión Central de Propinas</h4>
          <p className="text-muted small mb-0">
            Ingresa con tus credenciales para ser redirigido automáticamente al entorno de tu tienda asignada.
          </p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small border mb-3 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold text-secondary">
              Usuario o Correo Corporativo
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light text-secondary">
                <i className="bi bi-person-badge"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="admin@empresa.com o USR-MASTER"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold text-secondary">
              Contraseña / Clave de Acceso
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light text-secondary">
                <i className="bi bi-shield-lock"></i>
              </span>
              <input
                type="password"
                className="form-control"
                placeholder="••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-semibold shadow-sm rounded-3"
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Autenticando y enrutando...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-1"></i> Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-muted small border-top pt-3">
          <div className="fw-semibold text-dark mb-1">
            <i className="bi bi-diagram-3 me-1 text-primary"></i> Enrutamiento Inteligente por Credencial
          </div>
          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
            Cada colaborador o administrador accede únicamente a los datos, catálogo y personal de su sucursal autorizada.
          </span>
        </div>
      </div>
    </div>
  );
}
