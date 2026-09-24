import prisma from '../src/lib/db';

async function main() {
  console.log('=== DESACTIVANDO SANCIONES ESPECIALES EN TODAS LAS TIENDAS ===');

  const countBefore = await prisma.sancionEspecial.count();
  console.log(`Total de registros de SancionEspecial encontrados: ${countBefore}`);

  const updated = await prisma.sancionEspecial.updateMany({
    data: {
      estado: 'Inactivo',
    },
  });

  console.log(`✓ Sanciones especiales actualizadas a estado "Inactivo": ${updated.count}`);

  const todas = await prisma.sancionEspecial.findMany({
    include: {
      tienda: true,
    },
    orderBy: [{ tiendaId: 'asc' }, { id: 'asc' }],
  });

  console.log('\nResumen actual por tienda:');
  todas.forEach((s) => {
    console.log(`- [${s.tienda?.nombre || 'Global'}] ${s.nombre} -> Principal: ${s.sancionPrincipal} | Estado: ${s.estado}`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
