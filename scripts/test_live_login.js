async function test() {
  const res = await fetch('https://propinas-one.vercel.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'admin.san-borja', pass: '1A5075' }),
  });
  const data = await res.json();
  console.log('San Borja Login Result:', data);

  const resMaster = await fetch('https://propinas-one.vercel.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'master@empresa.com', pass: '9999' }),
  });
  const resBeta = await fetch('https://propinas-one.vercel.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: 'admin.beta@propinas.pe', pass: '1234' }),
  });
  const dataBeta = await resBeta.json();
  console.log('Beta Store Login Result:', dataBeta);
}
test();
