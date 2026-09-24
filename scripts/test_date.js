const xlsx = require('xlsx');

function excelDateToISO(val) {
  if (!val) return '';
  if (typeof val === 'string' && val.includes('-')) return val.trim();
  const serial = parseFloat(val);
  if (isNaN(serial)) return String(val).trim();
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return dateInfo.toISOString().split('T')[0];
}

console.log('46266 ->', excelDateToISO(46266));
console.log('46280 ->', excelDateToISO(46280));
console.log('46281 ->', excelDateToISO(46281));
console.log('46295 ->', excelDateToISO(46295));
