import prisma from './db';
import { ordenarColaboradoresPorArea } from './areas';

export interface ParticipantInput {
  colaborador: string;
  area: string;
  horas: number;
}

export interface ProrrateoCalculado {
  colaborador: string;
  area: string;
  horas: number;
  totalHorasArea: number;
  propinaAsignada: number;
}

/**
 * Calcula el prorrateo de propinas en tiempo real según regla regular (60% Salón y 40% Cocina)
 * o según modo especial de reparto equitativo entre todo el personal (bolsa común unificada).
 */
export function calcularProrrateoEnMemoria(
  montoTotal: number,
  participantes: ParticipantInput[],
  modoODivision: 'REGULAR_60_40' | 'EQUITATIVO_GENERAL' | '60_40' | '50_50' | 'equitativo' | number = 'REGULAR_60_40'
): {
  fondoSalon: number;
  fondoCocina: number;
  totalHorasSalon: number;
  totalHorasCocina: number;
  totalHorasGlobal: number;
  detalles: ProrrateoCalculado[];
} {
  const esEquitativo =
    modoODivision === 'EQUITATIVO_GENERAL' ||
    modoODivision === 'equitativo' ||
    modoODivision === '50_50' ||
    modoODivision === 0.5;

  let totalHorasSalon = 0;
  let totalHorasCocina = 0;
  let totalHorasGlobal = 0;

  participantes.forEach((p) => {
    const h = Number(p.horas) || 0;
    if (h > 0) {
      totalHorasGlobal += h;
      if (p.area.includes('Salón')) totalHorasSalon += h;
      else if (p.area.includes('Cocina')) totalHorasCocina += h;
    }
  });

  if (esEquitativo) {
    // Reparto equitativo entre TODO el personal proporcional a las horas laboradas (bolsa común)
    // Ejemplo: S/ 100 entre 3 salón y 2 cocina con horas iguales = S/ 20 para cada trabajador
    const detalles = participantes.map((p) => {
      const h = Number(p.horas) || 0;
      const propinaAsignada = totalHorasGlobal > 0 ? (montoTotal * h) / totalHorasGlobal : 0;
      return {
        colaborador: p.colaborador,
        area: p.area,
        horas: h,
        totalHorasArea: totalHorasGlobal,
        propinaAsignada: Math.round(propinaAsignada * 100) / 100,
      };
    });

    let sumaSalon = 0;
    let sumaCocina = 0;
    detalles.forEach((d) => {
      if (d.area.includes('Salón')) {
        sumaSalon += d.propinaAsignada;
      } else {
        sumaCocina += d.propinaAsignada;
      }
    });

    const fondoSalon = Math.round(sumaSalon * 100) / 100;
    const fondoCocina = Math.round((montoTotal - fondoSalon) * 100) / 100;

    return {
      fondoSalon,
      fondoCocina,
      totalHorasSalon,
      totalHorasCocina,
      totalHorasGlobal,
      detalles,
    };
  }

  // Modo Regular: 60% Salón / 40% Cocina
  const pctSalon = typeof modoODivision === 'number' && modoODivision > 0 ? modoODivision : 0.6;
  const pctCocina = Math.round((1 - pctSalon) * 100) / 100;
  const fondoSalon = Math.round(montoTotal * pctSalon * 100) / 100;
  const fondoCocina = Math.round(montoTotal * pctCocina * 100) / 100;

  const detalles = participantes.map((p) => {
    const h = Number(p.horas) || 0;
    const esSalon = p.area.includes('Salón');
    const totalHorasArea = esSalon ? totalHorasSalon : totalHorasCocina;
    const fondoArea = esSalon ? fondoSalon : fondoCocina;
    const propinaAsignada = totalHorasArea > 0 ? fondoArea * (h / totalHorasArea) : 0;

    return {
      colaborador: p.colaborador,
      area: p.area,
      horas: h,
      totalHorasArea,
      propinaAsignada: Math.round(propinaAsignada * 100) / 100,
    };
  });

  return {
    fondoSalon,
    fondoCocina,
    totalHorasSalon,
    totalHorasCocina,
    totalHorasGlobal,
    detalles,
  };
}

/**
 * Obtiene el ciclo de fechas activo actual
 */
export async function getCicloActivo(tiendaId?: string) {
  const hoy = new Date().toISOString().split('T')[0];
  const whereBase: any = { estado: 'Abierto' };
  if (tiendaId) whereBase.tiendaId = tiendaId;

  let ciclo = await prisma.cicloLiquidacion.findFirst({
    where: whereBase,
    orderBy: { id: 'desc' },
  });

  if (!ciclo) {
    ciclo = await prisma.cicloLiquidacion.findFirst({
      where: tiendaId ? { tiendaId } : {},
      orderBy: { id: 'desc' },
    });
  }

  if (!ciclo) {
    return { id: 1, fechaInicio: hoy, fechaFin: hoy, estado: 'Abierto', tiendaId: tiendaId || null };
  }

  return ciclo;
}

