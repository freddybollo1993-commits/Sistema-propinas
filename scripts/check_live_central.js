async function checkLiveCentral() {
  const res = await fetch('https://propinas-one.vercel.app/api/central-dashboard');
  const data = await res.json();
  console.log('Live Central Dashboard Response:', {
    success: data.success,
    kpis: data.kpis,
    totalRankingSedes: data.ranking?.length,
    totalRankingSanciones: data.rankingSanciones?.length,
    trabajadoresPerdida100Count: data.trabajadoresPerdida100?.length,
    montoTotalPerdidoRed: data.montoTotalPerdidoRed,
    diasSemanaCount: data.analiticaBI?.diasSemana?.length,
    resumenSemanaVsFds: data.analiticaBI?.resumenSemanaVsFds
  });
}
checkLiveCentral();
