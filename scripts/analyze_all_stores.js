const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const driveDir = 'C:\\Users\\dell\\Downloads\\drive-download-20260924T052020Z-1-001';
const files = fs.readdirSync(driveDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  const filePath = path.join(driveDir, file);
  const wb = xlsx.readFile(filePath);

  console.log(`\n=================== STORE FILE: ${file} ===================`);
  
  // 1. Fechas Activas
  const fechasSheet = wb.Sheets['Fechas_Activas'];
  if (fechasSheet) {
    const fechas = xlsx.utils.sheet_to_json(fechasSheet);
    console.log('Fechas Activas:', fechas);
  }

  // 2. Personal count & areas
  const perSheet = wb.Sheets['Personal'];
  if (perSheet) {
    const personal = xlsx.utils.sheet_to_json(perSheet);
    const valid = personal.filter(p => p['Nombre del Colaborador'] || p.Nombre);
    const areas = {};
    valid.forEach(p => {
      const a = p['Área de Trabajo'] || p.Area || 'Sin Area';
      areas[a] = (areas[a] || 0) + 1;
    });
    console.log(`Personal: ${valid.length} cols. Areas:`, areas);
  }

  // 3. Registros propinas
  const regSheet = wb.Sheets['Registro_Propinas'];
  if (regSheet) {
    const regs = xlsx.utils.sheet_to_json(regSheet);
    const validReg = regs.filter(r => r['Monto Total Recaudado'] != null && r['Monto Total Recaudado'] !== '');
    console.log(`Registro Propinas: ${validReg.length} turnos.`);
  }

  // 4. Adelantos / Sanciones
  const adelSheet = wb.Sheets['Adelantos_Sanciones'];
  if (adelSheet) {
    const adels = xlsx.utils.sheet_to_json(adelSheet);
    const validAdel = adels.filter(a => a.Colaborador || a.colaborador);
    console.log(`Adelantos / Sanciones: ${validAdel.length} items.`);
  }
});
