const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded';

const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  const filePath = path.join(uploadDir, file);
  console.log('========================================================');
  console.log(`FILE: ${file}`);
  try {
    const workbook = xlsx.readFile(filePath);
    // Check workbook Props
    console.log('Props:', workbook.Props);
    console.log('Custprops:', workbook.Custprops);
    
    // Search all cells in all sheets for keywords like "Tienda", "Sede", "Restaurante", "Local", or any distinct text
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      data.forEach((row, rIdx) => {
        row.forEach((cell, cIdx) => {
          if (typeof cell === 'string') {
            const lower = cell.toLowerCase();
            if (
              lower.includes('tienda') ||
              lower.includes('sede') ||
              lower.includes('local') ||
              lower.includes('restaurante') ||
              lower.includes('sucursal') ||
              lower.includes('san ') ||
              lower.includes('miraflores') ||
              lower.includes('chacarilla') ||
              lower.includes('surco') ||
              lower.includes('barranco') ||
              lower.includes('polo') ||
              lower.includes('asia') ||
              lower.includes('dasso') ||
              lower.includes('salaverry') ||
              lower.includes('larcomar') ||
              lower.includes('jockey') ||
              lower.includes('benavides') ||
              lower.includes('diagonal') ||
              lower.includes('conquistadores') ||
              lower.includes('la mar') ||
              lower.includes('begonias') ||
              lower.includes('pradera') ||
              lower.includes('molina') ||
              lower.includes('san borja')
            ) {
              console.log(`Found in [${sheetName}] R${rIdx}C${cIdx}: "${cell}"`);
            }
          }
        });
      });
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
