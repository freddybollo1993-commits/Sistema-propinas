import { NextResponse } from 'next/server';
import { getEstadoFondoMancomunado } from '@/lib/formulas';
import { resolveTiendaId } from '@/lib/tiendas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { tiendaId } = await resolveTiendaId(request);
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio') || undefined;
    const fin = searchParams.get('fin') || undefined;

    const data = await getEstadoFondoMancomunado({ inicio, fin, tiendaId });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
