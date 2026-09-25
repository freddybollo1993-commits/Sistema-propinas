'use client';

import React, { useState, useEffect } from 'react';
import { SessionUser } from '@/lib/auth';

interface ModSancionesProps {
  currentUser: SessionUser | null;
  onOpenEliminarMaster: (modulo: string, id: string | number, desc: string) => void;
}

export default function ModSanciones({
  currentUser,
  onOpenEliminarMaster,
}: ModSancionesProps) {
  // Modalidad dual: CLASICO vs FONDO_MANCOMUNADO
  const [modoActivo, setModoActivo] = useState<'CLASICO' | 'FONDO_MANCOMUNADO'>('CLASICO');
  const [cargando, setCargando] = useState(false);

  // Datos comunes
  const [personal, setPersonal] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [sancionesEspeciales, setSancionesEspeciales] = useState<any[]>([]);
  const [subTabConfig, setSubTabConfig] = useState<'principales' | 'especiales'>('principales');
  const [promediosColab, setPromediosColab] = useState<Record<string, number>>({});

  // Formulario Modo Clásico
  const [sancFecha, setSancFecha] = useState('');
  const [sancColaborador, setSancColaborador] = useState('');
  const [sancInfraccion, setSancInfraccion] = useState('');
  const [sancMonto, setSancMonto] = useState<number | string>('');
  const [sancTiempoTardanza, setSancTiempoTardanza] = useState<number | string>('');
  const [sancTiempoBreak, setSancTiempoBreak] = useState<number | string>('');
  const [sancDetalle, setSancDetalle] = useState('');
  const [hintTardanza, setHintTardanza] = useState<{ tipo: string; texto: string } | null>(null);
  const [hintBreak, setHintBreak] = useState<{ tipo: string; texto: string } | null>(null);

  // Vistas de Sanciones Modo Clásico
  const [vistaSanciones, setVistaSanciones] = useState<'completa' | 'sancionados'>('completa');
  const [historialSanciones, setHistorialSanciones] = useState<any[]>([]);
  const [sancionados100, setSancionados100] = useState<any[]>([]);
  const [modalSancionadoIndiv, setModalSancionadoIndiv] = useState<{
    show: boolean;
    colaborador: string;
    detalle: any[];
  }>({ show: false, colaborador: '', detalle: [] });

  // Modo Fondo Mancomunado
  const [estadoFondo, setEstadoFondo] = useState<any>(null);
  const [tabFondo, setTabFondo] = useState<'origen' | 'movimientos' | 'resumen'>('origen');

  // Formulario Fondo
  const [fondoFecha, setFondoFecha] = useState('');
  const [fondoColaborador, setFondoColaborador] = useState('');
  const [fondoTipo, setFondoTipo] = useState('');
  const [fondoMonto, setFondoMonto] = useState<number | string>('');
  const [fondoDetalle, setFondoDetalle] = useState('');

  // Modal Retiro Fondo
  const [modalRetiro, setModalRetiro] = useState(false);
  const [retiroConcepto, setRetiroConcepto] = useState('');
  const [retiroMonto, setRetiroMonto] = useState<number | string>('');
  const [retiroJustificacion, setRetiroJustificacion] = useState('');

  const esMaster =
    currentUser?.id === 'USR-MASTER' ||
    currentUser?.esMaestro ||
    currentUser?.rol === 'Administrador' ||
    currentUser?.nombre.toLowerCase().includes('maestro');

  const esAprobador =
    currentUser?.rol === 'Administrador' ||
    currentUser?.rol === 'Supervisor' ||
    currentUser?.esMaestro;

  const esModerador = currentUser?.rol === 'Moderador';

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setSancFecha(hoy);
    setFondoFecha(hoy);
    cargarDatosIniciales();
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      setCargando(true);
      const [resModo, resPer, resCat, resHist, resFondo, resEsp] = await Promise.all([
        fetch('/api/sanciones/modo').then((r) => r.json()),
        fetch('/api/personal').then((r) => r.json()),
        fetch('/api/sanciones/config').then((r) => r.json()),
        fetch('/api/sanciones').then((r) => r.json()),
        fetch('/api/fondo').then((r) => r.json()),
        fetch('/api/sanciones/especiales').then((r) => r.json()),
      ]);
      setCargando(false);

      if (resModo?.modo) setModoActivo(resModo.modo);
      if (Array.isArray(resPer)) setPersonal(resPer.filter((p: any) => p.estado === 'Activo'));
      if (Array.isArray(resCat)) setCatalogo(resCat);
      if (Array.isArray(resEsp)) setSancionesEspeciales(resEsp);
      if (Array.isArray(resHist)) {
        setHistorialSanciones(resHist);
        procesarSancionados100(resHist);
      }
      if (resFondo?.success) setEstadoFondo(resFondo);
    } catch (e) {
      setCargando(false);
      console.error(e);
    }
  };

  const procesarSancionados100 = (sanciones: any[]) => {
    const map: Record<string, any> = {};
    sanciones.forEach((s) => {
      if (s.concepto.includes('Sanción')) {
        const colab = s.colaborador;
        if (!map[colab]) {
          map[colab] = {
            colaborador: colab,
            totalMonto: 0,
            detalleSanciones: [],
            esCritico: false,
          };
        }
        map[colab].totalMonto += parseFloat(s.monto) || 0;
        map[colab].detalleSanciones.push(s);
        if (
          s.concepto.includes('Inasistencia injustificada') ||
          s.concepto.includes('100%')
        ) {
          map[colab].esCritico = true;
        }
      }
    });

    const filtrados = Object.values(map).filter(
      (c: any) => c.esCritico || c.detalleSanciones.length >= 2
    );
    setSancionados100(filtrados);
  };

  // Conmutador de Modo (Clásico vs Fondo Mancomunado)
  const handleConmutarModo = async (activarFondo: boolean) => {
    const nuevoModo = activarFondo ? 'FONDO_MANCOMUNADO' : 'CLASICO';
    const textoModo = activarFondo ? 'FONDO MANCOMUNADO' : 'MODO CLÁSICO';
    const detalle = activarFondo
      ? 'En el Fondo Mancomunado, las sanciones no se redistribuirán entre el personal; se acumularán en un fondo común para gastos del equipo (comida, lonche, merienda, daños). El saldo trasciende periodos.'
      : 'En el Modo Clásico, las sanciones vuelven a redistribuirse de forma equitativa entre los compañeros de área en cada liquidación.';

    if (!confirm(`¿Confirmas el cambio de modalidad a ${textoModo}?\n\n${detalle}`)) {
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/sanciones/modo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoModo }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setModoActivo(data.modo);
        cargarDatosIniciales();
      }
    } catch (e: any) {
      setCargando(false);
      alert('Error al actualizar modalidad: ' + e.message);
    }
  };

  // Lógica de cálculo en vivo para formulario clásico
  const handleInfraccionChange = (infraccionNombre: string) => {
    setSancInfraccion(infraccionNombre);
    const item = catalogo.find((c) => c.infraccion === infraccionNombre);

    if (infraccionNombre === 'Tardanza') {
      setSancTiempoBreak('');
      setHintBreak(null);
      calcularTardanzaEnVivo(infraccionNombre, sancTiempoTardanza, sancColaborador);
    } else if (infraccionNombre === 'Break') {
      setSancTiempoTardanza('');
      setHintTardanza(null);
      calcularBreakEnVivo(infraccionNombre, sancTiempoBreak, sancColaborador);
    } else {
      setSancTiempoTardanza('');
      setSancTiempoBreak('');
      setHintTardanza(null);
      setHintBreak(null);
      setSancMonto(item ? item.monto : 0);
    }
  };

  const calcularTardanzaEnVivo = (
    infraccion: string,
    minutosVal: number | string,
    colab: string
  ) => {
    const item = catalogo.find((c) => c.infraccion === 'Tardanza');
    if (!item) return;

    const minutos = parseFloat(String(minutosVal)) || 0;
    if (item.toleranciaActiva) {
      const tolMin = item.toleranciaMin || 15;
      let minPrevios = 0;

      if (colab) {
        historialSanciones
          .filter((h) => h.colaborador === colab && h.concepto.includes('Tardanza') && h.estado === 'Aprobado')
          .forEach((h) => {
            const m = (h.detalle || '').match(/Tardanza:\s*(\d+(\.\d+)?)\s*min/i);
            if (m) minPrevios += parseFloat(m[1]);
          });
      }

      const total = minPrevios + minutos;
      if (total <= tolMin) {
        setSancMonto(0);
        const restan = tolMin - total;
        setHintTardanza({
          tipo: 'success',
          texto: `Dentro de bolsa quincenal (${total}/${tolMin} min consumidos). Restan ${restan} min. Descuento S/ 0.00.`,
        });
      } else {
        setSancMonto(item.monto || 15);
        const exceso = total - tolMin;
        setHintTardanza({
          tipo: 'danger',
          texto: `Excede bolsa quincenal (${total}/${tolMin} min consumidos por +${exceso} min). Aplica sanción y cuenta para reincidencia del 100%.`,
        });
      }
    } else {
      setSancMonto(item.monto || 15);
      setHintTardanza({
        tipo: 'muted',
        texto: `Sin tolerancia activa. Cada tardanza cuenta hacia la frecuencia de sanción.`,
      });
    }
  };

  const calcularBreakEnVivo = (
    infraccion: string,
    minutosVal: number | string,
    colab: string
  ) => {
    const item = catalogo.find((c) => c.infraccion === 'Break');
    if (!item) return;

    const mult = item.multiplicadorActivo ? item.multiplicador || 2 : 0;
    const minutos = parseFloat(String(minutosVal)) || 0;
    const nominal = minutos * mult;
    const promDiario = (colab && promediosColab[colab]) || 0;

    if (minutos <= 0) {
      setSancMonto(0);
      setHintBreak({
        tipo: 'muted',
        texto: `Multiplicador: x${mult} por min.` + (promDiario > 0 ? ` Promedio diario del colaborador: S/ ${promDiario.toFixed(2)}.` : ''),
      });
      return;
    }

    if (promDiario > 0 && nominal > promDiario) {
      setSancMonto(promDiario);
      setHintBreak({
        tipo: 'danger',
        texto: `Cálculo nominal: ${minutos} min × S/ ${mult.toFixed(2)} = S/ ${nominal.toFixed(2)}. Tope aplicado: S/ ${promDiario.toFixed(2)} (límite por promedio diario de propina).`,
      });
    } else {
      setSancMonto(nominal);
      setHintBreak({
        tipo: 'success',
        texto: `Cálculo: ${minutos} min × S/ ${mult.toFixed(2)} = S/ ${nominal.toFixed(2)}.` + (promDiario > 0 ? ` (Promedio diario máx: S/ ${promDiario.toFixed(2)})` : ''),
      });
    }
  };

  const handleGuardarSancionClasica = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sancColaborador || !sancInfraccion) {
      alert('Por favor selecciona un colaborador y una infracción.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/sanciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: sancFecha,
          colaborador: sancColaborador,
          infraccion: sancInfraccion,
          monto: sancMonto,
          tiempoTardanza: sancInfraccion === 'Tardanza' ? sancTiempoTardanza : null,
          tiempoBreak: sancInfraccion === 'Break' ? sancTiempoBreak : null,
          detalle: sancDetalle,
          esModoFondo: false,
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setSancColaborador('');
        setSancInfraccion('');
        setSancMonto('');
        setSancTiempoTardanza('');
        setSancTiempoBreak('');
        setSancDetalle('');
        setHintTardanza(null);
        setHintBreak(null);
        cargarDatosIniciales();
      }
    } catch (e: any) {
      setCargando(false);
      alert('Error al aplicar sanción: ' + e.message);
    }
  };

  const handleGuardarSancionFondo = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(String(fondoMonto));
    if (!fondoColaborador || !fondoTipo || isNaN(monto) || monto <= 0 || !fondoDetalle.trim()) {
      alert('Por favor completa todos los campos requeridos: Trabajador, Tipo de sanción, Monto mayor a 0 y Detalle explicativo.');
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/sanciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          esModoFondo: true,
          fecha: fondoFecha,
          colaborador: fondoColaborador,
          tipoSancion: fondoTipo,
          monto,
          detalle: fondoDetalle.trim(),
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setFondoColaborador('');
        setFondoTipo('');
        setFondoMonto('');
        setFondoDetalle('');
        cargarDatosIniciales();
      }
    } catch (e: any) {
      setCargando(false);
      alert('Error al registrar sanción al fondo: ' + e.message);
    }
  };

  const handleGuardarReglasCatalogo = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/sanciones/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catalogo),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) cargarDatosIniciales();
    } catch (e: any) {
      setCargando(false);
      alert('Error al guardar catálogo: ' + e.message);
    }
  };

  const handleGuardarSancionesEspeciales = async () => {
    try {
      setCargando(true);
      const res = await fetch('/api/sanciones/especiales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sancionesEspeciales),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) cargarDatosIniciales();
    } catch (e: any) {
      setCargando(false);
      alert('Error al guardar sanciones especiales: ' + e.message);
    }
  };

  const handleAgregarSancionEspecial = () => {
    const primeraInfraccion = catalogo[0]?.infraccion || 'Tardanza';
    const nuevoCriterio =
      primeraInfraccion === 'Tardanza'
        ? 'TOLERANCIA'
        : primeraInfraccion === 'Break'
        ? 'DEMORA'
        : 'FRECUENCIA';

    setSubTabConfig('especiales');
    setSancionesEspeciales((prev) => [
      ...prev,
      {
        nombre: 'Pérdida de propina del día',
        sancionPrincipal: primeraInfraccion,
        estado: 'Inactivo',
        tipoEfecto: 'PERDIDA_DIA',
        criterioDisparador: nuevoCriterio,
        disparadorFrecuencia: 1,
      },
    ]);
  };

  const handleEliminarSancionEspecialFila = async (index: number) => {
    const item = sancionesEspeciales[index];
    if (!item) return;
    if (!confirm(`¿Eliminar la sanción especial "${item.nombre}"?`)) return;

    if (item.id) {
      try {
        setCargando(true);
        const res = await fetch(`/api/sanciones/especiales?id=${item.id}`, { method: 'DELETE' });
        const data = await res.json();
        setCargando(false);
        if (!data.success) {
          alert('Error al eliminar: ' + data.message);
          return;
        }
      } catch (e: any) {
        setCargando(false);
        alert('Error de conexión: ' + e.message);
        return;
      }
    }
    setSancionesEspeciales((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleResolverSolicitud = async (id: number, accion: 'Aprobado' | 'Rechazado') => {
    if (!confirm(`¿Confirmas marcar esta sanción como "${accion}"?`)) return;

    try {
      setCargando(true);
      const res = await fetch('/api/solicitudes/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nuevaAccion: accion }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      cargarDatosIniciales();
    } catch (e: any) {
      setCargando(false);
      alert('Error al resolver sanción: ' + e.message);
    }
  };

  const handleEjecutarRetiroFondo = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(String(retiroMonto));
    if (!retiroConcepto || isNaN(monto) || monto <= 0 || !retiroJustificacion.trim()) {
      alert('Debe completar el concepto del gasto, un monto válido mayor a 0 y la justificación obligatoria.');
      return;
    }

    if (!confirm(`¿Confirmas registrar el retiro de S/ ${monto.toFixed(2)} para "${retiroConcepto}"?\n\nJustificación: ${retiroJustificacion}`)) {
      return;
    }

    try {
      setCargando(true);
      const res = await fetch('/api/fondo/retiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepto: retiroConcepto,
          monto,
          justificacion: retiroJustificacion.trim(),
        }),
      });
      const data = await res.json();
      setCargando(false);

      alert(data.message);
      if (data.success) {
        setModalRetiro(false);
        setRetiroConcepto('');
        setRetiroMonto('');
        setRetiroJustificacion('');
        cargarDatosIniciales();
      }
    } catch (e: any) {
      setCargando(false);
      alert('Error al registrar retiro: ' + e.message);
    }
  };

  return (
    <div className="card p-4 shadow-sm border-0 bg-white">
      {/* ENCABEZADO Y SELECTOR DE MODALIDAD */}
      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom flex-wrap gap-2">
        <div>
          <h5 className="fw-bold mb-1 text-dark">
            <i className="bi bi-shield-shaded text-danger me-2"></i>
            Gestión Disciplinaria y Sanciones
          </h5>
          <p className="text-muted small mb-0">
            Modalidad dual: Modo Clásico (Redistribución por Área) y Modo Fondo Mancomunado (Fondo Común de Trabajadores).
          </p>
        </div>

        {/* INTERRUPTOR EXCLUSIVO PARA USUARIO MAESTRO / ADMIN */}
        <div className="p-2 px-3 rounded border bg-light shadow-sm d-flex align-items-center gap-3">
          <div className="d-flex flex-column">
            <span className="text-muted fw-semibold" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
              MODALIDAD ACTIVA:
            </span>
            <span
              className={`fw-bold ${modoActivo === 'FONDO_MANCOMUNADO' ? 'text-success' : 'text-primary'}`}
            >
              {modoActivo === 'FONDO_MANCOMUNADO' ? 'Fondo Mancomunado' : 'Modo Clásico'}
            </span>
          </div>

          <div
            className="form-check form-switch m-0"
            title={
              esMaster
                ? 'Alternar entre Modo Clásico y Fondo Mancomunado'
                : 'Interruptor bloqueado: Solo Usuario Maestro o Administrador pueden cambiar la modalidad'
            }
          >
            <input
              className="form-check-input"
              type="checkbox"
              style={{ cursor: esMaster ? 'pointer' : 'not-allowed', transform: 'scale(1.35)' }}
              checked={modoActivo === 'FONDO_MANCOMUNADO'}
              onChange={(e) => handleConmutarModo(e.target.checked)}
              disabled={!esMaster}
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA A: MODO CLÁSICO (REDISTRIBUCIÓN POR ÁREA) */}
      {/* ========================================================= */}
      {modoActivo === 'CLASICO' && (
        <div>
          <div className="alert alert-primary py-2 px-3 small d-flex align-items-center mb-3">
            <i className="bi bi-info-circle-fill me-2 fs-6"></i>
            <span>
              <strong>Modo Clásico Activo:</strong> Las sanciones aplicadas se redistribuyen de forma equitativa entre los compañeros de su respectiva área (Salón o Cocina) al cierre de cada liquidación.
            </span>
          </div>

          <div className="row g-4">
            {/* Formulario Clásico de Registro */}
            <div className="col-md-4">
              <div className="p-3 border rounded bg-light">
                <h6 className="fw-bold mb-3 text-dark">Registrar Infracción (Clásico)</h6>
                <form onSubmit={handleGuardarSancionClasica}>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Fecha</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={sancFecha}
                      onChange={(e) => setSancFecha(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold">Colaborador</label>
                    <select
                      className="form-select form-select-sm"
                      value={sancColaborador}
                      onChange={(e) => {
                        setSancColaborador(e.target.value);
                        if (sancInfraccion === 'Tardanza') {
                          calcularTardanzaEnVivo('Tardanza', sancTiempoTardanza, e.target.value);
                        } else if (sancInfraccion === 'Break') {
                          calcularBreakEnVivo('Break', sancTiempoBreak, e.target.value);
                        }
                      }}
                      required
                    >
                      <option value="">Seleccionar colaborador...</option>
                      {personal.map((p) => (
                        <option key={p.nombre} value={p.nombre}>
                          {p.nombre} ({p.area})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-bold">Tipo de Infracción</label>
                    <select
                      className="form-select form-select-sm"
                      value={sancInfraccion}
                      onChange={(e) => handleInfraccionChange(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar falta...</option>
                      {catalogo
                        .filter((c) => c.estado === 'Activo')
                        .map((c) => (
                          <option key={c.infraccion} value={c.infraccion}>
                            {c.infraccion}
                          </option>
                        ))}
                    </select>
                  </div>

                  {(() => {
                    const modEsp = sancionesEspeciales.find(
                      (se) => se.sancionPrincipal === sancInfraccion && se.estado === 'Activo'
                    );
                    if (!modEsp) return null;
                    return (
                      <div className="alert alert-warning py-2 px-3 small border mb-2 shadow-sm">
                        <div className="d-flex align-items-center gap-2">
                          <i className="bi bi-lightning-charge-fill text-warning fs-5"></i>
                          <div>
                            <strong>Castigo Ejemplar Vinculado:</strong> {modEsp.nombre}
                            <div className="text-muted" style={{ fontSize: '0.73rem' }}>
                              {modEsp.criterioDisparador === 'TOLERANCIA'
                                ? 'Al superar la tolerancia configurada, confisca el 100% de la propina de la fecha en lugar del monto clásico.'
                                : modEsp.criterioDisparador === 'DEMORA'
                                ? 'Al incurrir en exceso de tiempo de break, confisca el 100% de la propina de la fecha en lugar del monto clásico.'
                                : modEsp.criterioDisparador === 'INMEDIATO'
                                ? 'Aplica de inmediato desde la 1ª falta registrada. Confisca el 100% de la propina de la fecha.'
                                : `Aplica a partir de la falta #${modEsp.disparadorFrecuencia || 1}. Confisca el 100% de la propina del día.`}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mb-2">
                    <label className="form-label small fw-bold">Descuento Estimado (S/)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm fw-bold text-danger"
                      value={sancMonto}
                      readOnly={sancInfraccion === 'Tardanza' || sancInfraccion === 'Break'}
                      onChange={(e) => setSancMonto(e.target.value)}
                    />
                  </div>

                  {sancInfraccion === 'Tardanza' && (
                    <div className="mb-2">
                      <label className="form-label small fw-bold text-primary">
                        <i className="bi bi-stopwatch me-1"></i>Tiempo de Tardanza (minutos) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className="form-control form-control-sm fw-bold"
                        placeholder="Ej. 15"
                        value={sancTiempoTardanza}
                        onChange={(e) => {
                          setSancTiempoTardanza(e.target.value);
                          calcularTardanzaEnVivo('Tardanza', e.target.value, sancColaborador);
                        }}
                        required
                      />
                      {hintTardanza && (
                        <div
                          className={`form-text small mt-1 fw-bold text-${hintTardanza.tipo}`}
                        >
                          {hintTardanza.texto}
                        </div>
                      )}
                    </div>
                  )}

                  {sancInfraccion === 'Break' && (
                    <div className="mb-2">
                      <label className="form-label small fw-bold text-danger">
                        <i className="bi bi-clock-history me-1"></i>Tiempo de Demora en Break (minutos) *
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        className="form-control form-control-sm fw-bold"
                        placeholder="Ej. 15"
                        value={sancTiempoBreak}
                        onChange={(e) => {
                          setSancTiempoBreak(e.target.value);
                          calcularBreakEnVivo('Break', e.target.value, sancColaborador);
                        }}
                        required
                      />
                      {hintBreak && (
                        <div className={`form-text small mt-1 text-${hintBreak.tipo}`}>
                          {hintBreak.texto}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-bold">Detalle / Evidencia</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      placeholder="Motivo o referencia..."
                      value={sancDetalle}
                      onChange={(e) => setSancDetalle(e.target.value)}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-danger btn-sm w-100 fw-semibold"
                    disabled={cargando}
                  >
                    <i className="bi bi-shield-slash me-1"></i> Aplicar Sanción
                  </button>
                </form>
              </div>
            </div>

            {/* Panel de Configuración de Infracciones y Sanciones Especiales */}
            <div className="col-md-8">
              <div className="p-3 border rounded bg-white shadow-sm">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">
                      <i className="bi bi-sliders me-1 text-primary"></i> Catálogo y Modificadores Disciplinarios
                    </h6>
                    <span className="text-muted small">
                      Configura infracciones base y castigos especiales vinculados.
                    </span>
                  </div>

                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <div className="btn-group btn-group-sm" role="group">
                      <button
                        type="button"
                        className={`btn ${subTabConfig === 'principales' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setSubTabConfig('principales')}
                      >
                        <i className="bi bi-list-check me-1"></i> Principales
                      </button>
                      <button
                        type="button"
                        className={`btn ${
                          subTabConfig === 'especiales'
                            ? 'btn-warning text-dark fw-bold'
                            : 'btn-outline-warning text-dark'
                        }`}
                        onClick={() => setSubTabConfig('especiales')}
                      >
                        <i className="bi bi-lightning-charge-fill me-1 text-warning"></i> Sanciones Especiales
                        {sancionesEspeciales.filter((s) => s.estado === 'Activo').length > 0 && (
                          <span className="badge bg-danger ms-1">
                            {sancionesEspeciales.filter((s) => s.estado === 'Activo').length}
                          </span>
                        )}
                      </button>
                    </div>

                    {!esModerador && (
                      subTabConfig === 'principales' ? (
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm fw-semibold"
                            onClick={handleAgregarSancionEspecial}
                            disabled={cargando}
                          >
                            <i className="bi bi-plus-lg me-1"></i> + Sanción Especial
                          </button>
                          <button
                            className="btn btn-primary btn-sm px-3 fw-semibold"
                            onClick={handleGuardarReglasCatalogo}
                            disabled={cargando}
                          >
                            <i className="bi bi-save me-1"></i> Guardar Reglas
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-success btn-sm fw-bold px-3 shadow-sm"
                            onClick={handleAgregarSancionEspecial}
                            disabled={cargando}
                          >
                            <i className="bi bi-plus-circle-fill me-1"></i> + Agregar Sanción Especial
                          </button>
                          <button
                            type="button"
                            className="btn btn-warning btn-sm text-dark fw-bold px-3 shadow-sm"
                            onClick={handleGuardarSancionesEspeciales}
                            disabled={cargando}
                          >
                            <i className="bi bi-save me-1"></i> Guardar Cambios
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {subTabConfig === 'principales' ? (
                  <div className="table-responsive" style={{ maxHeight: '310px', overflowY: 'auto' }}>
                    <table className="table table-sm table-hover align-middle small mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: '10%' }}>Activo</th>
                          <th style={{ width: '35%' }}>Infracción</th>
                          <th style={{ width: '15%' }}>Monto (S/)</th>
                          <th style={{ width: '25%' }}>Tolerancia / Multiplicador</th>
                          <th style={{ width: '17%' }}>Máx. Frecuencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalogo.map((c, i) => {
                          const isTardanza = c.infraccion === 'Tardanza';
                          const isBreak = c.infraccion === 'Break';
                          const isInasistencia = c.infraccion.includes('Inasistencia injustificada');

                          return (
                            <tr key={c.infraccion}>
                              <td>
                                <div className="form-check form-switch">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={c.estado === 'Activo'}
                                    disabled={esModerador}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setCatalogo((prev) =>
                                        prev.map((item, idx) =>
                                          idx === i ? { ...item, estado: checked ? 'Activo' : 'Inactivo' } : item
                                        )
                                      );
                                    }}
                                  />
                                </div>
                              </td>
                              <td>
                                <strong>{c.infraccion}</strong>
                                {isInasistencia && (
                                  <>
                                    <br />
                                    <small className="text-primary" style={{ fontSize: '0.72rem' }}>
                                      <i className="bi bi-link-45deg"></i> Frecuencia compartida
                                    </small>
                                  </>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm fw-semibold"
                                  style={{ width: '75px' }}
                                  value={c.monto}
                                  disabled={esModerador}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setCatalogo((prev) =>
                                      prev.map((item, idx) => (idx === i ? { ...item, monto: val } : item))
                                    );
                                  }}
                                />
                              </td>
                              <td>
                                {isTardanza ? (
                                  <div className="d-flex align-items-center gap-1">
                                    <div className="form-check form-switch m-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={c.toleranciaActiva}
                                        disabled={esModerador}
                                        onChange={(e) => {
                                          const chk = e.target.checked;
                                          setCatalogo((prev) =>
                                            prev.map((item, idx) =>
                                              idx === i ? { ...item, toleranciaActiva: chk } : item
                                            )
                                          );
                                        }}
                                      />
                                    </div>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      className="form-control form-control-sm px-1 text-center fw-bold"
                                      style={{ width: '55px' }}
                                      value={c.toleranciaMin || 15}
                                      disabled={!c.toleranciaActiva || esModerador}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setCatalogo((prev) =>
                                          prev.map((item, idx) =>
                                            idx === i ? { ...item, toleranciaMin: val } : item
                                          )
                                        );
                                      }}
                                    />
                                    <span className="small text-muted">min</span>
                                  </div>
                                ) : isBreak ? (
                                  <div className="d-flex align-items-center gap-1">
                                    <div className="form-check form-switch m-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={c.multiplicadorActivo}
                                        disabled={esModerador}
                                        onChange={(e) => {
                                          const chk = e.target.checked;
                                          setCatalogo((prev) =>
                                            prev.map((item, idx) =>
                                              idx === i ? { ...item, multiplicadorActivo: chk } : item
                                            )
                                          );
                                        }}
                                      />
                                    </div>
                                    <input
                                      type="number"
                                      min="0.5"
                                      step="0.5"
                                      className="form-control form-control-sm px-1 text-center fw-bold"
                                      style={{ width: '55px' }}
                                      value={c.multiplicador !== undefined ? c.multiplicador : 2}
                                      disabled={!c.multiplicadorActivo || esModerador}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setCatalogo((prev) =>
                                          prev.map((item, idx) =>
                                            idx === i ? { ...item, multiplicador: val } : item
                                          )
                                        );
                                      }}
                                    />
                                    <span className="small text-muted">x/min</span>
                                  </div>
                                ) : (
                                  <span className="text-muted small">—</span>
                                )}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className="form-control form-control-sm text-center fw-bold"
                                  style={{ width: '60px' }}
                                  value={c.frecuenciaMax}
                                  disabled={esModerador}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setCatalogo((prev) =>
                                      prev.map((item, idx) => {
                                        if (isInasistencia && item.infraccion.includes('Inasistencia injustificada')) {
                                          return { ...item, frecuenciaMax: val };
                                        }
                                        return idx === i ? { ...item, frecuenciaMax: val } : item;
                                      })
                                    );
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 p-2 bg-light border rounded">
                      <div className="text-muted small">
                        <i className="bi bi-info-circle-fill text-primary me-1"></i>
                        <strong>Regla de Castigo Ejemplar:</strong> Confisca el <strong>100% de la propina de la fecha</strong> según el disparador configurado.
                      </div>
                      {!esModerador && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm fw-semibold shadow-sm"
                          onClick={handleAgregarSancionEspecial}
                          disabled={cargando}
                        >
                          <i className="bi bi-plus-circle-fill me-1"></i> + Agregar Sanción Especial
                        </button>
                      )}
                    </div>

                    {sancionesEspeciales.length === 0 ? (
                      <div className="text-center py-4 text-muted border rounded bg-light">
                        <i className="bi bi-shield-slash fs-2 d-block mb-1 text-secondary"></i>
                        No hay sanciones especiales configuradas.
                        <div className="mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-success fw-semibold"
                            onClick={handleAgregarSancionEspecial}
                            disabled={esModerador}
                          >
                            <i className="bi bi-plus-circle-fill me-1"></i> + Agregar Sanción Especial
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="table-responsive" style={{ maxHeight: '310px', overflowY: 'auto' }}>
                        <table className="table table-sm table-hover align-middle small mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th style={{ width: '8%' }}>Activo</th>
                              <th style={{ width: '26%' }}>Nombre del Modificador</th>
                              <th style={{ width: '24%' }}>Sanción Principal Asociada</th>
                              <th style={{ width: '16%' }}>Castigo Ejemplar</th>
                              <th style={{ width: '20%' }}>Disparador Configurable</th>
                              <th style={{ width: '6%' }} className="text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sancionesEspeciales.map((esp, i) => {
                              const sancionAsociada = catalogo.find(
                                (c) => c.infraccion === esp.sancionPrincipal
                              );
                              const esTardanza = esp.sancionPrincipal === 'Tardanza';
                              const esBreak = esp.sancionPrincipal === 'Break';
                              const tolMin = sancionAsociada?.toleranciaMin || 15;
                              const frecMax = sancionAsociada?.frecuenciaMax || 1;
                              const criterioActual =
                                esp.criterioDisparador ||
                                (esTardanza ? 'TOLERANCIA' : esBreak ? 'DEMORA' : 'FRECUENCIA');

                              return (
                                <tr key={esp.id || i}>
                                  <td>
                                    <div className="form-check form-switch">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={esp.estado === 'Activo'}
                                        disabled={esModerador}
                                        onChange={(e) => {
                                          const checked = e.target.checked;
                                          setSancionesEspeciales((prev) =>
                                            prev.map((item, idx) =>
                                              idx === i ? { ...item, estado: checked ? 'Activo' : 'Inactivo' } : item
                                            )
                                          );
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td>
                                    {/* ÚNICO CAMPO DE TEXTO EDITABLE: NOMBRE DEL MODIFICADOR */}
                                    <input
                                      type="text"
                                      className="form-control form-control-sm fw-semibold"
                                      value={esp.nombre}
                                      placeholder="Nombre del modificador..."
                                      disabled={esModerador}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSancionesEspeciales((prev) =>
                                          prev.map((item, idx) => (idx === i ? { ...item, nombre: val } : item))
                                        );
                                      }}
                                    />
                                  </td>
                                  <td>
                                    <select
                                      className="form-select form-select-sm fw-semibold text-primary"
                                      value={esp.sancionPrincipal}
                                      disabled={esModerador}
                                      onChange={(e) => {
                                        const nuevaSancion = e.target.value;
                                        let nuevoCriterio = 'FRECUENCIA';
                                        if (nuevaSancion === 'Tardanza') nuevoCriterio = 'TOLERANCIA';
                                        else if (nuevaSancion === 'Break') nuevoCriterio = 'DEMORA';

                                        setSancionesEspeciales((prev) =>
                                          prev.map((item, idx) =>
                                            idx === i
                                              ? {
                                                  ...item,
                                                  sancionPrincipal: nuevaSancion,
                                                  criterioDisparador: nuevoCriterio,
                                                  disparadorFrecuencia: 1,
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                    >
                                      {catalogo.map((cat) => (
                                        <option key={cat.infraccion} value={cat.infraccion}>
                                          {cat.infraccion}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td>
                                    <div>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle fw-semibold">
                                        <i className="bi bi-slash-circle me-1"></i> Pérdida 100% del Día
                                      </span>
                                      <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                        Confisca propina de la fecha
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    {/* DISPARADOR SEGÚN LA SANCIÓN PRINCIPAL ASOCIADA */}
                                    <div className="d-flex flex-column gap-1">
                                      <select
                                        className="form-select form-select-sm fw-medium"
                                        value={criterioActual}
                                        disabled={esModerador}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setSancionesEspeciales((prev) =>
                                            prev.map((item, idx) =>
                                              idx === i ? { ...item, criterioDisparador: val } : item
                                            )
                                          );
                                        }}
                                      >
                                        {esTardanza && (
                                          <option value="TOLERANCIA">
                                            Superar Tolerancia ({tolMin} min)
                                          </option>
                                        )}
                                        {esBreak && (
                                          <option value="DEMORA">
                                            Superar tiempo de Break
                                          </option>
                                        )}
                                        <option value="FRECUENCIA">
                                          Por número de falta (#)
                                        </option>
                                        <option value="INMEDIATO">
                                          Desde la 1ª ocurrencia (#1)
                                        </option>
                                      </select>

                                      {criterioActual === 'FRECUENCIA' && (
                                        <div className="d-flex align-items-center gap-1 mt-1">
                                          <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                            Falta #:
                                          </span>
                                          <input
                                            type="number"
                                            min="1"
                                            max={frecMax}
                                            className="form-control form-control-sm text-center fw-bold px-1"
                                            style={{ width: '48px', height: '28px' }}
                                            value={esp.disparadorFrecuencia || 1}
                                            disabled={esModerador}
                                            onChange={(e) => {
                                              const val = parseInt(e.target.value) || 1;
                                              setSancionesEspeciales((prev) =>
                                                prev.map((item, idx) =>
                                                  idx === i ? { ...item, disparadorFrecuencia: val } : item
                                                )
                                              );
                                            }}
                                          />
                                          <span
                                            className="badge bg-secondary-subtle text-dark border small"
                                            style={{ fontSize: '0.68rem' }}
                                            title={`Tope quincenal configurado en ${esp.sancionPrincipal}`}
                                          >
                                            tope: {frecMax}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm p-1 px-2"
                                      title="Eliminar Sanción Especial"
                                      disabled={esModerador || cargando}
                                      onClick={() => handleEliminarSancionEspecialFila(i)}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historial de Sanciones Modo Clásico */}
          <div className="mt-4 p-3 border rounded bg-white shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="fw-bold mb-0 text-dark">
                  <i className="bi bi-shield-exclamation text-danger me-2"></i>
                  Historial de Sanciones Aplicadas
                </h6>
                <span className="text-muted small">
                  Bitácora completa y colaboradores con pérdida del 100%.
                </span>
              </div>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${
                    vistaSanciones === 'sancionados' ? 'btn-outline-danger active' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setVistaSanciones('sancionados')}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1"></i> Sancionados 100%
                </button>
                <button
                  type="button"
                  className={`btn ${
                    vistaSanciones === 'completa' ? 'btn-outline-danger active' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setVistaSanciones('completa')}
                >
                  <i className="bi bi-list-check me-1"></i> Bitácora Completa
                </button>
              </div>
            </div>

            {vistaSanciones === 'sancionados' ? (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Colaborador</th>
                      <th>Área</th>
                      <th>Infracciones</th>
                      <th>Motivo Técnico</th>
                      <th>Propina Confiscada</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sancionados100.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-3">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          No hay colaboradores en causal de pérdida del 100% en el ciclo activo.
                        </td>
                      </tr>
                    ) : (
                      sancionados100.map((c) => (
                        <tr key={c.colaborador}>
                          <td>
                            <strong>{c.colaborador}</strong>
                          </td>
                          <td>
                            <span className="badge bg-secondary">Operativo</span>
                          </td>
                          <td>
                            <span className="badge bg-danger">{c.detalleSanciones.length} falta(s)</span>
                          </td>
                          <td>
                            <span className="text-danger fw-semibold">
                              {c.esCritico
                                ? 'Inasistencia injustificada / Reincidencia'
                                : 'Múltiples infracciones acumuladas'}
                            </span>
                          </td>
                          <td className="text-danger fw-bold">S/ {c.totalMonto.toFixed(2)}</td>
                          <td className="text-center">
                            <button
                              className="btn btn-outline-primary btn-sm py-0 px-2"
                              onClick={() =>
                                setModalSancionadoIndiv({
                                  show: true,
                                  colaborador: c.colaborador,
                                  detalle: c.detalleSanciones,
                                })
                              }
                            >
                              <i className="bi bi-eye me-1"></i> Ver Detalle
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle small mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Fecha</th>
                      <th>Colaborador</th>
                      <th>Infracción</th>
                      <th>Monto</th>
                      <th>Detalle / Evidencia</th>
                      <th>Estado</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialSanciones.filter((h) => h.concepto.includes('Sanción')).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-3">
                          No hay registros de sanciones aplicadas.
                        </td>
                      </tr>
                    ) : (
                      historialSanciones
                        .filter((h) => h.concepto.includes('Sanción'))
                        .map((s) => {
                          const badgeClass =
                            s.estado === 'Aprobado'
                              ? 'bg-success'
                              : s.estado === 'Pendiente'
                              ? 'bg-warning text-dark'
                              : 'bg-danger';

                          return (
                            <tr key={s.id}>
                              <td>{s.fecha}</td>
                              <td>
                                <strong>{s.colaborador}</strong>
                              </td>
                              <td>
                                {s.concepto.includes('Sanción Especial') ? (
                                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                    <i className="bi bi-lightning-fill text-warning me-1"></i>
                                    {s.concepto}
                                  </span>
                                ) : (
                                  s.concepto
                                )}
                              </td>
                              <td className="fw-bold text-danger">S/ {parseFloat(s.monto).toFixed(2)}</td>
                              <td>
                                <span className="text-muted">{s.detalle || '-'}</span>
                              </td>
                              <td>
                                <span className={`badge ${badgeClass}`}>{s.estado}</span>
                              </td>
                              <td className="text-center">
                                {s.estado === 'Pendiente' && esAprobador && (
                                  <>
                                    <button
                                      className="btn btn-success btn-sm py-0 px-2 me-1"
                                      onClick={() => handleResolverSolicitud(s.id, 'Aprobado')}
                                      title="Aprobar"
                                    >
                                      <i className="bi bi-check-lg"></i>
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm py-0 px-2"
                                      onClick={() => handleResolverSolicitud(s.id, 'Rechazado')}
                                      title="Rechazar"
                                    >
                                      <i className="bi bi-x-lg"></i>
                                    </button>
                                  </>
                                )}

                                {esMaster && (
                                  <button
                                    className="btn btn-outline-danger btn-sm py-0 px-2 ms-1"
                                    title="Eliminar definitivamente"
                                    onClick={() =>
                                      onOpenEliminarMaster(
                                        'AdelantosSanciones',
                                        s.id,
                                        `${s.concepto}: ${s.colaborador} (S/ ${parseFloat(s.monto).toFixed(2)})`
                                      )
                                    }
                                  >
                                    <i className="bi bi-trash3-fill"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA B: MODO FONDO MANCOMUNADO (FONDO COMÚN) */}
      {/* ========================================================= */}
      {modoActivo === 'FONDO_MANCOMUNADO' && (
        <div>
          {/* Banner Explicativo */}
          <div className="alert alert-success py-2 px-3 small d-flex align-items-center mb-3">
            <i className="bi bi-piggy-bank-fill text-success fs-5 me-2"></i>
            <div>
              <strong>Modo Fondo Mancomunado Activo:</strong> Las sanciones no se redistribuyen en la quincena; se depositan en un fondo común accesible para gastos de los trabajadores (comida, lonche, merienda, daños internos). El saldo remanente trasciende los ciclos y pasa a la siguiente quincena.
            </div>
          </div>

          {/* Tarjetas KPI de balance del fondo */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="card border-0 bg-success bg-opacity-10 p-3 rounded shadow-sm border-start border-success border-4 h-100">
                <span className="text-muted small fw-semibold text-uppercase">
                  Saldo Disponible Total
                </span>
                <h4 className="fw-bold text-success mb-0">
                  S/ {(estadoFondo?.saldoDisponibleActual || 0).toFixed(2)}
                </h4>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                  Disponible para retiros
                </small>
              </div>
            </div>

            <div className="col-md-3 col-6">
              <div className="card border-0 bg-primary bg-opacity-10 p-3 rounded shadow-sm border-start border-primary border-4 h-100">
                <span className="text-muted small fw-semibold text-uppercase">
                  Saldo Inicial Ciclo
                </span>
                <h4 className="fw-bold text-primary mb-0">
                  S/ {(estadoFondo?.saldoInicialCiclo || 0).toFixed(2)}
                </h4>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                  Arrastre de quincenas previas
                </small>
              </div>
            </div>

            <div className="col-md-3 col-6">
              <div className="card border-0 bg-warning bg-opacity-10 p-3 rounded shadow-sm border-start border-warning border-4 h-100">
                <span className="text-muted small fw-semibold text-uppercase">
                  Ingresos por Sanciones
                </span>
                <h4 className="fw-bold text-warning mb-0">
                  S/ {(estadoFondo?.totalIngresosCiclo || 0).toFixed(2)}
                </h4>
                <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                  Aportes del ciclo activo
                </small>
              </div>
            </div>

            <div className="col-md-3 col-6">
              <div className="card border-0 bg-danger bg-opacity-10 p-3 rounded shadow-sm border-start border-danger border-4 h-100">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">
                      Retiros / Gastos
                    </span>
                    <h4 className="fw-bold text-danger mb-0">
                      S/ {(estadoFondo?.totalRetirosCiclo || 0).toFixed(2)}
                    </h4>
                    <small className="text-muted" style={{ fontSize: '0.72rem' }}>
                      Gastos comunes ejecutados
                    </small>
                  </div>
                  {esAprobador && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger px-2 py-1 shadow-sm mt-1"
                      onClick={() => setModalRetiro(true)}
                      title="Solicitar Retiro del Fondo"
                    >
                      <i className="bi bi-box-arrow-up-right me-1"></i> Retirar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Formulario de Sanción Directa al Fondo */}
            <div className="col-md-4">
              <div className="p-3 border rounded bg-white shadow-sm border-top border-danger border-3">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-file-earmark-plus text-danger me-2 fs-5"></i>
                  <h6 className="fw-bold mb-0 text-dark">Aplicar Sanción al Fondo</h6>
                </div>
                <p className="text-muted small mb-3">
                  Sanción directa que alimentará el fondo común de trabajadores.
                </p>
                <form onSubmit={handleGuardarSancionFondo}>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Fecha</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={fondoFecha}
                      onChange={(e) => setFondoFecha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Trabajador a Sancionar</label>
                    <select
                      className="form-select form-select-sm"
                      value={fondoColaborador}
                      onChange={(e) => setFondoColaborador(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar trabajador...</option>
                      {personal.map((p) => (
                        <option key={p.nombre} value={p.nombre}>
                          {p.nombre} ({p.area})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Tipo de Sanción (Explicar)</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Ej. Tardanza, Uniforme incompleto, Rotura..."
                      value={fondoTipo}
                      onChange={(e) => setFondoTipo(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-bold">Monto a Definir (S/)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0.50"
                      className="form-control form-control-sm fw-bold text-danger"
                      placeholder="Ej. 20.00"
                      value={fondoMonto}
                      onChange={(e) => setFondoMonto(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Detalle / Comentario</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="Ej. Llegó 25 min tarde sin justificación..."
                      value={fondoDetalle}
                      onChange={(e) => setFondoDetalle(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm w-100 fw-semibold shadow-sm py-2"
                    disabled={cargando}
                  >
                    <i className="bi bi-piggy-bank me-1"></i> Registrar y Aportar al Fondo
                  </button>
                </form>
              </div>
            </div>

            {/* Paneles de Trazabilidad */}
            <div className="col-md-8">
              <div className="p-3 border rounded bg-white shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h6 className="fw-bold mb-0 text-dark">
                      <i className="bi bi-clock-history text-primary me-2"></i>
                      Trazabilidad y Origen del Fondo Mancomunado
                    </h6>
                    <span className="text-muted small">
                      Historial detallado de ingresos (sanciones) y salidas (gastos comunes).
                    </span>
                  </div>
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${
                        tabFondo === 'origen' ? 'btn-outline-primary active' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setTabFondo('origen')}
                    >
                      <i className="bi bi-people-fill me-1"></i> Origen (Sanciones)
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        tabFondo === 'movimientos' ? 'btn-outline-primary active' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setTabFondo('movimientos')}
                    >
                      <i className="bi bi-arrow-left-right me-1"></i> Entradas y Salidas
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        tabFondo === 'resumen' ? 'btn-outline-primary active' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setTabFondo('resumen')}
                    >
                      <i className="bi bi-pie-chart-fill me-1"></i> Aportes por Colaborador
                    </button>
                  </div>
                </div>

                {/* Pestaña 1: Origen */}
                {tabFondo === 'origen' && (
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table table-sm table-hover align-middle small mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Fecha</th>
                          <th>Trabajador</th>
                          <th>Tipo de Sanción</th>
                          <th>Monto (S/)</th>
                          <th>Detalle / Comentario</th>
                          <th>Registrado Por</th>
                          <th className="text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!estadoFondo?.ingresosDetalle || estadoFondo.ingresosDetalle.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-muted py-3">
                              No hay sanciones registradas en el ciclo activo.
                            </td>
                          </tr>
                        ) : (
                          estadoFondo.ingresosDetalle.map((s: any) => (
                            <tr key={s.id}>
                              <td>{s.fecha}</td>
                              <td>
                                <strong>{s.colaborador}</strong>
                              </td>
                              <td>
                                <span className="badge bg-secondary">{s.tipoSancion}</span>
                              </td>
                              <td className="text-danger fw-bold">S/ {parseFloat(s.monto).toFixed(2)}</td>
                              <td>
                                <span className="text-muted">{s.detalle}</span>
                              </td>
                              <td>
                                <span className="small">{s.usuario}</span>
                              </td>
                              <td className="text-center">
                                {esMaster && (
                                  <button
                                    className="btn btn-outline-danger btn-sm py-0 px-2"
                                    title="Eliminar Sanción"
                                    onClick={() =>
                                      onOpenEliminarMaster(
                                        'AdelantosSanciones',
                                        s.id,
                                        `Sanción: ${s.colaborador} - S/ ${parseFloat(s.monto).toFixed(2)}`
                                      )
                                    }
                                  >
                                    <i className="bi bi-trash3-fill"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pestaña 2: Entradas y Salidas */}
                {tabFondo === 'movimientos' && (
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table table-sm table-hover align-middle small mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Concepto / Destino</th>
                          <th>Monto (S/)</th>
                          <th>Justificación / Comentario</th>
                          <th>Responsable</th>
                          <th className="text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const movs: any[] = [
                            ...(estadoFondo?.ingresosDetalle?.map((i: any) => ({
                              ...i,
                              modulo: 'AdelantosSanciones',
                              tipo: 'Ingreso',
                              responsable: i.usuario,
                            })) || []),
                            ...(estadoFondo?.retirosDetalle?.map((r: any) => ({
                              ...r,
                              modulo: 'RetirosFondo',
                              tipo: 'Retiro',
                              responsable: `${r.solicitadoPor} [${r.rol}]`,
                              detalle: r.justificacion,
                            })) || []),
                          ].sort((a, b) => (a.fecha > b.fecha ? -1 : 1));

                          if (movs.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="text-center text-muted py-3">
                                  No hay movimientos registrados en el fondo común.
                                </td>
                              </tr>
                            );
                          }

                          return movs.map((m) => (
                            <tr key={`${m.tipo}-${m.id}`}>
                              <td>{m.fecha}</td>
                              <td>
                                {m.tipo === 'Ingreso' ? (
                                  <span className="badge bg-success">
                                    <i className="bi bi-arrow-down-left me-1"></i>Ingreso
                                  </span>
                                ) : (
                                  <span className="badge bg-danger">
                                    <i className="bi bi-arrow-up-right me-1"></i>Retiro
                                  </span>
                                )}
                              </td>
                              <td>
                                <strong>{m.concepto}</strong>
                              </td>
                              <td>
                                {m.tipo === 'Ingreso' ? (
                                  <span className="text-success fw-bold">
                                    + S/ {parseFloat(m.monto).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-danger fw-bold">
                                    - S/ {parseFloat(m.monto).toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className="text-muted small">{m.detalle}</span>
                              </td>
                              <td>
                                <span className="small">{m.responsable}</span>
                              </td>
                              <td className="text-center">
                                {esMaster && (
                                  <button
                                    className="btn btn-outline-danger btn-sm py-0 px-2"
                                    title="Eliminar Movimiento"
                                    onClick={() =>
                                      onOpenEliminarMaster(
                                        m.modulo,
                                        m.id,
                                        `${m.tipo}: ${m.concepto} - S/ ${parseFloat(m.monto).toFixed(2)}`
                                      )
                                    }
                                  >
                                    <i className="bi bi-trash3-fill"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pestaña 3: Resumen por Colaborador */}
                {tabFondo === 'resumen' && (
                  <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table table-sm table-hover align-middle small mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th>Colaborador</th>
                          <th className="text-center">Total Infracciones</th>
                          <th>Total Aportado al Fondo</th>
                          <th>Impacto Relativo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!estadoFondo?.colaboradoresAportantes ||
                        estadoFondo.colaboradoresAportantes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center text-muted py-3">
                              No hay colaboradores sancionados en el fondo.
                            </td>
                          </tr>
                        ) : (
                          estadoFondo.colaboradoresAportantes.map((c: any) => {
                            const total = estadoFondo.totalIngresosHistorico || 1;
                            const pct = ((c.totalAportado / total) * 100).toFixed(1);

                            return (
                              <tr key={c.colaborador}>
                                <td>
                                  <strong>{c.colaborador}</strong>
                                </td>
                                <td className="text-center">
                                  <span className="badge bg-danger">{c.cantidadFaltas} falta(s)</span>
                                </td>
                                <td className="fw-bold text-danger">
                                  S/ {c.totalAportado.toFixed(2)}
                                </td>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="progress flex-grow-1" style={{ height: '6px' }}>
                                      <div
                                        className="progress-bar bg-danger"
                                        style={{ width: `${pct}%` }}
                                      ></div>
                                    </div>
                                    <span className="small text-muted">{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Sancionado Individual (Modo Clásico) */}
      {modalSancionadoIndiv.show && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-danger text-white py-2">
                  <h6 className="modal-title fw-bold">
                    <i className="bi bi-person-x-fill me-2"></i>
                    Historial Disciplinario: {modalSancionadoIndiv.colaborador}
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() =>
                      setModalSancionadoIndiv({ show: false, colaborador: '', detalle: [] })
                    }
                  ></button>
                </div>
                <div className="modal-body p-0">
                  <div className="table-responsive">
                    <table className="table table-sm table-striped align-middle small mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">Fecha</th>
                          <th>Infracción</th>
                          <th>Monto Descontado</th>
                          <th className="pe-3">Detalle / Evidencia / Minutos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalSancionadoIndiv.detalle.map((s, idx) => (
                          <tr key={idx}>
                            <td className="ps-3">{s.fecha}</td>
                            <td>
                              <strong>{s.concepto}</strong>
                            </td>
                            <td className="text-danger fw-bold">S/ {parseFloat(s.monto).toFixed(2)}</td>
                            <td className="pe-3">{s.detalle || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer py-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setModalSancionadoIndiv({ show: false, colaborador: '', detalle: [] })
                    }
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Retiro de Fondo Mancomunado */}
      {modalRetiro && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 100010 }}></div>
          <div className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 100015 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow border-0">
                <div className="modal-header bg-danger text-white py-2">
                  <h6 className="modal-title fw-bold">
                    <i className="bi bi-cash-stack me-2"></i>
                    Solicitud de Retiro para Gastos Comunes
                  </h6>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setModalRetiro(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-light border small py-2 mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Saldo Disponible en Fondo:</span>
                      <strong className="text-success">
                        S/ {(estadoFondo?.saldoDisponibleActual || 0).toFixed(2)}
                      </strong>
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                      Permiso exclusivo para Supervisores, Administradores o Maestro.
                    </span>
                  </div>

                  <form onSubmit={handleEjecutarRetiroFondo}>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Destino / Concepto del Gasto *</label>
                      <select
                        className="form-select form-select-sm"
                        value={retiroConcepto}
                        onChange={(e) => setRetiroConcepto(e.target.value)}
                        required
                      >
                        <option value="">Seleccione concepto...</option>
                        <option value="Comida para el equipo">Comida para el equipo</option>
                        <option value="Lonche / Merienda">Lonche / Merienda</option>
                        <option value="Merienda de turno">Merienda de turno</option>
                        <option value="Daños internos / Reposición">Daños internos / Reposición</option>
                        <option value="Celebración / Integración">Celebración / Integración</option>
                        <option value="Otro gasto común">Otro gasto común de trabajadores</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Monto a Retirar (S/) *</label>
                      <input
                        type="number"
                        step="0.50"
                        min="0.50"
                        className="form-control form-control-sm fw-bold text-danger"
                        placeholder="0.00"
                        value={retiroMonto}
                        onChange={(e) => setRetiroMonto(e.target.value)}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label small fw-bold">Justificación / Motivo Obligatorio *</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={3}
                        placeholder="Explica detalladamente para qué se retira el dinero..."
                        value={retiroJustificacion}
                        onChange={(e) => setRetiroJustificacion(e.target.value)}
                        required
                      ></textarea>
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-3">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setModalRetiro(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn btn-danger btn-sm fw-semibold"
                        disabled={cargando}
                      >
                        <i className="bi bi-check-circle me-1"></i> Confirmar y Retirar Fondos
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
