'use client';

import React, { useState, useEffect } from 'react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar si ya está corriendo como app instalada (standalone)
    const isApp =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isApp) {
      setIsStandalone(true);
      return;
    }

    // Detectar iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIPhoneOrIPad = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      isIPhoneOrIPad &&
      userAgent.includes('safari') &&
      !userAgent.includes('crios') &&
      !userAgent.includes('fxios');

    if (isIPhoneOrIPad && !isApp) {
      setIsIOS(true);
    }

    // Capturar evento de instalación en Chrome / Android / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('PWA instalada exitosamente');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSPrompt(true);
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación de la PWA');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isStandalone || dismissed) {
    return null;
  }

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div
        className="position-fixed bottom-0 start-0 end-0 p-3 no-print"
        style={{ zIndex: 1050 }}
      >
        <div className="card shadow-lg border-0 bg-dark text-white rounded-4 overflow-hidden mx-auto" style={{ maxWidth: '480px' }}>
          <div className="card-body p-3 d-flex align-items-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <img
                src="/icons/icon-192x192.png"
                alt="Logo Shimaya"
                className="rounded-3 shadow-sm bg-white p-1"
                style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              />
              <div>
                <div className="fw-bold text-white small">Instalar App Propinas</div>
                <div className="text-white-50" style={{ fontSize: '0.75rem' }}>
                  Accede más rápido como app independiente
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              {isInstallable && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm fw-semibold px-3 py-1 shadow-sm text-nowrap rounded-pill"
                  onClick={handleInstallClick}
                >
                  <i className="bi bi-download me-1"></i> Instalar
                </button>
              )}

              {isIOS && !isInstallable && (
                <button
                  type="button"
                  className="btn btn-light btn-sm fw-semibold px-3 py-1 text-nowrap rounded-pill"
                  onClick={() => setShowIOSPrompt(true)}
                >
                  <i className="bi bi-phone me-1"></i> ¿Cómo instalar?
                </button>
              )}

              <button
                type="button"
                className="btn btn-link text-white-50 p-1 text-decoration-none"
                onClick={() => setDismissed(true)}
                title="Cerrar aviso"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Guía iOS */}
      {showIOSPrompt && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1060 }}
            onClick={() => setShowIOSPrompt(false)}
          ></div>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ zIndex: 1065 }}
            onClick={() => setShowIOSPrompt(false)}
          >
            <div
              className="modal-dialog modal-dialog-centered px-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow-lg rounded-4 p-3 text-dark">
                <div className="modal-header border-0 pb-0">
                  <h6 className="modal-title fw-bold d-flex align-items-center gap-2">
                    <i className="bi bi-apple text-dark fs-5"></i>
                    Instalar en iPhone / iPad
                  </h6>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowIOSPrompt(false)}
                  ></button>
                </div>
                <div className="modal-body small py-3">
                  <p className="mb-2 text-muted">
                    Sigue estos 2 sencillos pasos en Safari para tener la app en tu pantalla de inicio:
                  </p>
                  <ol className="mb-0 ps-3">
                    <li className="mb-2">
                      Toca el botón <strong>Compartir</strong> en la barra inferior{' '}
                      <span className="badge bg-light text-dark border">
                        <i className="bi bi-box-arrow-up"></i>
                      </span>.
                    </li>
                    <li>
                      Desliza hacia abajo y selecciona{' '}
                      <strong>"Agregar al inicio"</strong> o <strong>"Añadir a pantalla de inicio"</strong>{' '}
                      <span className="badge bg-light text-dark border">
                        <i className="bi bi-plus-square"></i>
                      </span>.
                    </li>
                  </ol>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-100 rounded-pill fw-semibold"
                    onClick={() => setShowIOSPrompt(false)}
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