/**
 * Obtiene la configuración del modo de sanciones: CLASICO o FONDO_MANCOMUNADO
 */
export async function getModoSanciones(tiendaId?: string): Promise<'CLASICO' | 'FONDO_MANCOMUNADO'> {
  const whereClause: any = { clave: 'MODO_SANCIONES' };
  if (tiendaId) whereClause.tiendaId = tiendaId;

  const config = await prisma.configuracionSistema.findFirst({
    where: whereClause,
  });
  if (config && config.valor === 'FONDO_MANCOMUNADO') {
    return 'FONDO_MANCOMUNADO';
  }
  return 'CLASICO';
}

/**
 * Calcula los promedios diarios de propina por colaborador dentro del ciclo activo
 */
export async function getPromediosColaboradores(tiendaId?: string): Promise<Record<string, number>> {
  const ciclo = await getCicloActivo(tiendaId);
  const fInicio = ciclo.fechaInicio;
  const fFin = ciclo.fechaFin;

  const rawRegistrosValidos = await prisma.registroPropina.findMany({
    where: {
      estado: 'Activo',
      NOT: {
        estado: { in: ['Anulado', 'anulado', 'ANULADO', 'Pendiente de Anulación', 'Eliminado', 'Rechazado'] },
      },
      ...(tiendaId ? { tiendaId } : {}),
      fecha: {
        gte: fInicio,
        lte: fFin,
      },
    },
    include: {
      detalles: true,
    },
  });

  const registrosValidos = rawRegistrosValidos.filter(
    (r) => (r.estado || '').trim().toLowerCase() === 'activo'
  );

  const stats: Record<string, { totalPropina: number; diasSet: Set<string> }> = {};

  registrosValidos.forEach((reg) => {
    reg.detalles.forEach((det) => {
      const nombre = det.colaborador.trim();
      if (!stats[nombre]) {
        stats[nombre] = { totalPropina: 0, diasSet: new Set() };
      }
      stats[nombre].totalPropina += det.propina;
      if (reg.fecha) stats[nombre].diasSet.add(reg.fecha);
    });
  });

  const promedios: Record<string, number> = {};
  Object.keys(stats).forEach((nombre) => {
    const cantDias = stats[nombre].diasSet.size;
    promedios[nombre] = cantDias > 0 ? stats[nombre].totalPropina / cantDias : 0;
  });

  return promedios;
}

/**
 * Calcula el estado, ingresos, retiros y trazabilidad multi-ciclo del Fondo Mancomunado
 */
