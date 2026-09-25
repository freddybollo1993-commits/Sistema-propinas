import prisma from './db';

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
 * Calcula el prorrateo de propinas en tiempo real según regla 60% Salón y 40% Cocina
 */
export function calcularProrrateoEnMemoria(
  montoTotal: number,
  participantes: ParticipantInput[]
): {
  fondoSalon: number;
  fondoCocina: number;
  totalHorasSalon: number;
  totalHorasCocina: number;
  detalles: ProrrateoCalculado[];
} {
  const fondoSalon = montoTotal * 0.6;
  const fondoCocina = montoTotal * 0.4;

  let totalHorasSalon = 0;
  let totalHorasCocina = 0;

  participantes.forEach((p) => {
    const h = Number(p.horas) || 0;
    if (p.area.includes('Salón')) totalHorasSalon += h;
    else if (p.area.includes('Cocina')) totalHorasCocina += h;
  });

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

  const registrosValidos = await prisma.registroPropina.findMany({
    where: {
      estado: 'Activo',
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

  const todasSanciones = await prisma.sancionAdelanto.findMany({
    where: {
      estado: 'Aprobado',
      monto: { gt: 0 },
      concepto: { contains: 'Sanción' },
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: { fecha: 'desc' },
  });

  const todosRetiros = await prisma.retiroFondo.findMany({
    where: {
      estado: { notIn: ['Anulado', 'Rechazado'] },
      monto: { gt: 0 },
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: { fecha: 'desc' },
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

/**
 * Motor integral de liquidación de propinas
 */
export async function getLiquidacionResumen(filtroRango?: { inicio?: string; fin?: string; tiendaId?: string }, tiendaIdParam?: string) {
  const tiendaId = filtroRango?.tiendaId || tiendaIdParam;
  const ciclo = await getCicloActivo(tiendaId);
  const fInicio = filtroRango?.inicio || ciclo.fechaInicio;
  const fFin = filtroRango?.fin || ciclo.fechaFin;

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
        propinaBruta: 0,
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

  // 2. Registros de propina válidos de la tienda
  const registros = await prisma.registroPropina.findMany({
    where: {
      estado: 'Activo',
      ...(fInicio && fFin ? { fecha: { gte: fInicio, lte: fFin } } : {}),
      ...(tiendaId ? { tiendaId } : {}),
    },
    include: {
      detalles: true,
    },
    orderBy: { fecha: 'asc' },
  });

  // 3. Procesar detalle de jornadas
  registros.forEach((reg) => {
    reg.detalles.forEach((det) => {
      const nombre = det.colaborador.trim();
      if (!colaboradores[nombre]) {
        colaboradores[nombre] = {
          colaborador: nombre,
          area: det.area.trim(),
          horasTrabajadas: 0,
          diasSet: new Set<string>(),
          detalleDias: [],
          detalleSanciones: [],
          detalleAdelantos: [],
          propinaBruta: 0,
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
      colaboradores[nombre].detalleDias.push({
        idRegistro: reg.id,
        fecha: reg.fecha,
        horas: det.horas,
        propina: det.propina,
      });
    });
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
    reglasActivas[c.infraccion] = esActiva;
    mapLimites[c.infraccion] = c.frecuenciaMax || 1;
    if (c.infraccion.includes('Inasistencia injustificada')) {
      reglasActivas['Inasistencia injustificada'] = esActiva;
      mapLimites['Inasistencia injustificada'] = c.frecuenciaMax || 1;
    }
    if (c.infraccion === 'Abandono de trabajo' && esActiva) {
      reglasActivas['Abandono de estación'] = true;
      reglasActivas['Abandono de estacion'] = true;
    }
    if (c.infraccion === 'Inasistencias a capacitación / reunión' && esActiva) {
      reglasActivas['Inasistencia a capacitación / reunión'] = true;
      reglasActivas['Inasistencia a capacitacion / reunion'] = true;
      reglasActivas['Inasistencias a capacitacion / reunion'] = true;
      mapLimites['Inasistencia a capacitación / reunión'] = c.frecuenciaMax || 1;
      mapLimites['Inasistencia a capacitacion / reunion'] = c.frecuenciaMax || 1;
      mapLimites['Inasistencias a capacitacion / reunion'] = c.frecuenciaMax || 1;
    }
  });

  // 5. Sanciones y adelantos aprobados de la tienda
  const sancionesAdelantos = await prisma.sancionAdelanto.findMany({
    where: {
      estado: 'Aprobado',
      ...(fInicio && fFin ? { fecha: { gte: fInicio, lte: fFin } } : {}),
      ...(tiendaId ? { tiendaId } : {}),
    },
    orderBy: { fecha: 'asc' },
  });

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
        propinaBruta: 0,
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

      // Sanción Especial: Pérdida de la propina del día
      if (item.esEspecial && item.tipoEfecto === 'PERDIDA_DIA') {
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
        } else if (item.montoEspecialCalculado && item.montoEspecialCalculado > 0) {
          montoEfectivo = item.montoEspecialCalculado;
          detalleEfectivo += ` | [Castigo Especial: Pérdida de propina del día ${fechaTarget} (S/ ${montoEfectivo.toFixed(2)})]`;
        }
      }

      colaboradores[nombre].sanciones += montoEfectivo;
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
          const matchMin = (item.detalle || '').match(/Tardanza:\s*(\d+(\.\d+)?)\s*min/i);
          const minTardanza = matchMin ? parseFloat(matchMin[1]) : item.monto > 0 ? tolMin + 1 : 0;
          if (minTardanza <= tolMin && item.monto === 0) {
            cuentaParaFrecuencia = false;
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

  // 6. Evaluar pérdida del 100% por reincidencia
  Object.keys(colaboradores).forEach((nombre) => {
    const c = colaboradores[nombre];
    let superoLimite = false;
    Object.keys(c.conteoInfracciones).forEach((inf) => {
      const nombreLimpio = inf.replace('Sanción:', '').trim();
      if (!reglasActivas[nombreLimpio]) return;
      const maxPermitido = mapLimites[nombreLimpio] || 1;
      if (c.conteoInfracciones[inf] > maxPermitido) {
        superoLimite = true;
      }
    });
    if (superoLimite) {
      c.perdidaTotal = true;
    }
  });

  // 7. Modalidad activa: Clásico vs Fondo Mancomunado
  const modoActivo = await getModoSanciones(tiendaId);
  const esFondoMancomunado = modoActivo === 'FONDO_MANCOMUNADO';

  let fondoRedistribuirTotal = 0;
  let fondoSalonTotal = 0;
  let fondoCocinaTotal = 0;

  // Reparto equitativo en Modo Clásico
  Object.keys(colaboradores).forEach((nombre) => {
    const c = colaboradores[nombre];
    const esSalon = c.area.includes('Salón');
    let montoGenerado = 0;

    if (c.perdidaTotal) {
      montoGenerado = Math.max(0, c.propinaBruta - c.adelantos);
      c.propinaBruta = 0; // Propina confiscada
    } else {
      montoGenerado = c.sanciones;
    }

    if (montoGenerado > 0) {
      fondoRedistribuirTotal += montoGenerado;
      if (esSalon) fondoSalonTotal += montoGenerado;
      else fondoCocinaTotal += montoGenerado;

      const destinatarios = Object.keys(colaboradores).filter((destNombre) => {
        const dest = colaboradores[destNombre];
        const destEsSalon = dest.area.includes('Salón');
        const destEsApoyo = dest.area.toLowerCase().includes('apoyo');
        return (
          destEsSalon === esSalon &&
          destNombre !== nombre &&
          !dest.perdidaTotal &&
          !destEsApoyo &&
          dest.horasTrabajadas > 0
        );
      });

      if (!esFondoMancomunado && destinatarios.length > 0) {
        const cuota = montoGenerado / destinatarios.length;
        destinatarios.forEach((destNombre) => {
          colaboradores[destNombre].bonoRedistribucion += cuota;
        });
      }
    }
  });

  // 8. Determinar textos explicativos de bonos
  Object.keys(colaboradores).forEach((nombre) => {
    const c = colaboradores[nombre];
    const areaTexto = c.area.includes('Salón') ? 'Salón' : 'Cocina';

    if (esFondoMancomunado) {
      c.bonoRedistribucion = 0;
      c.motivoBono =
        'No aplica (Modo Fondo Mancomunado: las sanciones no se redistribuyen; alimentan el fondo común del personal).';
    } else if (c.perdidaTotal) {
      c.bonoRedistribucion = 0;
      c.motivoBono =
        'No aplica (Pérdida del 100% de propinas por superar la frecuencia máxima de sanciones permitidas).';
    } else if (c.area.toLowerCase().includes('apoyo')) {
      c.bonoRedistribucion = 0;
      c.motivoBono = 'No aplica (Personal de Apoyo).';
    } else if (c.bonoRedistribucion > 0 && c.sanciones > 0) {
      c.motivoBono = `Participación en la redistribución de penalizaciones de compañeros de ${areaTexto} (excluyendo su propia sanción).`;
    } else if (c.bonoRedistribucion > 0) {
      c.motivoBono = `Bonificación equitativa del fondo de penalidades del área de ${areaTexto} por registrar cero sanciones.`;
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
    const montoNeto = Math.max(0, c.propinaBruta - deduccionesTotal + c.bonoRedistribucion);

    totalBruto += c.propinaBruta;
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
      motivoBono: c.motivoBono || 'Sin bonificación',
      propinaBruta: Math.round(c.propinaBruta * 100) / 100,
      sanciones: Math.round(c.sanciones * 100) / 100,
      adelantos: Math.round(c.adelantos * 100) / 100,
      deducciones: Math.round(deduccionesTotal * 100) / 100,
      perdidaTotal: c.perdidaTotal,
      bonoRedistribucion: Math.round(c.bonoRedistribucion * 100) / 100,
      montoNeto: Math.round(montoNeto * 100) / 100,
    };
  });

  const fondoMancomunado = await getEstadoFondoMancomunado(filtroRango, tiendaId);

  return {
    lista: listaFinal,
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
