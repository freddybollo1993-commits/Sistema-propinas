const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded';
const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  const filePath = path.join(uploadDir, file);
  console.log('========================================================');
  console.log(`FILE: ${file}`);
  try {
    const zip = new AdmZip(filePath);
    const coreEntry = zip.getEntry('docProps/core.xml');
    if (coreEntry) {
      console.log('core.xml:', coreEntry.getData().toString('utf8'));
    }
    const appEntry = zip.getEntry('docProps/app.xml');
    if (appEntry) {
      console.log('app.xml:', appEntry.getData().toString('utf8'));
    }
  } catch (err) {
    console.error('Error with zip:', err.message);
  }
});
