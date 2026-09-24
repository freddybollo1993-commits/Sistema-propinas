const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const uploadDir = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\098efaca-2472-4cde-95e8-1f7ad0c9ec3d\\.user_uploaded';

const b1 = fs.readFileSync(path.join(uploadDir, 'media_1790227395313.xlsx'));
const b2 = fs.readFileSync(path.join(uploadDir, 'media_1790227395325.xlsx'));

console.log('b1 length:', b1.length, 'b2 length:', b2.length);
console.log('Are equal:', b1.equals(b2));

// Check diff
for (let i = 0; i < Math.min(b1.length, b2.length); i++) {
  if (b1[i] !== b2[i]) {
    console.log(`First difference at byte ${i}: b1=${b1[i]}, b2=${b2[i]}`);
    break;
  }
}
