const xlsx = require('xlsx');
const path = require('path');

const driveDir = 'C:\\Users\\dell\\Downloads\\drive-download-20260924T052020Z-1-001';

['Propina San Borja.xlsx', 'Propina Santa Anita.xlsx', 'Propinas Jesus Maria.xlsx', 'Propinas Punta mar (Fondo Mancomunado).xlsx'].forEach(file => {
  console.log(`\n=================== FILE: ${file} ===================`);
  const wb = xlsx.readFile(path.join(driveDir, file));
  const adelSheet = wb.Sheets['Adelantos_Sanciones'];
  if (adelSheet) {
    const adels = xlsx.utils.sheet_to_json(adelSheet);
    console.log(`Adelantos count: ${adels.length}`);
    if (adels.length > 0) {
      console.log('Sample item:', adels[0]);
    }
  }

  const sancSheet = wb.Sheets['Configuracion_Sanciones'];
  if (sancSheet) {
    const rows = xlsx.utils.sheet_to_json(sancSheet, { header: 1 });
    console.log('Sanciones config rows:');
    rows.slice(1, 5).forEach(r => console.log('  ', r.slice(0, 7)));
  }
});
