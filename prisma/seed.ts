import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando datos base en Supabase...');

  // 1. Configuración de Modo Sanciones por defecto
  await prisma.configuracionSistema.upsert({
    where: { clave: 'MODO_SANCIONES' },
    update: {},
    create: {
      clave: 'MODO_SANCIONES',
      valor: 'CLASICO',
      actualizadoPor: 'Sistema',
    },
  });

  // 2. Crear o actualizar Usuario Maestro (USR-MASTER)
  const masterPasswordHash = await bcrypt.hash('1234', 10);
  await prisma.usuario.upsert({
    where: { email: 'master@empresa.com' },
    update: {
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: true,
    },
    create: {
      id: 'USR-MASTER',
      nombre: 'Usuario Maestro',
      email: 'master@empresa.com',
      passwordHash: masterPasswordHash,
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: true,
    },
  });

  // 3. Crear Usuario Administrador de demostración
  const adminPasswordHash = await bcrypt.hash('1234', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      id: 'USR-001',
      nombre: 'Administrador General',
      email: 'admin@empresa.com',
      passwordHash: adminPasswordHash,
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: false,
    },
  });

  // 4. Catálogo oficial de sanciones y gobernanza disciplinaria
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
      where: { infraccion: r.infraccion },
      update: {},
      create: r,
    });
  }

  // 4.1 Sanciones Especiales / Modificadores Disciplinarios
  const sancionesEspecialesBase = [
    {
      nombre: 'Pérdida de propina del día',
      sancionPrincipal: 'Tardanza',
      estado: 'Activo',
      tipoEfecto: 'PERDIDA_DIA',
      criterioDisparador: 'TOLERANCIA_O_FRECUENCIA',
      disparadorFrecuencia: 1,
    },
    {
      nombre: 'Pérdida de propina del día',
      sancionPrincipal: 'Uso de Celular',
      estado: 'Activo',
      tipoEfecto: 'PERDIDA_DIA',
      criterioDisparador: 'TOLERANCIA_O_FRECUENCIA',
      disparadorFrecuencia: 1,
    },
  ];

  for (const se of sancionesEspecialesBase) {
    const existe = await prisma.sancionEspecial.findFirst({
      where: {
        nombre: se.nombre,
        sancionPrincipal: se.sancionPrincipal,
      },
    });
    if (!existe) {
      await prisma.sancionEspecial.create({
        data: se,
      });
    }
  }

  // 5. Ciclo activo por defecto
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = hoy.getDate();
  const fIni = `${year}-${month}-${dia <= 15 ? '01' : '16'}`;
  const fFin = `${year}-${month}-${dia <= 15 ? '15' : '31'}`;

  const cicloExiste = await prisma.cicloLiquidacion.findFirst();
  if (!cicloExiste) {
    await prisma.cicloLiquidacion.create({
      data: {
        fechaInicio: fIni,
        fechaFin: fFin,
        estado: 'Abierto',
      },
    });
  }

  // 6. Colaboradores de muestra para pruebas inmediatas
  const personalInicial = [
    { nombre: 'Carlos Mendoza', area: 'Salón', estado: 'Activo' },
    { nombre: 'Andrea Rojas', area: 'Salón', estado: 'Activo' },
    { nombre: 'Luis Huamán', area: 'Cocina', estado: 'Activo' },
    { nombre: 'María Quispe', area: 'Cocina', estado: 'Activo' },
    { nombre: 'Jorge Silva', area: 'Apoyo Salón', estado: 'Activo' },
  ];

  for (const p of personalInicial) {
    await prisma.colaborador.upsert({
      where: { nombre: p.nombre },
      update: {},
      create: p,
    });
  }

  // 7. Registro de auditoría
  await prisma.auditoria.create({
    data: {
      usuario: 'Sistema',
      accion: 'Inicialización de Base de Datos',
      detalle: 'Base de datos Supabase inicializada con éxito con usuarios, reglas y ciclo base.',
    },
  });

  console.log('✅ Base de datos inicializada correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
