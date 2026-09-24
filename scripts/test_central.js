const http = require('http');

async function testCentral() {
  const res = await fetch('http://localhost:3000/api/central-dashboard');
  if (res.ok) {
    const data = await res.json();
    console.log('Central Dashboard OK:', {
      totalRed: data.kpis?.totalRed,
      totalHoras: data.kpis?.totalHoras,
      sedeLider: data.kpis?.sedeLider,
      sedeMasEficiente: data.kpis?.sedeMasEficiente,
      totalSedes: data.kpis?.totalSedes,
      rankingCount: data.ranking?.length,
      rankingSancionesCount: data.rankingSanciones?.length,
      trabajadoresPerdida100Count: data.trabajadoresPerdida100?.length,
      montoTotalPerdidoRed: data.montoTotalPerdidoRed,
    });
  }
}
