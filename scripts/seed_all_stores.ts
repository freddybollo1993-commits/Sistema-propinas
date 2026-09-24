import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import xlsx from 'xlsx';
import prisma from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

function excelDateToISO(val: any): string {
  if (!val) return '';
  if (typeof val === 'string' && val.includes('-')) return val.trim().substring(0, 10);
  const serial = parseFloat(val);
  if (isNaN(serial)) return String(val).trim();
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return dateInfo.toISOString().split('T')[0];
}

function generateHexKey(seed: string): string {
  return crypto.createHash('md5').update(seed).digest('hex').substring(0, 6).toUpperCase();
}

async function main() {
  console.log('=== INICIANDO MIGRACIÓN MULTI-TIENDA CORPORATIVA (OPTIMIZADA) ===\n');

  // 1. Configurar Tienda Principal como BETA
  console.log('1. Configurando Sede Principal como BETA / Pruebas...');
  await prisma.tienda.upsert({
    where: { id: 'tienda-principal' },
    update: {
      nombre: 'Sede Principal (BETA / Pruebas)',
      slug: 'sede-principal-beta',
      direccion: 'Sede Central de Pruebas y Desarrollo',
      estado: 'Activo',
    },
    create: {
      id: 'tienda-principal',
      nombre: 'Sede Principal (BETA / Pruebas)',
      slug: 'sede-principal-beta',
      direccion: 'Sede Central de Pruebas y Desarrollo',
      estado: 'Activo',
    },
  });

  // Asegurar Usuario Maestro
  const masterPass = await hashPassword('9999');
  await prisma.usuario.upsert({
    where: { id: 'USR-MASTER' },
    update: {
      nombre: 'Usuario Maestro Corporativo',
      email: 'master@empresa.com',
      passwordHash: masterPass,
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: true,
      tiendaId: null,
    },
    create: {
      id: 'USR-MASTER',
      nombre: 'Usuario Maestro Corporativo',
      email: 'master@empresa.com',
      passwordHash: masterPass,
      rol: 'Administrador',
      estado: 'Activo',
      esMaestro: true,
      tiendaId: null,
    },
  });

  // Usuario Admin para Beta
  const betaPass = await hashPassword('1234');
  await prisma.usuario.upsert({
    where: { id: 'USR-001' },
    update: {
      nombre: 'Admin Sede Beta',
      email: 'admin.beta@propinas.pe',
      passwordHash: betaPass,
      rol: 'Administrador',
      estado: 'Activo',
      tiendaId: 'tienda-principal',
    },
    create: {
      id: 'USR-001',
      nombre: 'Admin Sede Beta',
      email: 'admin.beta@propinas.pe',
      passwordHash: betaPass,
      rol: 'Administrador',
      estado: 'Activo',
      tiendaId: 'tienda-principal',
    },
  });

  // 2. Leer archivos de Google Drive
  const driveDir = 'C:\\Users\\dell\\Downloads\\drive-download-20260924T052020Z-1-001';
  if (!fs.existsSync(driveDir)) {
    console.error('No se encontró la carpeta:', driveDir);
    return;
  }

  const files = fs.readdirSync(driveDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Se encontraron ${files.length} archivos de tiendas para procesar.\n`);

  const reportCredenciales: any[] = [];
  const usedHexKeys = new Set<string>();

  for (const file of files) {
    const filePath = path.join(driveDir, file);
    const wb = xlsx.readFile(filePath);

    // Limpiar nombre de tienda
    let nombreTienda = file
      .replace(/^Propinas?\s+/i, '')
      .replace(/\.xlsx$/i, '')
      .replace(/\(Fondo Mancomunado\)/i, '')
      .trim();

    if (nombreTienda === 'SJL') nombreTienda = 'San Juan de Lurigancho (SJL)';
    if (nombreTienda === 'Jesus Maria') nombreTienda = 'Jesús María';
    if (nombreTienda === 'La molina') nombreTienda = 'La Molina';
    if (nombreTienda === 'Punta hermosa') nombreTienda = 'Punta Hermosa';
    if (nombreTienda === 'Punta mar') nombreTienda = 'Punta Mar';
    if (nombreTienda === 'San Jose') nombreTienda = 'San José';

    const slug = nombreTienda
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const tiendaId = `tienda-${slug}`;
    const isFondo = file.toLowerCase().includes('fondo') || file.toLowerCase().includes('mancomunado');

    console.log(`Procesando tienda: [${nombreTienda}] (Slug: ${slug}, ID: ${tiendaId})`);

    // A. Crear o Actualizar Tienda
    await prisma.tienda.upsert({
      where: { id: tiendaId },
      update: {
        nombre: isFondo ? `${nombreTienda} (Fondo Mancomunado)` : nombreTienda,
        slug,
        estado: 'Activo',
      },
      create: {
        id: tiendaId,
        nombre: isFondo ? `${nombreTienda} (Fondo Mancomunado)` : nombreTienda,
        slug,
        estado: 'Activo',
      },
    });

    // Limpiar datos previos de esta tienda para importación atómica limpia
    await prisma.detalleParticipacion.deleteMany({ where: { registro: { tiendaId } } });
    await prisma.registroPropina.deleteMany({ where: { tiendaId } });
    await prisma.sancionAdelanto.deleteMany({ where: { tiendaId } });
    await prisma.colaborador.deleteMany({ where: { tiendaId } });

    // B. Modo de Sanciones
    const modoValor = isFondo ? 'FONDO_MANCOMUNADO' : 'CLASICO';
    await prisma.configuracionSistema.upsert({
      where: {
        clave_tiendaId: {
          clave: 'MODO_SANCIONES',
          tiendaId,
        },
      },
      update: { valor: modoValor },
      create: {
        clave: 'MODO_SANCIONES',
        valor: modoValor,
        tiendaId,
      },
    });

    // C. Ciclo Activo
    const fechasSheet = wb.Sheets['Fechas_Activas'];
    let fInicio = '2026-09-16';
    let fFin = '2026-09-30';
    let fEstado = 'Abierto';

    if (fechasSheet) {
      const fechasRows: any[] = xlsx.utils.sheet_to_json(fechasSheet);
      if (fechasRows.length > 0 && fechasRows[0]['Fecha Inicio']) {
        fInicio = excelDateToISO(fechasRows[0]['Fecha Inicio']) || fInicio;
        fFin = excelDateToISO(fechasRows[0]['Fecha Fin']) || fFin;
        fEstado = fechasRows[0]['Estado del Ciclo'] || fEstado;
      }
    }

    const cicloExiste = await prisma.cicloLiquidacion.findFirst({
      where: { tiendaId },
    });
    if (cicloExiste) {
      await prisma.cicloLiquidacion.update({
        where: { id: cicloExiste.id },
        data: { fechaInicio: fInicio, fechaFin: fFin, estado: fEstado },
      });
    } else {
      await prisma.cicloLiquidacion.create({
        data: { fechaInicio: fInicio, fechaFin: fFin, estado: fEstado, tiendaId },
      });
    }

    // D. Catálogo de Sanciones
    const sancSheet = wb.Sheets['Configuracion_Sanciones'];
    const reglasBase: any[] = [
      {
        infraccion: 'Tardanza',
        estado: 'Activo',
        monto: 0,
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

    if (sancSheet) {
      const sancRows: any[][] = xlsx.utils.sheet_to_json(sancSheet, { header: 1 });
      for (let r = 1; r < sancRows.length; r++) {
        const row = sancRows[r];
        if (!row || !row[0]) continue;
        const infName = String(row[0]).trim();
        const est = String(row[1] || 'Activo').trim();
        const montoStr = String(row[2] || '0').replace(/[^0-9.]/g, '');
        const monto = parseFloat(montoStr) || 0;
        const freq = parseInt(row[3] || 1) || 1;
        const cons = String(row[4] || 'Pérdida del 100% de propinas acumuladas').trim();
        const tol = parseInt(row[5] || 0) || 0;
        const tolAct = String(row[6] || '').toLowerCase() === 'activo';
        const mult = parseFloat(row[7] || 0) || 0;
        const multAct = String(row[8] || '').toLowerCase() === 'activo';

        const idx = reglasBase.findIndex(b => b.infraccion === infName);
        const reglaData = {
          infraccion: infName,
          estado: est,
          monto,
          frecuenciaMax: freq,
          consecuencia: cons,
          toleranciaMin: tol,
          toleranciaActiva: tolAct,
          multiplicador: mult,
          multiplicadorActivo: multAct,
        };

        if (idx >= 0) {
          reglasBase[idx] = reglaData;
        } else {
          reglasBase.push(reglaData);
        }
      }
    }

    for (const r of reglasBase) {
      await prisma.reglaSancion.upsert({
        where: {
          infraccion_tiendaId: {
            infraccion: r.infraccion,
            tiendaId,
          },
        },
        update: { ...r },
        create: { ...r, tiendaId },
      });
    }

    // E. Sanción Especial por defecto
    const espExiste = await prisma.sancionEspecial.findFirst({
      where: { tiendaId, sancionPrincipal: 'Tardanza' },
    });
    if (!espExiste) {
      await prisma.sancionEspecial.create({
        data: {
          nombre: 'Pérdida de propina del día',
          sancionPrincipal: 'Tardanza',
          estado: 'Activo',
          tipoEfecto: 'PERDIDA_DIA',
          criterioDisparador: 'TOLERANCIA',
          disparadorFrecuencia: 1,
          tiendaId,
        },
      });
    }

    // F. Personal
    const perSheet = wb.Sheets['Personal'];
    if (perSheet) {
      const perRows: any[] = xlsx.utils.sheet_to_json(perSheet);
      const uniqueNames = new Set<string>();
      const colabData: any[] = [];

      for (const p of perRows) {
        const nom = String(p['Nombre del Colaborador'] || p.Nombre || '').trim();
        if (!nom || uniqueNames.has(nom.toLowerCase())) continue;
        uniqueNames.add(nom.toLowerCase());
        const area = String(p['Área de Trabajo'] || p.Area || 'Salón').trim();
        const est = String(p['Estado'] || 'Activo').trim();
        colabData.push({ nombre: nom, area, estado: est, tiendaId });
      }

      if (colabData.length > 0) {
        await prisma.colaborador.createMany({ data: colabData });
      }
    }

    // G. Turnos de Propina & Detalles de Participación
    const regSheet = wb.Sheets['Registro_Propinas'];
    const detSheet = wb.Sheets['Detalle_Participacion'];

    if (regSheet && detSheet) {
      const regRows: any[] = xlsx.utils.sheet_to_json(regSheet);
      const detRows: any[] = xlsx.utils.sheet_to_json(detSheet);

      for (const r of regRows) {
        const idRegExcel = r['ID Registro'];
        const monto = parseFloat(r['Monto Total Recaudado']);
        if (!idRegExcel || isNaN(monto) || monto <= 0) continue;

        const fReg = excelDateToISO(r['Fecha']) || fInicio;
        const fSalon = parseFloat(r['Fondo Salón (60%)']) || monto * 0.6;
        const fCocina = parseFloat(r['Fondo Cocina (40%)']) || monto * 0.4;
        const est = String(r['Estado'] || 'Activo').trim();
        const just = r['Justificación Anulación'] ? String(r['Justificación Anulación']).trim() : null;
        const val = r['Usuario Validador'] ? String(r['Usuario Validador']).trim() : null;

        const regCreado = await prisma.registroPropina.create({
          data: {
            fecha: fReg,
            montoTotal: monto,
            fondoSalon: fSalon,
            fondoCocina: fCocina,
            estado: est,
            justificacion: just,
            validador: val,
            tiendaId,
          },
        });

        // Filtrar y preparar detalles en bloque (createMany)
        const detsAsoc = detRows.filter(d => String(d['ID Registro']) === String(idRegExcel));
        const batchDets = detsAsoc
          .filter(d => Boolean(d['Colaborador']))
          .map(d => ({
            registroId: regCreado.id,
            colaborador: String(d['Colaborador']).trim(),
            area: String(d['Área'] || 'Salón').trim(),
            horas: parseFloat(d['Horas Trabajadas']) || 0,
            totalHorasArea: parseFloat(d['Total Horas Área en el Registro']) || 0,
            propina: parseFloat(d['Propina Asignada']) || 0,
          }));

        if (batchDets.length > 0) {
          await prisma.detalleParticipacion.createMany({ data: batchDets });
        }
      }
    }

    // H. Adelantos y Sanciones
    const adelSheet = wb.Sheets['Adelantos_Sanciones'];
    if (adelSheet) {
      const adelRows: any[] = xlsx.utils.sheet_to_json(adelSheet);
      const batchAdels = adelRows
        .filter(a => Boolean(a['Colaborador'] || a.colaborador))
        .map(a => ({
          fecha: excelDateToISO(a['Fecha'] || a.fecha) || fInicio,
          colaborador: String(a['Colaborador'] || a.colaborador).trim(),
          concepto: String(a['Concepto'] || a.concepto || 'Sanción').trim(),
          monto: parseFloat(a['Monto'] || a.monto || 0) || 0,
          detalle: String(a['Detalle'] || a.detalle || '').trim(),
          estado: a.__EMPTY ? String(a.__EMPTY).trim() : 'Aprobado',
          usuario: a.__EMPTY_1 ? String(a.__EMPTY_1).trim() : 'Admin General',
          tiendaId,
        }));

      if (batchAdels.length > 0) {
        await prisma.sancionAdelanto.createMany({ data: batchAdels });
      }
    }

    // I. Generar Credenciales Hexadecimales Únicas
    let adminHex = generateHexKey(`ADMIN-${slug}`);
    while (usedHexKeys.has(adminHex)) {
      adminHex = generateHexKey(`ADMIN-${slug}-${Math.random()}`);
    }
    usedHexKeys.add(adminHex);

    let superHex = generateHexKey(`SUPER-${slug}`);
    while (usedHexKeys.has(superHex)) {
      superHex = generateHexKey(`SUPER-${slug}-${Math.random()}`);
    }
    usedHexKeys.add(superHex);

    let modHex = generateHexKey(`MOD-${slug}`);
    while (usedHexKeys.has(modHex)) {
      modHex = generateHexKey(`MOD-${slug}-${Math.random()}`);
    }
    usedHexKeys.add(modHex);

    const adminEmail = `admin.${slug}@propinas.pe`;
    const superEmail = `super.${slug}@propinas.pe`;
    const modEmail = `mod.${slug}@propinas.pe`;

    const adminHash = await hashPassword(adminHex);
    const superHash = await hashPassword(superHex);
    const modHash = await hashPassword(modHex);

    // Guardar usuarios
    await prisma.usuario.upsert({
      where: { id: `USR-ADM-${slug.toUpperCase()}` },
      update: {
        nombre: `Admin ${nombreTienda}`,
        email: adminEmail,
        passwordHash: adminHash,
        rol: 'Administrador',
        estado: 'Activo',
        tiendaId,
      },
      create: {
        id: `USR-ADM-${slug.toUpperCase()}`,
        nombre: `Admin ${nombreTienda}`,
        email: adminEmail,
        passwordHash: adminHash,
        rol: 'Administrador',
        estado: 'Activo',
        tiendaId,
      },
    });

    await prisma.usuario.upsert({
      where: { id: `USR-SUP-${slug.toUpperCase()}` },
      update: {
        nombre: `Supervisor ${nombreTienda}`,
        email: superEmail,
        passwordHash: superHash,
        rol: 'Supervisor',
        estado: 'Activo',
        tiendaId,
      },
      create: {
        id: `USR-SUP-${slug.toUpperCase()}`,
        nombre: `Supervisor ${nombreTienda}`,
        email: superEmail,
        passwordHash: superHash,
        rol: 'Supervisor',
        estado: 'Activo',
        tiendaId,
      },
    });

    await prisma.usuario.upsert({
      where: { id: `USR-MOD-${slug.toUpperCase()}` },
      update: {
        nombre: `Moderador ${nombreTienda}`,
        email: modEmail,
        passwordHash: modHash,
        rol: 'Moderador',
        estado: 'Activo',
        tiendaId,
      },
      create: {
        id: `USR-MOD-${slug.toUpperCase()}`,
        nombre: `Moderador ${nombreTienda}`,
        email: modEmail,
        passwordHash: modHash,
        rol: 'Moderador',
        estado: 'Activo',
        tiendaId,
      },
    });

    reportCredenciales.push({
      tienda: isFondo ? `${nombreTienda} (Fondo Mancomunado)` : nombreTienda,
      slug,
      modalidad: modoValor,
      adminLogin: adminEmail,
      adminPin: adminHex,
      superLogin: superEmail,
      superPin: superHex,
      modLogin: modEmail,
      modPin: modHex,
    });

    console.log(`✓ Tienda ${nombreTienda} migrada exitosamente. Clave Admin: ${adminHex}`);
  }

  // Guardar archivo reporte de credenciales
  fs.writeFileSync(
    path.join(__dirname, '../CREDENCIALES_TIENDAS.json'),
    JSON.stringify(reportCredenciales, null, 2),
    'utf-8'
  );

  console.log('\n=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===');
  console.log(`Total de tiendas migradas: ${reportCredenciales.length}`);
}

main()
  .catch(e => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
