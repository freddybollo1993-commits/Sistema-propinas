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
      style={{ minHeight: '100vh', background: '#0f172a', padding: '20px' }}
    >
      <div
        className="card p-4 shadow-lg border-0"
        style={{ width: '100%', maxWidth: '420px', borderRadius: '16px' }}
      >
        <div className="text-center mb-4">
          <div
            className="bg-primary text-white rounded-circle d-inline-flex justify-content-center align-items-center mb-3 shadow"
            style={{ width: '65px', height: '65px' }}
          >
            <i className="bi bi-cash-coin fs-2"></i>
          </div>
          <h4 className="fw-bold text-dark mb-1">Gestión de Propinas</h4>
          <p className="text-muted small">Restaurante - Acceso Autenticado</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2 px-3 small border mb-3">
            <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-semibold">Correo o ID de Usuario</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-person text-secondary"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="admin@empresa.com o USR-MASTER"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-semibold">Contraseña / PIN</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-key text-secondary"></i>
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
            className="btn btn-primary w-100 py-2 fw-semibold shadow-sm"
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Autenticando...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right me-1"></i> Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center text-muted small border-top pt-3">
          <span>Niveles de Acceso: Administrador, Supervisor, Moderador</span>
        </div>
      </div>
    </div>
  );
}