export async function getEstadoFondoMancomunado(filtroRango?: { inicio?: string; fin?: string; tiendaId?: string }, tiendaIdParam?: string) {
  const tiendaId = filtroRango?.tiendaId || tiendaIdParam;
  const ciclo = await getCicloActivo(tiendaId);
  const fInicio = filtroRango?.inicio || ciclo.fechaInicio;
  const fFin = filtroRango?.fin || ciclo.fechaFin;

  const modoActivo = await getModoSanciones(tiendaId);
  const esModoFondoActivo = modoActivo === 'FONDO_MANCOMUNADO';

  const rawSanciones = await prisma.sancionAdelanto.findMany({
    where: {
      estado: 'Aprobado',
      NOT: {
        estado: { in: ['Anulado', 'anulado', 'ANULADO', 'Rechazado', 'rechazado', 'Pendiente', 'pendiente'] },
      },
      monto: { gt: 0 },
      concepto: { contains: 'Sanción' },
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: { fecha: 'desc' },
  });

  const todasSanciones = rawSanciones.filter(
    (s) => (s.estado || '').trim().toLowerCase() === 'aprobado'
  );

  const rawRetiros = await prisma.retiroFondo.findMany({
    where: {
      estado: { notIn: ['Anulado', 'anulado', 'ANULADO', 'Rechazado', 'rechazado', 'Eliminado', 'Pendiente', 'pendiente'] },
      monto: { gt: 0 },
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: { fecha: 'desc' },
  });

  const todosRetiros = rawRetiros.filter((r) => {
    const est = (r.estado || '').trim().toLowerCase();
    return est !== 'anulado' && est !== 'rechazado' && est !== 'eliminado' && est !== 'pendiente';
  });

  let totalIngresosHistorico = 0;
  let totalIngresosCiclo = 0;
  let totalIngresosAnterior = 0;
  const ingresosDetalle: any[] = [];
  const colaboradoresAportantes: Record<
    string,
    { colaborador: string; totalAportado: number; cantidadFaltas: number; infracciones: any[] }
  > = {};

  for (const s of todasSanciones) {
    const concepto = s.concepto.trim();
    const esSancionFondoExplicita = concepto.includes('Sanción Fondo');
    const esSancionDelCicloActivo = esModoFondoActivo && concepto.includes('Sanción');

    if (esSancionFondoExplicita || esSancionDelCicloActivo) {
      totalIngresosHistorico += s.monto;
      const tipoSancion = concepto.replace('Sanción Fondo: ', '').replace('Sanción: ', '');
      const itemIngreso = {
        id: s.id,
        fecha: s.fecha,
        colaborador: s.colaborador,
        tipoSancion,
        concepto,
        monto: s.monto,
        detalle: s.detalle || '',
        usuario: s.usuario,
        tipo: 'Ingreso',
      };
      ingresosDetalle.push(itemIngreso);

      if (fInicio && s.fecha < fInicio) {
        totalIngresosAnterior += s.monto;
      } else {
        totalIngresosCiclo += s.monto;
      }

      const colab = s.colaborador.trim();
      if (!colaboradoresAportantes[colab]) {
        colaboradoresAportantes[colab] = {
          colaborador: colab,
          totalAportado: 0,
          cantidadFaltas: 0,
          infracciones: [],
        };
      }
      colaboradoresAportantes[colab].totalAportado += s.monto;
      colaboradoresAportantes[colab].cantidadFaltas += 1;
      colaboradoresAportantes[colab].infracciones.push(itemIngreso);
    }
  }

  let totalRetirosHistorico = 0;
  let totalRetirosCiclo = 0;
  let totalRetirosAnterior = 0;
  const retirosDetalle: any[] = [];

  for (const r of todosRetiros) {
    totalRetirosHistorico += r.monto;
    const itemRetiro = {
      id: r.id,
      fecha: r.fecha,
      concepto: r.concepto,
      monto: r.monto,
      justificacion: r.justificacion,
      solicitadoPor: r.solicitadoPor,
      rol: r.rol,
      estado: r.estado,
      tipo: 'Retiro',
    };
    retirosDetalle.push(itemRetiro);

    if (fInicio && r.fecha < fInicio) {
      totalRetirosAnterior += r.monto;
    } else {
      totalRetirosCiclo += r.monto;
    }
  }

  const saldoInicialCiclo = Math.max(0, totalIngresosAnterior - totalRetirosAnterior);
  const saldoDisponibleActual = Math.max(0, totalIngresosHistorico - totalRetirosHistorico);
  const saldoCicloRemanente = Math.max(
    0,
    saldoInicialCiclo + totalIngresosCiclo - totalRetirosCiclo
  );

  return {
    success: true,
    saldoDisponibleActual,
    saldoInicialCiclo,
    totalIngresosCiclo,
    totalRetirosCiclo,
    saldoCicloRemanente,
    totalIngresosHistorico,
    totalRetirosHistorico,
    ingresosDetalle,
    retirosDetalle,
    colaboradoresAportantes: Object.values(colaboradoresAportantes),
  };
}

export interface SancionParaRedistribucion {
  id?: number;
  colaborador: string;
  monto: number;
  fecha: string;
  area: string;
}

export interface TrabajadorJornadaFecha {
  colaborador: string;
  horas: number;
  area: string;
}

export interface DetalleBonoAsignado {
  fecha: string;
  sancionado: string;
  montoSancion: number;
  montoBono: number;
  horasTrabajador: number;
  totalHorasArea: number;
  area: string;
}

export interface ResultadoRedistribucion {
  bonosPorColaborador: Record<string, number>;
  detallesPorColaborador: Record<string, DetalleBonoAsignado[]>;
  fondoRedistribuirTotal: number;
  fondoSalonTotal: number;
  fondoCocinaTotal: number;
}

/**
 * Motor de redistribución de propinas por sanciones según reglas de negocio:
 * 1. Solo para el personal registrado en la MISMA FECHA que se registra la sanción.
 * 2. Prorrateado según las HORAS REGISTRADAS por trabajador en esa fecha (carga de trabajo).
 * 3. Salón para Salón y Cocina para Cocina.
 * 4. Excluye al trabajador sancionado y a trabajadores con pérdida total.
 */
export function calcularRedistribucionSanciones(
  sanciones: SancionParaRedistribucion[],
  personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>>,
  colaboradoresConPerdidaTotal: Set<string> = new Set()
): ResultadoRedistribucion {
  const bonosPorColaborador: Record<string, number> = {};
  const detallesPorColaborador: Record<string, DetalleBonoAsignado[]> = {};
  let fondoRedistribuirTotal = 0;
  let fondoSalonTotal = 0;
  let fondoCocinaTotal = 0;

  for (const s of sanciones) {
    const montoSancion = Number(s.monto) || 0;
    if (montoSancion <= 0) continue;

    const fechaSancion = (s.fecha || '').trim();
    if (!fechaSancion) continue;

    const sancionado = (s.colaborador || '').trim();
    const esSalonSancionado = (s.area || '').includes('Salón') || (s.area || '').includes('Salon');

    // 1. Obtener los trabajadores registrados en la MISMA FECHA que se registra la sanción
    const trabajadoresDia = personalPorFecha[fechaSancion];
    if (!trabajadoresDia) {
      continue;
    }

    // 2. Filtrar destinatarios elegibles:
    // - Misma área (Salón para Salón, Cocina para Cocina)
    // - Distinto al sancionado
    // - No tiene pérdida total
    // - Horas trabajadas en esa fecha > 0
    const destinatariosNombres = Object.keys(trabajadoresDia).filter((nom) => {
      if (nom === sancionado) return false;
      if (colaboradoresConPerdidaTotal.has(nom)) return false;

      const t = trabajadoresDia[nom];
      if (!t || Number(t.horas) <= 0) return false;

      const esSalonTrabajador = t.area.includes('Salón') || t.area.includes('Salon');
      return esSalonTrabajador === esSalonSancionado;
    });

    if (destinatariosNombres.length === 0) {
      continue;
    }

    // 3. Sumar las horas trabajadas por los destinatarios elegibles en esa fecha
    const totalHorasAreaDia = destinatariosNombres.reduce((sum, nom) => {
      return sum + Number(trabajadoresDia[nom].horas || 0);
    }, 0);

    if (totalHorasAreaDia <= 0) continue;

    fondoRedistribuirTotal += montoSancion;
    if (esSalonSancionado) {
      fondoSalonTotal += montoSancion;
    } else {
      fondoCocinaTotal += montoSancion;
    }

    // 4. Distribuir proporcionalmente según horas trabajadas en esa fecha
    for (const nom of destinatariosNombres) {
      const horasTrabajador = Number(trabajadoresDia[nom].horas || 0);
      const cuota = (montoSancion * horasTrabajador) / totalHorasAreaDia;

      bonosPorColaborador[nom] = (bonosPorColaborador[nom] || 0) + cuota;

      if (!detallesPorColaborador[nom]) {
        detallesPorColaborador[nom] = [];
      }
      detallesPorColaborador[nom].push({
        fecha: fechaSancion,
        sancionado,
        montoSancion,
        montoBono: Math.round(cuota * 100) / 100,
        horasTrabajador,
        totalHorasArea: totalHorasAreaDia,
        area: esSalonSancionado ? 'Salón' : 'Cocina',
      });
    }
  }

  return {
    bonosPorColaborador,
    detallesPorColaborador,
    fondoRedistribuirTotal,
    fondoSalonTotal,
    fondoCocinaTotal,
  };
}

/**
 * Motor integral de liquidación de propinas
 */
export async function getLiquidacionResumen(filtroRango?: { inicio?: string; fin?: string; tiendaId?: string }, tiendaIdParam?: string) {
  const tiendaId = filtroRango?.tiendaId || tiendaIdParam;
  const ciclo = await getCicloActivo(tiendaId);
  const fInicio = filtroRango?.inicio || ciclo.fechaInicio;
  const fFin = filtroRango?.fin || ciclo.fechaFin;

  const modoActivo = await getModoSanciones(tiendaId);
  const esFondoMancomunado = modoActivo === 'FONDO_MANCOMUNADO';

  // 1. Obtener personal activo de la tienda
  const personal = await prisma.colaborador.findMany({
    where: {
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: { nombre: 'asc' },
  });

  const colaboradores: Record<string, any> = {};
  personal.forEach((p) => {
    if (p.estado.toLowerCase() !== 'inactivo' && p.nombre) {
      colaboradores[p.nombre.trim()] = {
        colaborador: p.nombre.trim(),
        area: p.area.trim(),
        horasTrabajadas: 0,
        diasSet: new Set<string>(),
        detalleDias: [],
        detalleSanciones: [],
        detalleAdelantos: [],
        detalleBonoRedistribucion: [],
        propinaBruta: 0,
        propinaBrutaOriginal: 0,
        sanciones: 0,
        adelantos: 0,
        conteoInfracciones: {} as Record<string, number>,
        perdidaTotal: false,
        bonoRedistribucion: 0,
        montoNeto: 0,
        motivoBono: '',
      };
    }
  });

  // 2. Registros de propina válidos de la tienda (Excluyendo estrictamente anulados y pendientes)
  const rawRegistros = await prisma.registroPropina.findMany({
    where: {
      estado: 'Activo',
      NOT: {
        estado: { in: ['Anulado', 'anulado', 'ANULADO', 'Pendiente de Anulación', 'Eliminado', 'Rechazado'] },
      },
      ...(fInicio && fFin ? { fecha: { gte: fInicio, lte: fFin } } : {}),
      ...(tiendaId ? { tiendaId } : {}),
    },
    include: {
      detalles: true,
    },
    orderBy: { fecha: 'asc' },
  });

  const registros = rawRegistros.filter(
    (r) => (r.estado || '').trim().toLowerCase() === 'activo'
  );

  // 3. Procesar detalle de jornadas
  // Mapa de colaboradores y sus horas efectivas por fecha: fecha -> nombre -> { colaborador, horas, area }
  const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {};

  registros.forEach((reg) => {
    reg.detalles.forEach((det) => {
      const nombre = det.colaborador.trim();
      const fecha = reg.fecha;

      // Indexar horas por fecha para redistribución quirúrgica por carga de trabajo
      if (!personalPorFecha[fecha]) {
        personalPorFecha[fecha] = {};
      }
      if (!personalPorFecha[fecha][nombre]) {
        personalPorFecha[fecha][nombre] = {
          colaborador: nombre,
          horas: 0,
          area: det.area.trim(),
        };
      }
      personalPorFecha[fecha][nombre].horas += det.horas;

      if (!colaboradores[nombre]) {
        colaboradores[nombre] = {
          colaborador: nombre,
          area: det.area.trim(),
          horasTrabajadas: 0,
          diasSet: new Set<string>(),
          detalleDias: [],
          jornadasPorFecha: {} as Record<string, any>,
          detalleSanciones: [],
          detalleAdelantos: [],
          detalleBonoRedistribucion: [],
          propinaBruta: 0,
          propinaBrutaOriginal: 0,
          sanciones: 0,
          adelantos: 0,
          conteoInfracciones: {},
          perdidaTotal: false,
          bonoRedistribucion: 0,
          montoNeto: 0,
          motivoBono: '',
        };
      }
      colaboradores[nombre].horasTrabajadas += det.horas;
      if (reg.fecha) colaboradores[nombre].diasSet.add(reg.fecha);
      colaboradores[nombre].propinaBruta += det.propina;
      colaboradores[nombre].propinaBrutaOriginal += det.propina;

      // Agrupar turnos en la misma fecha para unificarlos en la liquidación
      if (!colaboradores[nombre].jornadasPorFecha) {
        colaboradores[nombre].jornadasPorFecha = {};
      }
      if (!colaboradores[nombre].jornadasPorFecha[fecha]) {
        colaboradores[nombre].jornadasPorFecha[fecha] = {
          fecha,
          ids: [reg.id],
          horas: det.horas,
          propina: det.propina,
          turnosDetalle: [
            { idRegistro: reg.id, horas: det.horas, propina: det.propina, estado: reg.estado }
          ],
        };
      } else {
        colaboradores[nombre].jornadasPorFecha[fecha].ids.push(reg.id);
        colaboradores[nombre].jornadasPorFecha[fecha].horas += det.horas;
        colaboradores[nombre].jornadasPorFecha[fecha].propina += det.propina;
        colaboradores[nombre].jornadasPorFecha[fecha].turnosDetalle.push({
          idRegistro: reg.id,
          horas: det.horas,
          propina: det.propina,
          estado: reg.estado,
        });
      }
    });
  });

  // Consolidar detalleDias unificado por fecha para cada colaborador
  Object.keys(colaboradores).forEach((nombre) => {
    const c = colaboradores[nombre];
    const mapa = c.jornadasPorFecha || {};
    c.detalleDias = Object.values(mapa)
      .map((j: any) => {
        const ids = j.ids || [];
        const cantTurnos = ids.length;
        return {
          fecha: j.fecha,
          idRegistro: cantTurnos === 1 ? ids[0] : ids.join(', '),
          turnoTexto: cantTurnos > 1 ? `${cantTurnos} turnos (#${ids.join(', #')})` : `Reg #${ids[0]}`,
          horas: Math.round(j.horas * 100) / 100,
          propina: Math.round(j.propina * 100) / 100,
          estado: 'Activo',
          cantTurnos,
          idsRegistro: ids,
          turnosDetalle: j.turnosDetalle,
        };
      })
      .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));
  });

  // 4. Catálogo de sanciones de la tienda
  const catalogo = await prisma.reglaSancion.findMany({
    where: {
      ...(tiendaId ? { tiendaId } : {}),
    },
  });
  const reglasActivas: Record<string, boolean> = {};
  const mapLimites: Record<string, number> = {};

  catalogo.forEach((c) => {
    const esActiva = c.estado.toLowerCase() === 'activo';
    const frecVal =
      c.frecuenciaMax !== undefined && c.frecuenciaMax !== null ? Math.max(0, c.frecuenciaMax) : 0;
    reglasActivas[c.infraccion] = esActiva;
    mapLimites[c.infraccion] = frecVal;
    if (c.infraccion.includes('Inasistencia injustificada')) {
      reglasActivas['Inasistencia injustificada'] = esActiva;
      mapLimites['Inasistencia injustificada'] = frecVal;
    }
    if (c.infraccion === 'Abandono de trabajo' && esActiva) {
      reglasActivas['Abandono de estación'] = true;
      reglasActivas['Abandono de estacion'] = true;
    }
    if (c.infraccion === 'Inasistencias a capacitación / reunión' && esActiva) {
      reglasActivas['Inasistencia a capacitación / reunión'] = true;
      reglasActivas['Inasistencia a capacitacion / reunion'] = true;
      reglasActivas['Inasistencias a capacitacion / reunion'] = true;
      mapLimites['Inasistencia a capacitación / reunión'] = frecVal;
      mapLimites['Inasistencia a capacitacion / reunion'] = frecVal;
      mapLimites['Inasistencias a capacitacion / reunion'] = frecVal;
    }
  });

  // 5. Sanciones y adelantos aprobados de la tienda (Excluyendo estrictamente anulados o rechazados)
  const rawSancionesAdelantos = await prisma.sancionAdelanto.findMany({
    where: {
      estado: 'Aprobado',
      NOT: {
        estado: { in: ['Anulado', 'anulado', 'ANULADO', 'Rechazado', 'rechazado', 'Pendiente', 'pendiente'] },
      },
      ...(fInicio && fFin ? { fecha: { gte: fInicio, lte: fFin } } : {}),
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  });

  const sancionesAdelantos = rawSancionesAdelantos.filter(
    (item) => (item.estado || '').trim().toLowerCase() === 'aprobado'
  );

  const bolsaTardanzaPorColaborador: Record<string, number> = {};
  const sancionesAprobadasList: SancionParaRedistribucion[] = [];

  sancionesAdelantos.forEach((item) => {
    const nombre = item.colaborador.trim();
    if (!colaboradores[nombre]) {
      colaboradores[nombre] = {
        colaborador: nombre,
        area: 'Salón',
        horasTrabajadas: 0,
        diasSet: new Set<string>(),
        detalleDias: [],
        detalleSanciones: [],
        detalleAdelantos: [],
        detalleBonoRedistribucion: [],
        propinaBruta: 0,
        propinaBrutaOriginal: 0,
        sanciones: 0,
        adelantos: 0,
        conteoInfracciones: {},
        perdidaTotal: false,
        bonoRedistribucion: 0,
        montoNeto: 0,
        motivoBono: '',
      };
    }

    if (item.concepto.includes('Sanción')) {
      let montoEfectivo = item.monto;
      let detalleEfectivo = item.detalle || 'Falta disciplinaria';

      // Sanción Especial: Pérdida de la propina del día (Exclusivo de Modo Clásico, NUNCA en Fondo Mancomunado)
      if (!esFondoMancomunado && item.esEspecial && item.tipoEfecto === 'PERDIDA_DIA') {
        const fechaTarget = item.fechaAfectada || item.fecha;
        const jornadasEseDia = colaboradores[nombre].detalleDias.filter(
          (d: any) => d.fecha === fechaTarget
        );
        const propinaGanadaEseDia = jornadasEseDia.reduce(
          (acc: number, j: any) => acc + (j.propina || 0),
          0
        );

        if (propinaGanadaEseDia > 0) {
          montoEfectivo = Math.round(propinaGanadaEseDia * 100) / 100;
          detalleEfectivo += ` | [Castigo Especial: Pérdida del 100% de propina del día ${fechaTarget} (S/ ${montoEfectivo.toFixed(2)})]`;
        } else {
          // Si el día no tiene jornada activa registrada o fue anulado, no cobrar penalidad sobre propina inexistente
          montoEfectivo = 0;
          detalleEfectivo += ` | [Castigo Especial: Día ${fechaTarget} sin propina activa registrada o jornada anulada (S/ 0.00)]`;
        }
      }

      colaboradores[nombre].sanciones += montoEfectivo;

      if (montoEfectivo > 0) {
        sancionesAprobadasList.push({
          id: item.id,
          colaborador: nombre,
          monto: montoEfectivo,
          fecha: (item.fechaAfectada || item.fecha).trim(),
          area: colaboradores[nombre]?.area || 'Salón',
        });
      }

      let cuentaParaFrecuencia = true;
      let etiquetaConteo = item.concepto
        .replace('Sanción Fondo: ', '')
        .replace('Sanción: ', '')
        .trim();

      if (etiquetaConteo.includes('Inasistencia injustificada')) {
        etiquetaConteo = 'Inasistencia injustificada';
      } else if (
        etiquetaConteo.toLowerCase() === 'abandono de estación' ||
        etiquetaConteo.toLowerCase() === 'abandono de estacion'
      ) {
        etiquetaConteo = 'Abandono de trabajo';
      } else if (
        etiquetaConteo.toLowerCase() === 'inasistencia a capacitación / reunión' ||
        etiquetaConteo.toLowerCase() === 'inasistencia a capacitacion / reunion' ||
        etiquetaConteo.toLowerCase() === 'inasistencias a capacitacion / reunion'
      ) {
        etiquetaConteo = 'Inasistencias a capacitación / reunión';
      } else if (etiquetaConteo.includes('Tardanza')) {
        etiquetaConteo = 'Tardanza';
        const reglaTard = catalogo.find((c) => c.infraccion === 'Tardanza');
        if (reglaTard && reglaTard.toleranciaActiva && !item.esEspecial) {
          const tolMin = reglaTard.toleranciaMin || 0;
          const matchMin = (item.detalle || '').match(/Tardanza:\s*(\d+(\.\d+)?)\s*min/i) ||
                           (item.detalle || '').match(/(\d+(\.\d+)?)\s*min/i);
          const minTardanza = matchMin ? parseFloat(matchMin[1]) : item.monto > 0 ? tolMin + 1 : 0;

          bolsaTardanzaPorColaborador[nombre] = (bolsaTardanzaPorColaborador[nombre] || 0) + minTardanza;

          // Si el total acumulado en el ciclo no supera la bolsa de tolerancia quincenal y no tiene monto explícito
          if (bolsaTardanzaPorColaborador[nombre] <= tolMin && item.monto === 0) {
            cuentaParaFrecuencia = false;
          } else {
            cuentaParaFrecuencia = true;
          }
        }
      }

      if (cuentaParaFrecuencia) {
        colaboradores[nombre].conteoInfracciones[etiquetaConteo] =
          (colaboradores[nombre].conteoInfracciones[etiquetaConteo] || 0) + 1;
      }

      colaboradores[nombre].detalleSanciones.push({
        id: item.id,
        fecha: item.fecha,
        infraccion: item.concepto.replace('Sanción Fondo: ', '').replace('Sanción: ', '').trim(),
        monto: montoEfectivo,
        detalle: detalleEfectivo,
        estado: item.estado,
        esEspecial: item.esEspecial,
      });
    } else if (item.concepto.includes('Adelanto')) {
      colaboradores[nombre].adelantos += item.monto;
      colaboradores[nombre].detalleAdelantos.push({
        id: item.id,
        fecha: item.fecha,
        concepto: 'Adelanto de Propinas',
        monto: item.monto,
        detalle: item.detalle || 'Adelanto solicitado',
        estado: item.estado,
      });
    }
  });

  // 6. Evaluar pérdida del 100% por reincidencia (Exclusivo de Modo Clásico)
  // En Fondo Mancomunado no aplican las condiciones del modelo clásico y NUNCA se pierde el 100% de la propina
  const colaboradoresConPerdidaTotal = new Set<string>();
  if (!esFondoMancomunado) {
    Object.keys(colaboradores).forEach((nombre) => {
      const c = colaboradores[nombre];
      let superoLimite = false;
      Object.keys(c.conteoInfracciones).forEach((inf) => {
        const nombreLimpio = inf.replace('Sanción:', '').trim();
        if (!reglasActivas[nombreLimpio]) return;
        const maxPermitido = mapLimites[nombreLimpio] !== undefined ? mapLimites[nombreLimpio] : 0;
        if (c.conteoInfracciones[inf] > maxPermitido) {
          superoLimite = true;
        }
      });
      if (superoLimite) {
        c.perdidaTotal = true;
        colaboradoresConPerdidaTotal.add(nombre);
      }
    });
  } else {
    Object.keys(colaboradores).forEach((nombre) => {
      colaboradores[nombre].perdidaTotal = false;
    });
  }

  // 7. Redistribución por sanciones en Modo Clásico:
  // - Solo para el personal registrado en la MISMA FECHA que se registra la sanción.
  // - Prorrateado según las HORAS REGISTRADAS por trabajador en esa fecha (carga de trabajo).
  // - Salón para Salón y Cocina para Cocina.
  let fondoRedistribuirTotal = 0;
  let fondoSalonTotal = 0;
  let fondoCocinaTotal = 0;

  if (!esFondoMancomunado) {
    const sancionesParaRedistribuir: SancionParaRedistribucion[] = [];

    // A) Colaboradores con Pérdida Total del 100%:
    // Su propina confiscada día a día se redistribuye a los compañeros de la misma fecha y área según horas
    Object.keys(colaboradores).forEach((nombre) => {
      const c = colaboradores[nombre];
      if (c.perdidaTotal) {
        c.propinaBruta = 0; // Se anula la percepción neta del sancionado
        c.detalleDias.forEach((d: any) => {
          if (d.propina > 0) {
            sancionesParaRedistribuir.push({
              colaborador: c.colaborador,
              monto: d.propina,
              fecha: d.fecha,
              area: c.area,
            });
          }
        });
      }
    });

    // B) Sanciones regulares de colaboradores que NO tienen pérdida total
    sancionesAprobadasList.forEach((s) => {
      const c = colaboradores[s.colaborador];
      if (!c || !c.perdidaTotal) {
        sancionesParaRedistribuir.push(s);
      }
    });

    const resultado = calcularRedistribucionSanciones(
      sancionesParaRedistribuir,
      personalPorFecha,
      colaboradoresConPerdidaTotal
    );

    fondoSalonTotal = resultado.fondoSalonTotal;
    fondoCocinaTotal = resultado.fondoCocinaTotal;

    Object.keys(colaboradores).forEach((nombre) => {
      const c = colaboradores[nombre];
      const bono = resultado.bonosPorColaborador[nombre] || 0;
      c.bonoRedistribucion = Math.round(bono * 100) / 100;
      c.detalleBonoRedistribucion = resultado.detallesPorColaborador[nombre] || [];
    });

    fondoRedistribuirTotal = Object.values(colaboradores).reduce(
      (acc: number, c: any) => acc + (c.bonoRedistribucion || 0),
      0
    );
  }

  // 8. Determinar textos explicativos de bonos
  Object.keys(colaboradores).forEach((nombre) => {
    const c = colaboradores[nombre];
    const areaTexto = c.area.includes('Salón') ? 'Salón' : 'Cocina';
    const cantBeneficios = c.detalleBonoRedistribucion?.length || 0;

    if (esFondoMancomunado) {
      c.bonoRedistribucion = 0;
      c.motivoBono =
        'No aplica (Modo Fondo Mancomunado: las sanciones no se redistribuyen; alimentan el fondo común del personal).';
    } else if (c.perdidaTotal) {
      c.bonoRedistribucion = 0;
      c.motivoBono = c.adelantos > 0
        ? `No aplica (Pérdida del 100% de propina por reincidencia de sanciones. Saldo deudor de S/ ${c.adelantos.toFixed(2)} pendiente de devolución por el trabajador al fondo).`
        : 'No aplica (Pérdida del 100% de propinas por superar la frecuencia máxima de sanciones permitidas).';
    } else if (c.bonoRedistribucion > 0) {
      c.motivoBono = `Redistribución de sanciones de ${areaTexto} en la(s) misma(s) fecha(s) laborada(s), proporcional a las horas trabajadas (${cantBeneficios} sanción${cantBeneficios > 1 ? 'es' : ''} redistribuida${cantBeneficios > 1 ? 's' : ''}).`;
    } else {
      c.motivoBono = 'Sin bonificaciones por redistribución aplicables en este ciclo.';
    }
  });

  // 9. Consolidar totales finales
  let totalBruto = 0;
  let totalDeducciones = 0;
  let totalNetoGeneral = 0;
  let horasSalon = 0;
  let horasCocina = 0;

  const listaFinal = Object.keys(colaboradores).map((nombre) => {
    const c = colaboradores[nombre];
    const diasTrabajados = c.diasSet.size;
    const deduccionesTotal = c.sanciones + c.adelantos;
    const montoNeto = c.perdidaTotal
      ? 0
      : Math.max(0, c.propinaBruta - deduccionesTotal + c.bonoRedistribucion);

    const propinaBrutaReporte = c.propinaBrutaOriginal !== undefined ? c.propinaBrutaOriginal : c.propinaBruta;

    totalBruto += propinaBrutaReporte;
    totalDeducciones += deduccionesTotal;
    totalNetoGeneral += montoNeto;

    if (c.area.includes('Salón')) horasSalon += c.horasTrabajadas;
    else if (c.area.includes('Cocina')) horasCocina += c.horasTrabajadas;

    return {
      colaborador: c.colaborador,
      area: c.area,
      diasTrabajados,
      horasTrabajadas: Math.round(c.horasTrabajadas * 10) / 10,
      detalleDias: c.detalleDias.sort((a: any, b: any) => (a.fecha > b.fecha ? 1 : -1)),
      detalleSanciones: c.detalleSanciones.sort((a: any, b: any) => (a.fecha > b.fecha ? 1 : -1)),
      detalleAdelantos: c.detalleAdelantos.sort((a: any, b: any) => (a.fecha > b.fecha ? 1 : -1)),
      detalleBonoRedistribucion: c.detalleBonoRedistribucion || [],
      motivoBono: c.motivoBono || 'Sin bonificación',
      propinaBruta: c.perdidaTotal ? 0 : Math.round(propinaBrutaReporte * 100) / 100,
      propinaBrutaOriginal: Math.round(propinaBrutaReporte * 100) / 100,
      sanciones: Math.round(c.sanciones * 100) / 100,
      adelantos: Math.round(c.adelantos * 100) / 100,
      deducciones: Math.round(deduccionesTotal * 100) / 100,
      perdidaTotal: c.perdidaTotal,
      bonoRedistribucion: Math.round(c.bonoRedistribucion * 100) / 100,
      montoNeto: Math.round(montoNeto * 100) / 100,
    };
  });

  const fondoMancomunado = await getEstadoFondoMancomunado(filtroRango, tiendaId);

  const listaOrdenada = ordenarColaboradoresPorArea(listaFinal);

  return {
    lista: listaOrdenada,
    horasSalon: Math.round(horasSalon * 10) / 10,
    horasCocina: Math.round(horasCocina * 10) / 10,
    totalBruto: Math.round(totalBruto * 100) / 100,
    totalDeducciones: Math.round(totalDeducciones * 100) / 100,
    totalRedistribuido: esFondoMancomunado ? 0 : Math.round(fondoRedistribuirTotal * 100) / 100,
    totalNetoGeneral: Math.round(totalNetoGeneral * 100) / 100,
    cicloActivo: ciclo,
    modoActivo,
    fondoMancomunado,
  };
}
