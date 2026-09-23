import { NextResponse } from 'next/server';
import { getEstadoFondoMancomunado } from '@/lib/formulas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio') || undefined;
    const fin = searchParams.get('fin') || undefined;

    const data = await getEstadoFondoMancomunado({ inicio, fin });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
