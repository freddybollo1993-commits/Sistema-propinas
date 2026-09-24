const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded';
const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  console.log(`\n=================== ${file} ===================`);
  const wb = xlsx.readFile(path.join(uploadDir, file));
  wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    // check title row or comments
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let R = 0; R <= Math.min(range.e.r, 5); ++R) {
      const rowVals = [];
      for (let C = 0; C <= Math.min(range.e.c, 10); ++C) {
        const cell = sheet[xlsx.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v !== undefined) {
          rowVals.push(`[${xlsx.utils.encode_cell({ r: R, c: C })}]=${cell.v}`);
        }
      }
      if (rowVals.length > 0) {
        console.log(`[${sheetName}] R${R}: ${rowVals.join(' | ')}`);
      }
    }
  });
});
