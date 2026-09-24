const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded';
const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  const filePath = path.join(uploadDir, file);
  console.log('========================================================');
  console.log(`FILE: ${file}`);
  const wb = xlsx.readFile(filePath);

  // Check personal
  const personal = xlsx.utils.sheet_to_json(wb.Sheets['Personal'] || {});
  console.log(`Personal Count: ${personal.length}`);
  const names = personal.map(p => p['Nombre del Colaborador'] || p.Nombre).filter(Boolean);
  console.log(`Personal Sample (${names.length}):`, names.slice(0, 5));

  // Check Fechas_Activas
  const fechas = xlsx.utils.sheet_to_json(wb.Sheets['Fechas_Activas'] || {});
  console.log('Fechas Activas:', fechas);

  // Check Dashboard
  const dash = xlsx.utils.sheet_to_json(wb.Sheets['Dashboard'] || {}, { header: 1 });
  console.log('Dashboard rows:', dash.filter(r => r.length > 0));

  // Check Registro_Propinas count
  const reg = xlsx.utils.sheet_to_json(wb.Sheets['Registro_Propinas'] || {});
  console.log(`Registro_Propinas valid count: ${reg.filter(r => r['Monto Total Recaudado'] != null).length}`);

  // Check Adelantos_Sanciones
  const adel = xlsx.utils.sheet_to_json(wb.Sheets['Adelantos_Sanciones'] || {});
  console.log(`Adelantos_Sanciones count: ${adel.length}`);
});
