import prisma from './db';
import { logAuditoria } from './auditoria';
import { SessionUser, getCurrentUser } from './auth';

/**
 * Clona la estructura base oficial (catálogo de sanciones, sanciones especiales,
 * ciclo activo y modo de liquidación) para una nueva tienda/sucursal.
 */
export async function inicializarTiendaConPlantilla(tiendaId: string, creadoPor: string = 'Sistema') {
  // 1. Configuración de Modo Sanciones por defecto (Clásico)
  await prisma.configuracionSistema.upsert({
    where: {
      clave_tiendaId: {
        clave: 'MODO_SANCIONES',
        tiendaId,
      },
    },
    update: { valor: 'CLASICO' },
    create: {
      clave: 'MODO_SANCIONES',
      valor: 'CLASICO',
      tiendaId,
      actualizadoPor: creadoPor,
    },
  });

  // 2. Catálogo oficial de sanciones base
  const defaultRules = [
    {
      infraccion: 'Tardanza',
      estado: 'Activo',
      monto: 15,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 15,
      toleranciaActiva: true,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Break',
      estado: 'Activo',
      monto: 0,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 2,
      multiplicadorActivo: true,
    },
    {
      infraccion: 'Inasistencia injustificada día de semana',
      estado: 'Activo',
      monto: 50,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Inasistencia injustificada fin de semana',
      estado: 'Activo',
      monto: 80,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Uniforme incompleto',
      estado: 'Inactivo',
      monto: 0,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Abandono de trabajo',
      estado: 'Inactivo',
      monto: 0,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Roturas por negligencia',
      estado: 'Inactivo',
      monto: 0,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Incumplimiento de normas sanitarias',
      estado: 'Inactivo',
      monto: 0,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Conflicto interno/cliente',
      estado: 'Inactivo',
      monto: 0,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
    {
      infraccion: 'Uso de Celular',
      estado: 'Activo',
      monto: 30,
      frecuenciaMax: 1,
      consecuencia: 'Pérdida del 100% de propinas acumuladas',
      toleranciaMin: 0,
      toleranciaActiva: false,
      multiplicador: 0,
      multiplicadorActivo: false,
    },
  ];

  for (const r of defaultRules) {
    await prisma.reglaSancion.upsert({
      where: {
        infraccion_tiendaId: {
          infraccion: r.infraccion,
          tiendaId,
        },
      },
      update: {},
      create: {
        ...r,
        tiendaId,
      },
    });
  }

  // 3. Sanciones Especiales por defecto (Pérdida de día para Tardanza y Celular)
  const sancionesEspecialesBase = [
    {
      nombre: 'Pérdida de propina del día',
      sancionPrincipal: 'Tardanza',
      estado: 'Activo',
      tipoEfecto: 'PERDIDA_DIA',
      criterioDisparador: 'TOLERANCIA',
      disparadorFrecuencia: 1,
    },
    {
      nombre: 'Pérdida de propina del día',
      sancionPrincipal: 'Uso de Celular',
      estado: 'Activo',
      tipoEfecto: 'PERDIDA_DIA',
      criterioDisparador: 'FRECUENCIA',
      disparadorFrecuencia: 1,
    },
  ];

  for (const se of sancionesEspecialesBase) {
    const existe = await prisma.sancionEspecial.findFirst({
      where: {
        nombre: se.nombre,
        sancionPrincipal: se.sancionPrincipal,
        tiendaId,
      },
    });
    if (!existe) {
      await prisma.sancionEspecial.create({
        data: {
          ...se,
          tiendaId,
        },
      });
    }
  }

  // 4. Ciclo quincenal inicial
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = hoy.getDate();
  const fIni = `${year}-${month}-${dia <= 15 ? '01' : '16'}`;
  const fFin = `${year}-${month}-${dia <= 15 ? '15' : '31'}`;

  const cicloExiste = await prisma.cicloLiquidacion.findFirst({
    where: { tiendaId },
  });

  if (!cicloExiste) {
    await prisma.cicloLiquidacion.create({
      data: {
        fechaInicio: fIni,
        fechaFin: fFin,
        estado: 'Abierto',
        tiendaId,
      },
    });
  }

  await logAuditoria(
    'Inicialización de Tienda',
    `Estructura base clonada para la tienda ${tiendaId}`,
    creadoPor
  );
}

/**
 * Obtiene el ID de la tienda efectiva para una petición o usuario.
 * Si el usuario es de una tienda específica, siempre devuelve esa tienda (seguridad multi-tenant).
 * Si el usuario es SuperAdmin/Maestro, permite alternar tienda vía header 'x-tienda-id' o cookie 'active_tienda_id'.
 */
export async function getEffectiveTiendaId(
  user: SessionUser | null,
  headerTiendaId?: string | null,
  cookieTiendaId?: string | null
): Promise<string> {
  // 1. Si el usuario pertenece a una tienda específica (no es SuperAdmin), aislamiento estricto
  if (user && !user.esMaestro && user.tiendaId) {
    return user.tiendaId;
  }

  // 2. Si es SuperAdmin / Maestro, respeta la tienda seleccionada
  if (headerTiendaId) {
    const existe = await prisma.tienda.findUnique({ where: { id: headerTiendaId } });
    if (existe) return existe.id;
  }

  if (cookieTiendaId) {
    const existe = await prisma.tienda.findUnique({ where: { id: cookieTiendaId } });
    if (existe) return existe.id;
  }

  // 3. Fallback a la primera tienda activa registrada o a 'tienda-principal'
  const primera = await prisma.tienda.findFirst({
    where: { estado: 'Activo' },
    orderBy: { createdAt: 'asc' },
  });

  return primera?.id || 'tienda-principal';
}

/**
 * Resuelve la tienda efectiva y el usuario autenticado a partir de la petición HTTP.
 */
export async function resolveTiendaId(request?: Request): Promise<{ tiendaId: string; user: SessionUser | null }> {
  const user = await getCurrentUser();
  let headerTienda: string | null = null;
  let paramTienda: string | null = null;

  if (request) {
    headerTienda = request.headers.get('x-tienda-id');
    try {
      const url = new URL(request.url);
      paramTienda = url.searchParams.get('tiendaId');
    } catch {}
  }

  let cookieTienda: string | null = null;
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    cookieTienda = cookieStore.get('active_tienda_id')?.value || null;
  } catch {}

  const tiendaId = await getEffectiveTiendaId(user, headerTienda || paramTienda, cookieTienda);
  return { tiendaId, user };
}
