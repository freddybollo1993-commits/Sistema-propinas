'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface LoginViewProps {
  onLoginSuccess: (user: SessionUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [recordarUsuario, setRecordarUsuario] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Cargar usuario guardado al iniciar
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('propinas_saved_user');
      if (savedUser) {
        setUser(savedUser);
        setRecordarUsuario(true);
      }
    } catch (e) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const cleanUser = user.trim();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: cleanUser, pass: pass.trim() }),
      });

      const data = await res.json();
      setCargando(false);

      if (data.success && data.user) {
        // Guardar o eliminar usuario según el checkbox de recordar
        try {
          if (recordarUsuario) {
            localStorage.setItem('propinas_saved_user', cleanUser);
          } else {
            localStorage.removeItem('propinas_saved_user');
          }
        } catch (e) {}

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
          <img
            src="/icons/icon-512x512.png"
            alt="Logo Shimaya Banquero"
            className="rounded-circle d-inline-block mb-3 shadow"
            style={{ width: '85px', height: '85px', objectFit: 'cover', border: '3px solid #f0f4f8' }}
          />
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
              Usuario o Correo de Tienda
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light text-secondary">
                <i className="bi bi-person-badge"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="ej. admin.san-borja o master@empresa.com"
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
              Contraseña / Clave Hexadecimal
            </label>
            <div className="input-group">
              <span className="input-group-text bg-light text-secondary">
                <i className="bi bi-shield-lock"></i>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-control"
                placeholder="ej. 1A5075 o PIN"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
                autoComplete="current-password"
                style={{ letterSpacing: showPass ? '1.5px' : 'normal', fontWeight: showPass ? 600 : 'normal' }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPass(!showPass)}
                title={showPass ? 'Ocultar clave' : 'Mostrar clave'}
              >
                <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="checkRecordarUsuario"
                checked={recordarUsuario}
                onChange={(e) => setRecordarUsuario(e.target.checked)}
              />
              <label
                className="form-check-label small text-secondary fw-semibold"
                htmlFor="checkRecordarUsuario"
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                Recordar usuario
              </label>
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
