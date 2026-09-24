import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logAuditoria } from '@/lib/auditoria';
import { resolveTiendaId } from '@/lib/tiendas';

export async function POST(request: Request) {
  try {
    const { tiendaId, user } = await resolveTiendaId(request);
    const usuarioActual = user?.nombre || 'Usuario Maestro';
    const idUsuario = user?.id || 'USR-MASTER';
    const rolUsuario = user?.rol || 'Administrador';

    const esAutorizado =
      idUsuario === 'USR-MASTER' ||
      rolUsuario === 'Administrador' ||
      rolUsuario === 'Supervisor' ||
      user?.esMaestro ||
      usuarioActual.toLowerCase().includes('maestro') ||
      usuarioActual.toLowerCase().includes('admin') ||
      usuarioActual.toLowerCase().includes('super');

    if (!esAutorizado) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Acceso denegado: La eliminación de registros requiere permisos de Administrador, Supervisor o Usuario Maestro.',
        },
        { status: 403 }
      );
    }

    const { modulo, idOParam, justificacion } = await request.json();

    if (!justificacion || String(justificacion).trim() === '') {
      return NextResponse.json(
        {
          success: false,
          message: 'Debe ingresar una justificación obligatoria para la eliminación.',
        },
        { status: 400 }
      );
    }

    const justLimpia = String(justificacion).trim();

    if (modulo === 'Auditoria' || modulo === 'auditoria') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Violación de seguridad: El módulo de Auditoría es estrictamente inmutable y no permite eliminaciones.',
        },
        { status: 400 }
      );
    }

    // 1. REGISTRO PROPINAS
    if (modulo === 'RegistroPropinas' || modulo === 'propinas') {
      const idReg = parseInt(idOParam, 10);
      const reg = await prisma.registroPropina.findUnique({
        where: { id: idReg },
      });

      if (!reg) {
        return NextResponse.json({ success: false, message: 'Registro no encontrado.' }, { status: 404 });
      }

      await prisma.registroPropina.delete({
        where: { id: idReg },
      });

      await logAuditoria(
        'Eliminación Definitiva',
        `Registro de Propinas #${idReg} eliminado (Fecha: ${reg.fecha}, Monto: S/ ${reg.montoTotal}) por ${usuarioActual} [${rolUsuario}]. Motivo: ${justLimpia}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `Registro de Propinas #${idReg} y sus detalles asociados fueron eliminados definitivamente.`,
      });
    }

    // 2. RETIRO FONDO
    if (modulo === 'RetirosFondo' || modulo === 'retiros_fondo') {
      const idRet = parseInt(idOParam, 10);
      const ret = await prisma.retiroFondo.findUnique({
        where: { id: idRet },
      });

      if (!ret) {
        return NextResponse.json({ success: false, message: 'Registro de retiro no encontrado.' }, { status: 404 });
      }

      await prisma.retiroFondo.delete({
        where: { id: idRet },
      });

      await logAuditoria(
        'Eliminación Definitiva',
        `Registro de retiro del Fondo Mancomunado eliminado (Retiro: ${ret.concepto} - S/ ${ret.monto}) por ${usuarioActual} [${rolUsuario}]. Motivo: ${justLimpia}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'El registro de retiro fue eliminado y reintegrado al saldo del Fondo Mancomunado.',
      });
    }

    // 3. SANCIONES Y ADELANTOS
    if (
      modulo === 'AdelantosSanciones' ||
      modulo === 'Adelantos' ||
      modulo === 'Sanciones'
    ) {
      const idItem = parseInt(idOParam, 10);
      const item = await prisma.sancionAdelanto.findUnique({
        where: { id: idItem },
      });

      if (!item) {
        return NextResponse.json({ success: false, message: 'Registro de adelanto/sanción no encontrado.' }, { status: 404 });
      }

      await prisma.sancionAdelanto.delete({
        where: { id: idItem },
      });

      const detalleItem = `${item.concepto} (${item.colaborador}) - Monto: S/ ${item.monto}`;
      await logAuditoria(
        'Eliminación Definitiva',
        `Item de Adelantos/Sanciones eliminado (${detalleItem}) por ${usuarioActual} [${rolUsuario}]. Motivo: ${justLimpia}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `El registro (${detalleItem}) fue eliminado definitivamente.`,
      });
    }

    // 4. PERSONAL
    if (modulo === 'Personal' || modulo === 'personal') {
      const nombrePer = String(idOParam).trim();
      const per = await prisma.colaborador.findFirst({
        where: {
          tiendaId,
          OR: [
            { nombre: { equals: nombrePer, mode: 'insensitive' } },
            ...(!isNaN(parseInt(nombrePer, 10)) ? [{ id: parseInt(nombrePer, 10) }] : []),
          ],
        },
      });

      if (!per) {
        return NextResponse.json({ success: false, message: 'Colaborador no encontrado en la base de datos.' }, { status: 404 });
      }

      await prisma.colaborador.delete({
        where: { id: per.id },
      });

      await logAuditoria(
        'Eliminación Definitiva',
        `Colaborador eliminado del catálogo: ${per.nombre} (${per.area}) por ${usuarioActual} [${rolUsuario}]. Motivo: ${justLimpia}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `El colaborador ${per.nombre} fue eliminado definitivamente del catálogo.`,
      });
    }

    // 5. USUARIOS
    if (modulo === 'Usuarios' || modulo === 'usuarios') {
      if (rolUsuario !== 'Administrador' && idUsuario !== 'USR-MASTER' && !user?.esMaestro) {
        return NextResponse.json(
          {
            success: false,
            message: 'Acceso denegado: Solo el Administrador o Usuario Maestro pueden eliminar usuarios del sistema.',
          },
          { status: 403 }
        );
      }

      const idUsr = String(idOParam).trim();
      if (idUsr === 'USR-MASTER') {
        return NextResponse.json(
          {
            success: false,
            message: 'Violación de seguridad: El Usuario Maestro no puede ser eliminado.',
          },
          { status: 403 }
        );
      }

      const usr = await prisma.usuario.findFirst({
        where: {
          OR: [
            { id: idUsr },
            { email: { equals: idUsr, mode: 'insensitive' } },
          ],
        },
      });

      if (!usr) {
        return NextResponse.json({ success: false, message: 'Usuario no encontrado.' }, { status: 404 });
      }

      await prisma.usuario.delete({
        where: { id: usr.id },
      });

      await logAuditoria(
        'Eliminación Definitiva',
        `Usuario eliminado: ${usr.nombre} (${usr.id}) por ${usuarioActual} [${rolUsuario}]. Motivo: ${justLimpia}`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `El usuario ${usr.nombre} (${usr.id}) fue eliminado definitivamente.`,
      });
    }

    return NextResponse.json({ success: false, message: 'Módulo no reconocido para eliminación.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
