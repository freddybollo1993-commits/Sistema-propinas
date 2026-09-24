const xlsx = require('xlsx');
const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded\\';

const f1 = xlsx.readFile(uploadDir + 'media_1790227395313.xlsx');
const f2 = xlsx.readFile(uploadDir + 'media_1790227395325.xlsx');

['Configuracion_Sanciones', 'Fechas_Activas', 'Usuarios_Accesos', 'Dashboard'].forEach(s => {
  const d1 = xlsx.utils.sheet_to_json(f1.Sheets[s] || {}, { header: 1 });
  const d2 = xlsx.utils.sheet_to_json(f2.Sheets[s] || {}, { header: 1 });
  console.log(`Sheet: ${s}`);
  console.log('F1:', JSON.stringify(d1.slice(0, 5)));
  console.log('F2:', JSON.stringify(d2.slice(0, 5)));
});
