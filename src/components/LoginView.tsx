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
        try {
          if (recordarUsuario) {
            localStorage.setItem('propinas_saved_user', cleanUser);
          } else {
            localStorage.removeItem('propinas_saved_user');
          }
        } catch (e) {}

        onLoginSuccess(data.user);
      } else {
        setError(data.message || 'Credenciales no válidas o acceso denegado.');
      }
    } catch (err: any) {
      setCargando(false);
      setError('Error de conexión con el servidor: ' + err.message);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center position-relative overflow-hidden"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 15%, #18202e 0%, #0c1017 60%, #05070a 100%)',
        padding: '24px 16px',
      }}
    >
      {/* Subtle Japanese Seigaiha Pattern Background */}
      <div
        className="position-absolute w-100 h-100 pointer-events-none pattern-seigaiha"
        style={{
          top: 0,
          left: 0,
          opacity: 0.65,
          zIndex: 0,
        }}
      ></div>

      {/* Decorative Ambient Lighting Torii Glow & Bamboo Matcha Halo */}
      <div
        className="position-absolute rounded-circle pointer-events-none"
        style={{
          width: '560px',
          height: '560px',
          background: 'radial-gradient(circle, rgba(217, 45, 32, 0.22) 0%, rgba(217, 45, 32, 0) 70%)',
          top: '-140px',
          left: '8%',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      ></div>
      <div
        className="position-absolute rounded-circle pointer-events-none"
        style={{
          width: '480px',
          height: '480px',
          background: 'radial-gradient(circle, rgba(18, 184, 134, 0.14) 0%, rgba(18, 184, 134, 0) 70%)',
          bottom: '-120px',
          right: '10%',
          filter: 'blur(70px)',
          zIndex: 0,
        }}
      ></div>

      {/* Japanese Kanji Watermark In Background */}
      <div
        className="position-absolute kanji-watermark text-white"
        style={{
          fontSize: '28vw',
          bottom: '-5vw',
          right: '-2vw',
          zIndex: 0,
          letterSpacing: '-0.05em',
        }}
      >
        嶋屋
      </div>

      {/* Login Card Shoji Glassmorphism */}
      <div
        className="card border-0 shadow-lg position-relative"
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2)',
          zIndex: 1,
        }}
      >
        {/* Top Torii Accent Line */}
        <div
          style={{
            height: '4px',
            width: '100%',
            background: 'linear-gradient(90deg, #c92a2a 0%, #fa5252 50%, #c92a2a 100%)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
          }}
        ></div>

        <div className="card-body p-4 p-sm-5">
          {/* Header & Logo */}
          <div className="text-center mb-4">
            <div className="position-relative d-inline-block mb-3">
              <img
                src="/icons/icon-512x512.png"
                alt="Logo Shimaya"
                className="rounded-circle shadow"
                style={{
                  width: '86px',
                  height: '86px',
                  objectFit: 'cover',
                  border: '3px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(201, 42, 42, 0.35)',
                }}
              />
              <span
                className="position-absolute bottom-0 end-0 badge rounded-pill bg-success p-1 border border-2 border-white shadow-sm"
                title="Sistema En Línea"
              >
                <span className="visually-hidden">En línea</span>
              </span>
            </div>

            {/* Hanko & Brand Badges */}
            <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
              <span className="hanko-stamp">
                <i className="bi bi-shield-check me-1"></i> 公式認証
              </span>
              <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0 fw-bold text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                Portal Multi-Sede
              </span>
            </div>

            <h3 className="fw-bold text-dark mb-1 d-flex align-items-center justify-content-center gap-2" style={{ letterSpacing: '-0.02em' }}>
              <span>Gestión de Propinas</span>
              <span className="text-danger" style={{ fontSize: '1.05rem', fontFamily: 'Noto Sans JP', fontWeight: 700 }}>嶋屋</span>
            </h3>
            <p className="text-secondary small mb-0">
              Ingresa con tus credenciales de sede o perfil corporativo.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger py-2 px-3 small border border-danger-subtle rounded-3 mb-4 d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-triangle-fill fs-6 flex-shrink-0 text-danger"></i>
              <div>{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-bold text-slate-700 mb-0">
                  Usuario o Correo de Tienda
                </label>
                <span className="text-muted" style={{ fontSize: '0.7rem' }}>ID Sede / Master</span>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light text-secondary border-end-0">
                  <i className="bi bi-person-badge"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-1"
                  placeholder="ej. admin.san-borja o master@empresa.com"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-bold text-slate-700 mb-0">
                  Contraseña / Clave Hex
                </label>
                <span className="text-muted font-mono" style={{ fontSize: '0.7rem' }}>PIN / Hex</span>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light text-secondary border-end-0">
                  <i className="bi bi-shield-lock"></i>
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-control border-start-0 border-end-0 ps-1 font-mono"
                  placeholder="ej. 1A5075 o clave"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{
                    letterSpacing: showPass ? '1px' : 'normal',
                    fontWeight: showPass ? 600 : 'normal',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0 bg-light"
                  onClick={() => setShowPass(!showPass)}
                  title={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  <i className={`bi ${showPass ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-secondary`}></i>
                </button>
              </div>
            </div>

            {/* Checkbox Recordar */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="checkRecordarUsuario"
                  checked={recordarUsuario}
                  onChange={(e) => setRecordarUsuario(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label
                  className="form-check-label small text-secondary fw-semibold user-select-none"
                  htmlFor="checkRecordarUsuario"
                  style={{ cursor: 'pointer' }}
                >
                  Recordar mi usuario
                </label>
              </div>
            </div>

            {/* Submit Button - Torii Red Lacquer */}
            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fs-6 fw-bold shadow-sm rounded-3 d-flex align-items-center justify-content-center gap-2"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Autenticando y conectando...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right fs-5"></i>
                  <span>Ingresar al Sistema</span>
                  <span className="badge bg-white text-danger py-0 px-2 fw-bold font-mono ms-1" style={{ fontSize: '0.68rem' }}>
                    入室
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer Routing Info with Japanese Enterprise Tone */}
          <div className="mt-4 pt-3 border-top text-center">
            <div className="d-flex align-items-center justify-content-center gap-1 text-dark fw-semibold small mb-1">
              <i className="bi bi-shield-check text-danger"></i> Enrutamiento Inteligente por Sucursal
            </div>
            <p className="text-secondary small mb-0" style={{ fontSize: '0.78rem' }}>
              Cada colaborador y administrador accede de forma aislada a las finanzas y colaboradores de su sede.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
