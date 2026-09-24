const fs = require('fs');
const path = require('path');

const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded';
const driveDir = 'C:\\Users\\dell\\Downloads\\drive-download-20260924T052020Z-1-001';

const uploadFiles = fs.readdirSync(uploadDir).filter(f => f.endsWith('.xlsx'));
const driveFiles = fs.readdirSync(driveDir).filter(f => f.endsWith('.xlsx'));

console.log('--- Matching uploaded files to Google Drive files by byte size / content ---');

uploadFiles.forEach(uFile => {
  const uPath = path.join(uploadDir, uFile);
  const uBuf = fs.readFileSync(uPath);

  driveFiles.forEach(dFile => {
    const dPath = path.join(driveDir, dFile);
    const dBuf = fs.readFileSync(dPath);

    if (uBuf.equals(dBuf)) {
      console.log(`EXACT MATCH: ${uFile} === ${dFile}`);
    } else if (uBuf.length === dBuf.length) {
      console.log(`SAME SIZE (${uBuf.length} bytes): ${uFile} ~~~ ${dFile}`);
    }
  });
});
