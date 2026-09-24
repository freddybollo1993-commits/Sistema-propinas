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
    console.log('Sheet Names:', workbook.SheetNames);
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`--- Sheet: ${sheetName} (Rows: ${data.length}) ---`);
      // Print first 5 non-empty rows and look for any store name
      for (let i = 0; i < Math.min(15, data.length); i++) {
        if (data[i] && data[i].length > 0) {
          console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 8)));
        }
      }
    });
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
