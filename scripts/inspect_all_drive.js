const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const driveDir = 'C:\\Users\\dell\\Downloads\\drive-download-20260924T052020Z-1-001';
const files = fs.readdirSync(driveDir).filter(f => f.endsWith('.xlsx'));

console.log(`Total files in Drive folder: ${files.length}`);

const summary = [];

files.forEach(file => {
  const filePath = path.join(driveDir, file);
  try {
    const wb = xlsx.readFile(filePath);
    const personal = xlsx.utils.sheet_to_json(wb.Sheets['Personal'] || []);
    const validPersonal = personal.filter(p => p['Nombre del Colaborador'] || p.Nombre);
    const reg = xlsx.utils.sheet_to_json(wb.Sheets['Registro_Propinas'] || []);
    const validReg = reg.filter(r => r['Monto Total Recaudado'] != null && r['Monto Total Recaudado'] !== '');
    const adel = xlsx.utils.sheet_to_json(wb.Sheets['Adelantos_Sanciones'] || []);
    const validAdel = adel.filter(a => a.Colaborador || a.colaborador);
    const fechas = xlsx.utils.sheet_to_json(wb.Sheets['Fechas_Activas'] || []);
    
    // Check mode
    const isFondo = file.toLowerCase().includes('fondo') || file.toLowerCase().includes('mancomunado');

    summary.push({
      file,
      storeName: file.replace(/^Propinas?\s+/i, '').replace(/\.xlsx$/i, '').trim(),
      personalCount: validPersonal.length,
      registrosCount: validReg.length,
      adelantosCount: validAdel.length,
      isFondo,
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});

console.table(summary);
