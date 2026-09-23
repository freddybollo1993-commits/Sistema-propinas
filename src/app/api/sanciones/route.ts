import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';
import {
  getCicloActivo,
  getModoSanciones,
  getPromediosColaboradores,
} from '@/lib/formulas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sanciones = await prisma.sancionAdelanto.findMany({
      orderBy: { id: 'desc' },
    });

    const lista = sanciones.map((s) => ({
      id: s.id,
      fila: s.id,
      fecha: s.fecha,
      colaborador: s.colaborador,
      concepto: s.concepto,
      monto: s.monto,
      detalle: s.detalle || '',
      estado: s.estado,
      usuario: s.usuario,
    }));

    return NextResponse.json(lista);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';
    const rol = user?.rol || 'Moderador';

    const payload = await request.json();
    const modoConfig = await getModoSanciones();
    const esModoFondo =
      payload.esModoFondo === true ||
      payload.esModoFondo === 'true' ||
      modoConfig === 'FONDO_MANCOMUNADO';

    const fecha = payload.fecha || new Date().toISOString().split('T')[0];
    const estado = rol === 'Moderador' ? 'Pendiente' : 'Aprobado';

    // 1. CASO: MODO FONDO MANCOMUNADO
    if (esModoFondo) {
      const colab = String(payload.colaborador || '').trim();
      if (!colab) {
        return NextResponse.json({ success: false, message: 'Debe seleccionar al trabajador a sancionar.' }, { status: 400 });
      }

      const tipoSancion = String(payload.tipoSancion || payload.infraccion || '').trim();
      if (!tipoSancion) {
        return NextResponse.json({ success: false, message: 'Debe describir el tipo de sanción.' }, { status: 400 });
      }

      const montoSanc = parseFloat(payload.monto);
      if (isNaN(montoSanc) || montoSanc <= 0) {
        return NextResponse.json({ success: false, message: 'Debe definir un monto numérico válido mayor a 0.' }, { status: 400 });
      }

      const detalleSanc = String(payload.detalle || '').trim();
      if (!detalleSanc) {
        return NextResponse.json({ success: false, message: 'Debe ingresar un detalle o comentario explicativo.' }, { status: 400 });
      }

      const nuevaSancion = await prisma.sancionAdelanto.create({
        data: {
          fecha,
          colaborador: colab,
          concepto: `Sanción Fondo: ${tipoSancion}`,
          monto: montoSanc,
          detalle: detalleSanc,
          estado,
          usuario: usuarioActual,
        },
      });

      await logAuditoria(
        'Sanción Fondo Mancomunado',
        `Sanción a ${colab} (${tipoSancion} - S/ ${montoSanc.toFixed(2)}) [Destino: Fondo Mancomunado]. Detalle: ${detalleSanc} por ${usuarioActual} [${rol}]`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `Sanción de S/ ${montoSanc.toFixed(2)} aplicada a ${colab} y depositada en el Fondo Mancomunado.`,
        id: nuevaSancion.id,
      });
    }

    // 2. CASO: MODO CLÁSICO
    let monto = parseFloat(payload.monto) || 0;
    let detalleCompleto = payload.detalle || 'Falta disciplinaria';

    if (payload.infraccion === 'Tardanza' && payload.tiempoTardanza) {
      detalleCompleto += ` | Tardanza: ${payload.tiempoTardanza} min`;
    }

    const catalogo = await prisma.reglaSancion.findMany();
    const reglaTardanza = catalogo.find((c) => c.infraccion === 'Tardanza');

    // Validación bolsa de tolerancia para Tardanza
    if (payload.infraccion === 'Tardanza' && reglaTardanza && reglaTardanza.toleranciaActiva) {
      const tiempoIng = parseFloat(payload.tiempoTardanza) || 0;
      const tolMin = reglaTardanza.toleranciaMin || 0;
      if (tiempoIng <= tolMin) {
        monto = 0;
      }
    }

    // Lógica y tope para Break
    if (payload.infraccion === 'Break') {
      const reglaBreak = catalogo.find((c) => c.infraccion === 'Break');
      if (reglaBreak && reglaBreak.multiplicadorActivo) {
        const mult =
          payload.multiplicadorBreak !== undefined &&
          payload.multiplicadorBreak !== null &&
          !isNaN(parseFloat(payload.multiplicadorBreak))
            ? parseFloat(payload.multiplicadorBreak)
            : reglaBreak.multiplicador || 2;

        const tiempoDemora = parseFloat(payload.tiempoBreak) || 0;
        const nominal = tiempoDemora * mult;
        const promedios = await getPromediosColaboradores();
        const promDiario = promedios[payload.colaborador] || 0;

        if (promDiario > 0 && nominal > promDiario) {
          monto = promDiario;
          detalleCompleto += ` | Demora Break: ${tiempoDemora} min (x${mult} = S/ ${nominal.toFixed(2)} - Tope promedio diario aplicado: S/ ${promDiario.toFixed(2)})`;
        } else {
          monto = nominal;
          detalleCompleto += ` | Demora Break: ${tiempoDemora} min (x${mult})`;
        }
      }
    }

    const sancionCreada = await prisma.sancionAdelanto.create({
      data: {
        fecha,
        colaborador: payload.colaborador,
        concepto: `Sanción: ${payload.infraccion}`,
        monto,
        detalle: detalleCompleto,
        estado,
        usuario: usuarioActual,
      },
    });

    await logAuditoria(
      'Registro de Sanción',
      `Sanción a ${payload.colaborador} (${payload.infraccion} - S/ ${monto.toFixed(2)}) [${estado}]`,
      usuarioActual
    );

    // Validación de reincidencia en el ciclo activo
    const ciclo = await getCicloActivo();
    const historial = await prisma.sancionAdelanto.findMany({
      where: {
        colaborador: payload.colaborador,
        estado: 'Aprobado',
        fecha: {
          gte: ciclo.fechaInicio,
          lte: ciclo.fechaFin,
        },
      },
    });

    if (payload.infraccion.includes('Inasistencia injustificada')) {
      const reglaInasistencia = catalogo.find((c) =>
        c.infraccion.includes('Inasistencia injustificada')
      );
      if (reglaInasistencia && reglaInasistencia.estado === 'Activo') {
        const maxPermitido = reglaInasistencia.frecuenciaMax || 1;
        const faltas = historial.filter((h) =>
          h.concepto.includes('Inasistencia injustificada')
        ).length;

        if (faltas > maxPermitido) {
          await logAuditoria(
            'Alerta Crítica: Reincidencia Sanción',
            `${payload.colaborador} superó la frecuencia permitida de ${maxPermitido} faltas en Inasistencia. Total acumuladas: ${faltas}. Aplica pérdida del 100% de propinas.`,
            'Sistema'
          );
        }
      }
    } else if (payload.infraccion === 'Tardanza') {
      if (reglaTardanza) {
        const maxPermitido = reglaTardanza.frecuenciaMax || 1;
        const tolActiva = reglaTardanza.toleranciaActiva;
        const tolMin = reglaTardanza.toleranciaMin || 15;
        const tiempoIngresado = parseFloat(payload.tiempoTardanza) || 0;

        if (tolActiva) {
          let minutosAcumulados = 0;
          let tardanzasExcedidas = 0;

          historial
            .filter((h) => h.concepto.includes('Tardanza'))
            .forEach((h) => {
              const matchMin = (h.detalle || '').match(/Tardanza:\s*(\d+(\.\d+)?)\s*min/i);
              const minHist = matchMin ? parseFloat(matchMin[1]) : h.monto > 0 ? tolMin + 1 : 0;
              minutosAcumulados += minHist;
              if (minutosAcumulados > tolMin) tardanzasExcedidas++;
            });

          const totalAcumuladoConActual = minutosAcumulados + tiempoIngresado;
          if (totalAcumuladoConActual <= tolMin) {
            await logAuditoria(
              'Tardanza dentro de Tolerancia',
              `${payload.colaborador} registró tardanza de ${tiempoIngresado} min (Bolsa tolerancia: ${totalAcumuladoConActual}/${tolMin} min consumidos). No suma a la frecuencia de pérdida del 100%.`,
              'Sistema'
            );
          } else {
            if (tardanzasExcedidas >= maxPermitido) {
              await logAuditoria(
                'Alerta Crítica: Reincidencia Sanción',
                `${payload.colaborador} superó la frecuencia permitida de ${maxPermitido} tardanzas fuera de tolerancia (Bolsa rebasada: ${totalAcumuladoConActual}/${tolMin} min). Aplica pérdida del 100% de propinas.`,
                'Sistema'
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        estado === 'Pendiente'
          ? 'Sanción registrada como PENDIENTE de aprobación por Administración.'
          : 'Sanción registrada y aprobada exitosamente.',
      id: sancionCreada.id,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
