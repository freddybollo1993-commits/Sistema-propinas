export interface InfoGrupoArea {
  groupOrder: number;
  subOrder: number;
  groupKey: 'salon' | 'cocina' | 'otros';
  groupTitle: string;
  fondoBadge: string;
  badgeClass: string;
  headerClass: string;
  iconClass: string;
}

/**
 * Clasifica y agrupa un área de trabajo garantizando la secuencia estándar:
 * 1. Salón
 * 2. Apoyos Salón
 * 3. Cocina
 * 4. Apoyos Cocina
 * 5. Otros
 * 6. Apoyos Otros
 */
export function getAreaGroup(
  area: string,
  modoDistribucion: '60_40' | 'equitativo' = '60_40'
): InfoGrupoArea {
  const a = (area || '').trim().toLowerCase();
  const isApoyo = a.includes('apoyo');
  const isSalon = a.includes('salón') || a.includes('salon');
  const isCocina = a.includes('cocina');

  const badgeSalon = modoDistribucion === 'equitativo' ? 'Reparto Equitativo' : 'Fondo 60%';
  const badgeCocina = modoDistribucion === 'equitativo' ? 'Reparto Equitativo' : 'Fondo 40%';

  if (isSalon) {
    return {
      groupOrder: 1,
      subOrder: isApoyo ? 2 : 1,
      groupKey: 'salon',
      groupTitle: 'PERSONAL DE SALÓN (Incluye Apoyos de Salón)',
      fondoBadge: badgeSalon,
      badgeClass: 'bg-success text-white',
      headerClass: 'bg-success-subtle text-success-emphasis',
      iconClass: 'bi-shop',
    };
  }
  if (isCocina) {
    return {
      groupOrder: 2,
      subOrder: isApoyo ? 2 : 1,
      groupKey: 'cocina',
      groupTitle: 'PERSONAL DE COCINA (Incluye Apoyos de Cocina)',
      fondoBadge: badgeCocina,
      badgeClass: 'bg-warning text-dark',
      headerClass: 'bg-warning-subtle text-warning-emphasis',
      iconClass: 'bi-fire',
    };
  }
  return {
    groupOrder: 3,
    subOrder: isApoyo ? 2 : 1,
    groupKey: 'otros',
    groupTitle: 'OTROS COLABORADORES',
    fondoBadge: '',
    badgeClass: 'bg-secondary text-white',
    headerClass: 'bg-secondary-subtle text-secondary-emphasis',
    iconClass: 'bi-person-badge',
  };
}

/**
 * Ordena un listado de colaboradores siguiendo estrictamente:
 * 1° Salón (titulares alfabéticamente)
 * 2° Apoyos Salón (alfabéticamente)
 * 3° Cocina (titulares alfabéticamente)
 * 4° Apoyos Cocina (alfabéticamente)
 * 5° Otros colaboradores
 */
export function ordenarColaboradoresPorArea<T extends { area: string; nombre?: string; colaborador?: string }>(
  lista: T[],
  modoDistribucion: '60_40' | 'equitativo' = '60_40'
): T[] {
  return [...lista].sort((a, b) => {
    const gA = getAreaGroup(a.area, modoDistribucion);
    const gB = getAreaGroup(b.area, modoDistribucion);
    if (gA.groupOrder !== gB.groupOrder) return gA.groupOrder - gB.groupOrder;
    if (gA.subOrder !== gB.subOrder) return gA.subOrder - gB.subOrder;
    const nomA = (a.nombre || a.colaborador || '').trim();
    const nomB = (b.nombre || b.colaborador || '').trim();
    return nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
  });
}
