import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

function formatearFechaIso(v: any): string {
  if (!v) return '';
  if (v instanceof Date) {
    return v.toISOString().split('T')[0];
  }
  const str = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(str)) {
    const parts = str.split(/[/-]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2].substring(0, 4);
    return `${y}-${m}-${d}`;
  }
  return str;
}

const DIAS_SEMANA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filtroSede = searchParams.get('sede') || '';
    const fInicio = searchParams.get('inicio') || '';
    const fFin = searchParams.get('fin') || '';
    const limiteStr = searchParams.get('limite');
    const limite = limiteStr !== null ? parseInt(limiteStr) : 0;

    // 1. Obtener todas las tiendas operativas (excluyendo la tienda de pruebas / beta)
    const tiendasDb = await prisma.tienda.findMany({
      where: {
        estado: 'Activo',
        NOT: [
          { slug: { contains: 'beta', mode: 'insensitive' } },
          { id: 'tienda-principal' },
          { nombre: { contains: 'BETA', mode: 'insensitive' } },
          { nombre: { contains: 'Pruebas', mode: 'insensitive' } },
        ],
      },
      orderBy: { nombre: 'asc' },
    });
    const sedesList = tiendasDb.map((t) => t.nombre);
    const tiendasMap = new Map(tiendasDb.map((t) => [t.id, t.nombre]));
    const activeTiendaIds = tiendasDb.map((t) => t.id);

    // 2. Filtro de Tienda
    let targetTiendaId: string | null = null;
    if (filtroSede) {
      const found = tiendasDb.find(
        (t) =>
          t.nombre.toLowerCase() === filtroSede.toLowerCase() ||
          t.slug.toLowerCase() === filtroSede.toLowerCase() ||
          t.id === filtroSede
      );
      if (found) targetTiendaId = found.id;
    }

    // 3. Obtener registros de propinas con detalles (solo de tiendas operativas)
    const registrosDb = await prisma.registroPropina.findMany({
      where: {
        estado: { notIn: ['Anulado', 'Eliminado'] },
        tiendaId: targetTiendaId ? targetTiendaId : { in: activeTiendaIds },
        ...(fInicio || fFin
          ? {
              fecha: {
                ...(fInicio ? { gte: fInicio } : {}),
                ...(fFin ? { lte: fFin } : {}),
              },
            }
          : {}),
      },
      include: {
        detalles: true,
        tienda: true,
      },
      orderBy: { fecha: 'desc' },
    });

    // 4. Obtener sanciones aprobadas (solo de tiendas operativas)
    const sancionesDb = await prisma.sancionAdelanto.findMany({
      where: {
        estado: 'Aprobado',
        concepto: { contains: 'Sanción', mode: 'insensitive' },
        tiendaId: targetTiendaId ? targetTiendaId : { in: activeTiendaIds },
        ...(fInicio || fFin
          ? {
              fecha: {
                ...(fInicio ? { gte: fInicio } : {}),
                ...(fFin ? { lte: fFin } : {}),
              },
            }
          : {}),
      },
      include: {
        tienda: true,
      },
      orderBy: { fecha: 'desc' },
    });

    // 5. Obtener reglas de sanciones para evaluar pérdida del 100%
    const reglasDb = await prisma.reglaSancion.findMany({
      where: {
        estado: 'Activo',
      },
    });
    const reglasPorTienda: Record<string, Record<string, any>> = {};
    reglasDb.forEach((r) => {
      const tId = r.tiendaId || 'GLOBAL';
      if (!reglasPorTienda[tId]) reglasPorTienda[tId] = {};
      reglasPorTienda[tId][r.infraccion] = r;
    });

    // 6. Obtener padrón de personal para áreas
    const personalDb = await prisma.colaborador.findMany();
    const areasMap: Record<string, string> = {};
    personalDb.forEach((p) => {
      const key = `${p.tiendaId || ''}_${p.nombre.trim()}`.toLowerCase();
      areasMap[key] = p.area || 'Salón';
    });

    // 7. Procesar Registros Consolidados y Rankings
    let totalRed = 0;
    let totalSalon = 0;
    let horasSalon = 0;
    let totalCocina = 0;
    let horasCocina = 0;
    let totalHoras = 0;
    let totalColabs = 0;

    const rankingSedesMap: Record<
      string,
      {
        nombre: string;
        total: number;
        horas: number;
        salon: number;
        hSalon: number;
        cocina: number;
        hCocina: number;
        registros: number;
        ultimaFecha: string;
      }
    > = {};

    sedesList.forEach((nom) => {
      rankingSedesMap[nom] = {
        nombre: nom,
        total: 0,
        horas: 0,
        salon: 0,
        hSalon: 0,
        cocina: 0,
        hCocina: 0,
        registros: 0,
        ultimaFecha: '',
      };
    });

    const propinaBrutaMap: Record<string, number> = {};
    const registrosConsolidados: any[] = [];
    const hoyIso = new Date().toISOString().split('T')[0];

    // Matrices temporales para BI
    const mapaFechas: Record<string, { totalRed: number; sedes: Record<string, number> }> = {};
    const porDia: Record<
      string,
      {
        dia: string;
        monto: number;
        salon: number;
        hSalon: number;
        cocina: number;
        hCocina: number;
        horas: number;
        registros: number;
        ratioSalon: string;
        ratioCocina: string;
        ratioHora: string;
      }
    > = {};

    DIAS_ORDEN.forEach((d) => {
      porDia[d] = {
        dia: d,
        monto: 0,
        salon: 0,
        hSalon: 0,
        cocina: 0,
        hCocina: 0,
        horas: 0,
        registros: 0,
        ratioSalon: '0.00',
        ratioCocina: '0.00',
        ratioHora: '0.00',
      };
    });

    const matrizSedeDia: Record<
      string,
      Record<
        string,
        {
          monto: number;
          salon: number;
          hSal: number;
          cocina: number;
          hCoc: number;
          horas: number;
          ratio: string;
          ratioSalon: string;
          ratioCocina: string;
        }
      >
    > = {};

    sedesList.forEach((s) => {
      matrizSedeDia[s] = {};
      DIAS_ORDEN.forEach((d) => {
        matrizSedeDia[s][d] = {
          monto: 0,
          salon: 0,
          hSal: 0,
          cocina: 0,
          hCoc: 0,
          horas: 0,
          ratio: '0.00',
          ratioSalon: '0.00',
          ratioCocina: '0.00',
        };
      });
    });

    let totalFDS = 0;
    let horasFDS = 0;
    let totalSemana = 0;
    let horasSemana = 0;

    for (const r of registrosDb) {
      const fecha = formatearFechaIso(r.fecha);
      const parts = fecha.split('-');
      const fDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const diaSemana = isNaN(fDate.getTime()) ? '--' : DIAS_SEMANA_ES[fDate.getDay()];
      const mes = fecha.substring(0, 7);
      const sedeNombre = r.tienda?.nombre || 'Sede Principal';

      let hSal = 0;
      let hCoc = 0;
      let colabsCount = 0;

      r.detalles.forEach((det) => {
        colabsCount++;
        const h = det.horas || 0;
        const areaLower = (det.area || '').toLowerCase();
        if (areaLower.includes('cocina')) {
          hCoc += h;
        } else {
          hSal += h;
        }

        // Acumular propina bruta por colaborador para pérdida del 100%
        const colabKey = `${r.tiendaId || ''}_${det.colaborador.trim()}`.toLowerCase();
        propinaBrutaMap[colabKey] = (propinaBrutaMap[colabKey] || 0) + (det.propina || 0);
      });

      const monto = r.montoTotal || 0;
      const salon = r.fondoSalon || monto * 0.6;
      const cocina = r.fondoCocina || monto * 0.4;
      const hTotal = hSal + hCoc;
      const ratioGen = hTotal > 0 ? monto / hTotal : 0;
      const ratioSal = hSal > 0 ? salon / hSal : 0;
      const ratioCoc = hCoc > 0 ? cocina / hCoc : 0;

      totalRed += monto;
      totalSalon += salon;
      horasSalon += hSal;
      totalCocina += cocina;
      horasCocina += hCoc;
      totalHoras += hTotal;
      totalColabs += colabsCount;

      if (!rankingSedesMap[sedeNombre]) {
        rankingSedesMap[sedeNombre] = {
          nombre: sedeNombre,
          total: 0,
          horas: 0,
          salon: 0,
          hSalon: 0,
          cocina: 0,
          hCocina: 0,
          registros: 0,
          ultimaFecha: '',
        };
      }
      rankingSedesMap[sedeNombre].total += monto;
      rankingSedesMap[sedeNombre].horas += hTotal;
      rankingSedesMap[sedeNombre].salon += salon;
      rankingSedesMap[sedeNombre].hSalon += hSal;
      rankingSedesMap[sedeNombre].cocina += cocina;
      rankingSedesMap[sedeNombre].hCocina += hCoc;
      rankingSedesMap[sedeNombre].registros++;
      if (!rankingSedesMap[sedeNombre].ultimaFecha || fecha > rankingSedesMap[sedeNombre].ultimaFecha) {
        rankingSedesMap[sedeNombre].ultimaFecha = fecha;
      }

      // Consolidado
      registrosConsolidados.push({
        id: r.id,
        fecha,
        diaSemana,
        mes,
        sede: sedeNombre,
        idLocal: r.id,
        monto,
        salon,
        horasSalon: hSal,
        ratioSalon: ratioSal,
        cocina,
        horasCocina: hCoc,
        ratioCocina: ratioCoc,
        colaboradores: colabsCount,
        horas: hTotal,
        ratioHora: ratioGen,
      });

      // Acumuladores BI
      if (porDia[diaSemana]) {
        porDia[diaSemana].monto += monto;
        porDia[diaSemana].salon += salon;
        porDia[diaSemana].hSalon += hSal;
        porDia[diaSemana].cocina += cocina;
        porDia[diaSemana].hCocina += hCoc;
        porDia[diaSemana].horas += hTotal;
        porDia[diaSemana].registros++;
      }

      if (diaSemana === 'Viernes' || diaSemana === 'Sábado' || diaSemana === 'Domingo') {
        totalFDS += monto;
        horasFDS += hTotal;
      } else {
        totalSemana += monto;
        horasSemana += hTotal;
      }

      if (matrizSedeDia[sedeNombre] && matrizSedeDia[sedeNombre][diaSemana]) {
        matrizSedeDia[sedeNombre][diaSemana].monto += monto;
        matrizSedeDia[sedeNombre][diaSemana].salon += salon;
        matrizSedeDia[sedeNombre][diaSemana].hSal += hSal;
        matrizSedeDia[sedeNombre][diaSemana].cocina += cocina;
        matrizSedeDia[sedeNombre][diaSemana].hCoc += hCoc;
        matrizSedeDia[sedeNombre][diaSemana].horas += hTotal;
      }

      if (fecha) {
        if (!mapaFechas[fecha]) {
          mapaFechas[fecha] = { totalRed: 0, sedes: {} };
          sedesList.forEach((s) => {
            mapaFechas[fecha].sedes[s] = 0;
          });
        }
        mapaFechas[fecha].totalRed += monto;
        mapaFechas[fecha].sedes[sedeNombre] =
          (mapaFechas[fecha].sedes[sedeNombre] || 0) + monto;
      }
    }

    // 8. Rankings de Sedes
    const rankingArray = Object.keys(rankingSedesMap)
      .map((k) => {
        const s = rankingSedesMap[k];
        const pct = totalRed > 0 ? ((s.total / totalRed) * 100).toFixed(1) : '0.0';
        const ratioGen = s.horas > 0 ? (s.total / s.horas).toFixed(2) : '0.00';
        const ratioSal = s.hSalon > 0 ? (s.salon / s.hSalon).toFixed(2) : '0.00';
        const ratioCoc = s.hCocina > 0 ? (s.cocina / s.hCocina).toFixed(2) : '0.00';

        let alertaInactiva = false;
        if (s.ultimaFecha) {
          const diffMs = new Date(hoyIso).getTime() - new Date(s.ultimaFecha).getTime();
          const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDias >= 2) alertaInactiva = true;
        } else {
          alertaInactiva = true;
        }

        return {
          nombre: s.nombre,
          total: s.total,
          horas: s.horas,
          horasSalon: s.hSalon,
          horasCocina: s.hCocina,
          porcentaje: pct,
          ratioHora: ratioGen,
          ratioSalon: ratioSal,
          ratioCocina: ratioCoc,
          registros: s.registros,
          ultimaFecha: s.ultimaFecha || 'Sin registros',
          alertaInactiva,
        };
      })
      .sort((a, b) => b.total - a.total);

    const sedesOrdenadasRatio = [...rankingArray].sort(
      (a, b) => parseFloat(b.ratioHora) - parseFloat(a.ratioHora)
    );
    const sedeMasEficiente =
      sedesOrdenadasRatio.length > 0 && parseFloat(sedesOrdenadasRatio[0].ratioHora) > 0
        ? `${sedesOrdenadasRatio[0].nombre} (S/ ${sedesOrdenadasRatio[0].ratioHora}/hr)`
        : '--';

    // 9. Rankings y Auditoría de Sanciones
    const sancionesPorSede: Record<
      string,
      {
        sede: string;
        cantidad: number;
        montoTotal: number;
        colaboradoresSet: Record<string, boolean>;
        listaSanciones: any[];
      }
    > = {};

    sedesList.forEach((nom) => {
      sancionesPorSede[nom] = {
        sede: nom,
        cantidad: 0,
        montoTotal: 0,
        colaboradoresSet: {},
        listaSanciones: [],
      };
    });

    const tardanzasPorColab: Record<
      string,
      Array<{ fecha: string; minutos: number; nombre: string; tiendaId: string }>
    > = {};
    const totalSancionesPorColab: Record<string, number> = {};
    const minutosTardanzaPorColab: Record<string, number> = {};
    const detalleSancionesPorColab: Record<string, string[]> = {};
    const usrSancPorColab: Record<string, string> = {};
    const conteoFaltasComputables: Record<string, Record<string, number>> = {};

    sancionesDb.forEach((sanc) => {
      const fSanc = formatearFechaIso(sanc.fecha);
      const sedeNombre = sanc.tienda?.nombre || 'Sede Principal';
      const colab = sanc.colaborador.trim();
      const colabKey = `${sanc.tiendaId || ''}_${colab}`.toLowerCase();
      const conc = sanc.concepto.trim();
      const montoSanc = sanc.monto || 0;
      const detalle = sanc.detalle || '--';
      const estado = sanc.estado || 'Aprobado';
      const usuario = sanc.usuario || 'Admin';

      if (!sancionesPorSede[sedeNombre]) {
        sancionesPorSede[sedeNombre] = {
          sede: sedeNombre,
          cantidad: 0,
          montoTotal: 0,
          colaboradoresSet: {},
          listaSanciones: [],
        };
      }
      sancionesPorSede[sedeNombre].cantidad++;
      sancionesPorSede[sedeNombre].montoTotal += montoSanc;
      sancionesPorSede[sedeNombre].colaboradoresSet[colab] = true;
      sancionesPorSede[sedeNombre].listaSanciones.push({
        fecha: fSanc,
        colaborador: colab,
        concepto: conc,
        monto: montoSanc,
        detalle,
        estado,
        usuario,
      });

      // Evaluación de faltas para pérdida del 100%
      if (!totalSancionesPorColab[colabKey]) totalSancionesPorColab[colabKey] = 0;
      if (!minutosTardanzaPorColab[colabKey]) minutosTardanzaPorColab[colabKey] = 0;
      if (!detalleSancionesPorColab[colabKey]) detalleSancionesPorColab[colabKey] = [];
      if (!usrSancPorColab[colabKey]) usrSancPorColab[colabKey] = usuario;
      if (!conteoFaltasComputables[colabKey]) conteoFaltasComputables[colabKey] = {};

      totalSancionesPorColab[colabKey]++;
      const infNombre = conc.replace(/^Sanción:\s*/i, '').replace(/^Sanción Fondo:\s*/i, '').trim();
      detalleSancionesPorColab[colabKey].push(`${fSanc} (${infNombre}: ${detalle})`);

      if (infNombre.toLowerCase().includes('tardanza')) {
        if (!tardanzasPorColab[colabKey]) tardanzasPorColab[colabKey] = [];
        const mMin = String(detalle).match(/(\d+)\s*min/i);
        const min = mMin ? parseFloat(mMin[1]) : 0;
        minutosTardanzaPorColab[colabKey] += min;
        tardanzasPorColab[colabKey].push({
          fecha: fSanc,
          minutos: min,
          nombre: infNombre,
          tiendaId: sanc.tiendaId || '',
        });
      } else {
        conteoFaltasComputables[colabKey][infNombre] =
          (conteoFaltasComputables[colabKey][infNombre] || 0) + 1;
      }
    });

    const rankingSancionesArray = Object.keys(sancionesPorSede)
      .map((k) => {
        const sp = sancionesPorSede[k];
        return {
          sede: sp.sede,
          cantidad: sp.cantidad,
          montoTotal: sp.montoTotal,
          totalColaboradores: Object.keys(sp.colaboradoresSet).length,
          sanciones: sp.listaSanciones.sort((a, b) => b.fecha.localeCompare(a.fecha)),
        };
      })
      .sort((a, b) => b.cantidad - a.cantidad || b.montoTotal - a.montoTotal);

    // 10. Algoritmo de Bolsa Acumulativa para Tardanzas y Detección de Pérdida del 100%
    Object.keys(tardanzasPorColab).forEach((colabKey) => {
      const tards = tardanzasPorColab[colabKey].sort((a, b) => a.fecha.localeCompare(b.fecha));
      let bolsaAcumulada = 0;
      tards.forEach((t) => {
        const tiendaReglas = reglasPorTienda[t.tiendaId] || reglasPorTienda['GLOBAL'] || {};
        const regla = tiendaReglas[t.nombre] || tiendaReglas['Tardanza'] || null;
        let cuentaComoFalta = true;
        if (regla && regla.toleranciaActiva) {
          bolsaAcumulada += t.minutos;
          if (bolsaAcumulada <= (regla.toleranciaMin || 0)) cuentaComoFalta = false;
        }
        if (cuentaComoFalta) {
          conteoFaltasComputables[colabKey][t.nombre] =
            (conteoFaltasComputables[colabKey][t.nombre] || 0) + 1;
        }
      });
    });

    const trabajadoresPerdida100: any[] = [];
    let montoTotalPerdidoRed = 0;

    Object.keys(conteoFaltasComputables).forEach((colabKey) => {
      let perdida100 = false;
      let motivo = '';
      const [tId, ...restColab] = colabKey.split('_');
      const colabNombre = restColab.join('_');
      const sedeNombre = tiendasMap.get(tId) || 'Sede Principal';
      const tiendaReglas = reglasPorTienda[tId] || reglasPorTienda['GLOBAL'] || {};

      Object.keys(conteoFaltasComputables[colabKey]).forEach((inf) => {
        const cnt = conteoFaltasComputables[colabKey][inf];
        const regla = tiendaReglas[inf];
        const maxPermitido = regla ? regla.frecuenciaMax : 1;
        const cons = regla ? regla.consecuencia : 'Pérdida del 100% de propinas acumuladas';
        if (cons.includes('100%') && cnt > maxPermitido) {
          perdida100 = true;
          motivo = `Superó frecuencia máxima de ${maxPermitido} faltas fuera de bolsa/tolerancia en ${sedeNombre} para '${inf}' (${cnt} faltas computables acumuladas)`;
        }
      });

      if (perdida100) {
        const areaColab = areasMap[colabKey] || 'Salón';
        const propinaPerdida = propinaBrutaMap[colabKey] || 0;
        montoTotalPerdidoRed += propinaPerdida;
        trabajadoresPerdida100.push({
          fecha: hoyIso,
          sede: sedeNombre,
          colaborador: colabNombre.toUpperCase(),
          area: areaColab,
          montoPropinaPerdida: parseFloat(propinaPerdida.toFixed(2)),
          cantidadSanciones: totalSancionesPorColab[colabKey] || 0,
          minutosTardanza: minutosTardanzaPorColab[colabKey] || 0,
          motivo,
          detalle: (detalleSancionesPorColab[colabKey] || []).join(' | '),
          generadoPor: usrSancPorColab[colabKey] || 'Admin Local',
          estado: 'Confiscado 100% / Para Redistribución',
        });
      }
    });

    // 11. Finalizar Cálculos BI
    DIAS_ORDEN.forEach((d) => {
      const pd = porDia[d];
      pd.ratioHora = pd.horas > 0 ? (pd.monto / pd.horas).toFixed(2) : '0.00';
      pd.ratioSalon = pd.hSalon > 0 ? (pd.salon / pd.hSalon).toFixed(2) : '0.00';
      pd.ratioCocina = pd.hCocina > 0 ? (pd.cocina / pd.hCocina).toFixed(2) : '0.00';
    });

    sedesList.forEach((s) => {
      DIAS_ORDEN.forEach((d) => {
        const cel = matrizSedeDia[s][d];
        cel.ratio = cel.horas > 0 ? (cel.monto / cel.horas).toFixed(2) : '0.00';
        cel.ratioSalon = cel.hSal > 0 ? (cel.salon / cel.hSal).toFixed(2) : '0.00';
        cel.ratioCocina = cel.hCoc > 0 ? (cel.cocina / cel.hCoc).toFixed(2) : '0.00';
      });
    });

    const fechasOrdenadas = Object.keys(mapaFechas).sort();
    const seriesTotalRed = fechasOrdenadas.map((f) =>
      parseFloat(mapaFechas[f].totalRed.toFixed(2))
    );
    const seriesPorSede: Record<string, number[]> = {};
    sedesList.forEach((s) => {
      seriesPorSede[s] = fechasOrdenadas.map((f) =>
        parseFloat((mapaFechas[f].sedes[s] || 0).toFixed(2))
      );
    });

    const seriesTemporales = {
      labels: fechasOrdenadas,
      totalRed: seriesTotalRed,
      sedes: seriesPorSede,
    };

    const finalRegistros = limite > 0 ? registrosConsolidados.slice(0, limite) : registrosConsolidados;

    return NextResponse.json({
      success: true,
      kpis: {
        totalRed,
        totalSalon,
        totalCocina,
        totalHoras,
        totalColabs,
        ratioPromedioHoraRed: totalHoras > 0 ? (totalRed / totalHoras).toFixed(2) : '0.00',
        ratioPromedioSalon: horasSalon > 0 ? (totalSalon / horasSalon).toFixed(2) : '0.00',
        ratioPromedioCocina: horasCocina > 0 ? (totalCocina / horasCocina).toFixed(2) : '0.00',
        sedeLider:
          rankingArray.length > 0 && rankingArray[0].total > 0 ? rankingArray[0].nombre : '--',
        sedeMasEficiente,
        totalSedes: sedesList.length,
      },
      ranking: rankingArray,
      rankingSanciones: rankingSancionesArray,
      registros: finalRegistros,
      sedesDisponibles: sedesList,
      trabajadoresPerdida100,
      totalPerdida100Count: trabajadoresPerdida100.length,
      montoTotalPerdidoRed,
      analiticaBI: {
        diasSemana: DIAS_ORDEN.map((d) => porDia[d]),
        matrizCalor: matrizSedeDia,
        sedes: filtroSede ? [filtroSede] : sedesList,
        seriesTemporales,
        resumenSemanaVsFds: {
          totalFDS,
          pctFDS: totalRed > 0 ? ((totalFDS / totalRed) * 100).toFixed(1) : '0.0',
          ratioFDS: horasFDS > 0 ? (totalFDS / horasFDS).toFixed(2) : '0.00',
          totalSemana,
          pctSemana: totalRed > 0 ? ((totalSemana / totalRed) * 100).toFixed(1) : '0.0',
          ratioSemana: horasSemana > 0 ? (totalSemana / horasSemana).toFixed(2) : '0.00',
        },
      },
    });
  } catch (err: any) {
    console.error('Error en /api/central-dashboard:', err);
    return NextResponse.json(
      { success: false, message: 'Error al generar analítica central: ' + err.message },
      { status: 500 }
    );
  }
}
