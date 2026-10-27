import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/solicitudes
 * Retorna todas las operaciones pendientes de aprobación por el Administrador o Supervisor:
 * - Sanciones disciplinarias registradas por Moderador
 * - Adelantos de propinas registrados por Moderador
 * - Solicitudes de anulación de registros de propinas por Moderador
 * - Solicitudes de retiro de fondo mancomunado por Moderador
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const rol = user?.rol || '';

    if (rol !== 'Administrador' && rol !== 'Supervisor' && !user?.esMaestro) {
      return NextResponse.json(
        { success: false, message: 'Permisos insuficientes: Se requiere rol Administrador o Supervisor.' },
        { status: 403 }
      );
    }

    const { tiendaId } = await resolveTiendaId(request);

    // 1. Sanciones y Adelantos pendientes
    const pendientesSancAdel = await prisma.sancionAdelanto.findMany({
      where: {
        estado: 'Pendiente',
        ...(tiendaId ? { tiendaId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const itemsSancAdel = pendientesSancAdel.map((s) => {
      const esAdelanto = (s.concepto || '').toLowerCase().includes('adelanto');
      return {
        id: s.id,
        tipo: esAdelanto ? 'ADELANTO' : 'SANCION',
        tipoEtiqueta: esAdelanto ? 'Adelanto de Propinas' : 'Sanción Disciplinaria',
        jpEtiqueta: esAdelanto ? '前払い' : '規律・減点',
        moduloDestino: esAdelanto ? 'Adelantos' : 'Sanciones',
        fecha: s.fecha,
        colaborador: s.colaborador,
        concepto: s.concepto,
        monto: s.monto,
        detalle: s.detalle || '',
        usuario: s.usuario,
        createdAt: s.createdAt,
      };
    });

    // 2. Turnos de Propina con solicitud de anulación pendiente
    const pendientesAnulaciones = await prisma.registroPropina.findMany({
      where: {
        estado: 'Pendiente de Anulación',
        ...(tiendaId ? { tiendaId } : {}),
      },
      include: {
        _count: {
          select: { detalles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const itemsAnulaciones = pendientesAnulaciones.map((r) => {
      const solicitante = (r.validador || '')
        .replace(/^Solicitado por\s*/i, '')
        .trim() || 'Moderador';

      return {
        id: r.id,
        tipo: 'ANULACION_PROPINA',
        tipoEtiqueta: 'Anulación de Turno',
        jpEtiqueta: 'チップ取消',
        moduloDestino: 'RegistroPropinas',
        fecha: r.fecha,
        colaborador: `Registro #${r.id} (${r._count.detalles} participantes)`,
        concepto: `Solicitud de Anulación de Registro de Propina #${r.id}`,
        monto: r.montoTotal,
        detalle: r.justificacion || 'Sin justificación ingresada',
        usuario: solicitante,
        createdAt: r.createdAt,
      };
    });

    // 3. Retiros de Fondo Mancomunado pendientes
    const pendientesRetiros = await prisma.retiroFondo.findMany({
      where: {
        estado: 'Pendiente',
        ...(tiendaId ? { tiendaId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const itemsRetiros = pendientesRetiros.map((ret) => ({
      id: ret.id,
      tipo: 'RETIRO_FONDO',
      tipoEtiqueta: 'Retiro de Fondo Mancomunado',
      jpEtiqueta: '出金申請',
      moduloDestino: 'Sanciones',
      fecha: ret.fecha,
      colaborador: `Fondo Mancomunado (${ret.concepto})`,
      concepto: `Retiro: ${ret.concepto}`,
      monto: ret.monto,
      detalle: ret.justificacion || '',
      usuario: ret.solicitadoPor,
      createdAt: ret.createdAt,
    }));

    // Consolidar y ordenar cronológicamente de forma descendente
    const lista = [...itemsSancAdel, ...itemsAnulaciones, ...itemsRetiros].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const conteoPorTipo = {
      todos: lista.length,
      adelantos: lista.filter((x) => x.tipo === 'ADELANTO').length,
      sanciones: lista.filter((x) => x.tipo === 'SANCION').length,
      anulaciones: lista.filter((x) => x.tipo === 'ANULACION_PROPINA').length,
      retiros: lista.filter((x) => x.tipo === 'RETIRO_FONDO').length,
    };

    const conteoPorModulo = {
      RegistroPropinas: conteoPorTipo.anulaciones,
      Sanciones: conteoPorTipo.sanciones + conteoPorTipo.retiros,
      Adelantos: conteoPorTipo.adelantos,
    };

    return NextResponse.json({
      success: true,
      total: lista.length,
      conteoPorTipo,
      conteoPorModulo,
      lista,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
