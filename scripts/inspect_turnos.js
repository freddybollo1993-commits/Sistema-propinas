const xlsx = require('xlsx');
const path = require('path');

const driveDir = 'C:\\Users\\dell\\Downloads\\drive-download-20260924T052020Z-1-001';

['Propina San Borja.xlsx', 'Propina Santa Anita.xlsx', 'Propinas Jesus Maria.xlsx'].forEach(file => {
  console.log(`\n=================== FILE: ${file} ===================`);
  const wb = xlsx.readFile(path.join(driveDir, file));
  const regSheet = wb.Sheets['Registro_Propinas'];
  const detSheet = wb.Sheets['Detalle_Participacion'];

  const regs = xlsx.utils.sheet_to_json(regSheet);
  const dets = xlsx.utils.sheet_to_json(detSheet);

  console.log(`Regs sample (total ${regs.length}):`, regs.slice(0, 3));
  console.log(`Dets sample (total ${dets.length}):`, dets.slice(0, 3));
});
