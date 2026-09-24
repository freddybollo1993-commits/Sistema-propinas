import prisma from './db';

/**
 * Registra un evento inmutable en la bitácora de Auditoría
 */
export async function logAuditoria(
  accion: string,
  detalle: string,
  usuario: string = 'Sistema',
  tiendaId?: string | null
): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: {
        usuario: usuario || 'Sistema',
        accion,
        detalle,
        tiendaId,
      },
    });
  } catch (err) {
    console.error('Error al registrar auditoría en base de datos:', err);
  }
}
