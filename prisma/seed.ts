import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando arquitectura Multi-Tienda en Supabase...');

  // 1. Crear Sede Principal por defecto si no existe
  const tiendaDefault = await prisma.tienda.upsert({
    where: { slug: 'sede-principal' },
    update: {},
    create: {
      id: 'tienda-principal',
      nombre: 'Sede Principal (Restaurante Central)',
      slug: 'sede-principal',
      direccion: 'Av. Principal 123',
      estado: 'Activo',
    },
  });

  console.log(`📍 Tienda base lista: ${tiendaDefault.nombre} (${tiendaDefault.id})`);

  // 2. Asignar todos los registros huérfanos preexistentes a la Sede Principal
  await prisma.colaborador.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.reglaSancion.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.sancionEspecial.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.registroPropina.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.sancionAdelanto.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.retiroFondo.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.cicloLiquidacion.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.configuracionSistema.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });
  await prisma.auditoria.updateMany({
    where: { tiendaId: null },
    data: { tiendaId: tiendaDefault.id },
  });

  // 3. Crear o actualizar Usuario Maestro Corporativo (USR-MASTER)
  // SuperAdmin sin restricción de tienda (tiendaId: null) para gestionar todas las tiendas
  const masterPasswordHash = await bcrypt.hash('1234', 10);
  await prisma.usuario.upsert({
    where: { email: 'master@empresa.com' },
    update: {
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: true,
      tiendaId: null,
    },
    create: {
      id: 'USR-MASTER',
      nombre: 'Usuario Maestro Corporativo',
      email: 'master@empresa.com',
      passwordHash: masterPasswordHash,
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: true,
      tiendaId: null,
    },
  });

  // 4. Crear Administrador asignado a la Sede Principal
  const adminPasswordHash = await bcrypt.hash('1234', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@empresa.com' },
    update: {
      tiendaId: tiendaDefault.id,
    },
    create: {
      id: 'USR-001',
      nombre: 'Administrador Sede Principal',
      email: 'admin@empresa.com',
      passwordHash: adminPasswordHash,
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: false,
      tiendaId: tiendaDefault.id,
    },
  });

  // 5. Garantizar configuración de modo en Sede Principal
  await prisma.configuracionSistema.upsert({
    where: {
      clave_tiendaId: {
        clave: 'MODO_SANCIONES',
        tiendaId: tiendaDefault.id,
      },
    },
    update: {},
    create: {
      clave: 'MODO_SANCIONES',
      valor: 'CLASICO',
      tiendaId: tiendaDefault.id,
      actualizadoPor: 'Sistema',
    },
  });

  // 6. Garantizar catálogo oficial para la Sede Principal
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
    {
      infraccion: 'Inasistencias a capacitación / reunión',
      estado: 'Activo',
      monto: 0,
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
          tiendaId: tiendaDefault.id,
        },
      },
      update: {},
      create: {
        ...r,
        tiendaId: tiendaDefault.id,
      },
    });
  }

  // 7. Sanciones Especiales para Sede Principal
  const sancionesEspecialesBase = [
    {
      nombre: 'Pérdida de propina del día',
      sancionPrincipal: 'Tardanza',
      estado: 'Activo',
      tipoEfecto: 'PERDIDA_DIA',
      criterioDisparador: 'TOLERANCIA',
      disparadorFrecuencia: 1,
      tiendaId: tiendaDefault.id,
    },
    {
      nombre: 'Pérdida de propina del día',
      sancionPrincipal: 'Uso de Celular',
      estado: 'Activo',
      tipoEfecto: 'PERDIDA_DIA',
      criterioDisparador: 'FRECUENCIA',
      disparadorFrecuencia: 1,
      tiendaId: tiendaDefault.id,
    },
  ];

  for (const se of sancionesEspecialesBase) {
    const existe = await prisma.sancionEspecial.findFirst({
      where: {
        nombre: se.nombre,
        sancionPrincipal: se.sancionPrincipal,
        tiendaId: tiendaDefault.id,
      },
    });
    if (!existe) {
      await prisma.sancionEspecial.create({
        data: se,
      });
    }
  }

  // 8. Ciclo activo para Sede Principal
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = hoy.getDate();
  const fIni = `${year}-${month}-${dia <= 15 ? '01' : '16'}`;
  const fFin = `${year}-${month}-${dia <= 15 ? '15' : '31'}`;

  const cicloExiste = await prisma.cicloLiquidacion.findFirst({
    where: { tiendaId: tiendaDefault.id },
  });
  if (!cicloExiste) {
    await prisma.cicloLiquidacion.create({
      data: {
        fechaInicio: fIni,
        fechaFin: fFin,
        estado: 'Abierto',
        tiendaId: tiendaDefault.id,
      },
    });
  }

  // 9. Personal de prueba inicial para Sede Principal
  const personalInicial = [
    { nombre: 'Carlos Mendoza', area: 'Salón', estado: 'Activo', tiendaId: tiendaDefault.id },
    { nombre: 'Andrea Rojas', area: 'Salón', estado: 'Activo', tiendaId: tiendaDefault.id },
    { nombre: 'Luis Huamán', area: 'Cocina', estado: 'Activo', tiendaId: tiendaDefault.id },
    { nombre: 'María Quispe', area: 'Cocina', estado: 'Activo', tiendaId: tiendaDefault.id },
    { nombre: 'Jorge Silva', area: 'Apoyo Salón', estado: 'Activo', tiendaId: tiendaDefault.id },
  ];

  for (const p of personalInicial) {
    await prisma.colaborador.upsert({
      where: {
        nombre_tiendaId: {
          nombre: p.nombre,
          tiendaId: tiendaDefault.id,
        },
      },
      update: {},
      create: p,
    });
  }

  console.log('✅ Arquitectura Multi-Tienda inicializada exitosamente en Supabase.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
