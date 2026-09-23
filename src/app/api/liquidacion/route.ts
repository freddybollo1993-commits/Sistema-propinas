import { NextResponse } from 'next/server';
import { getLiquidacionResumen } from '@/lib/formulas';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inicio = searchParams.get('inicio') || undefined;
    const fin = searchParams.get('fin') || undefined;

    const data = await getLiquidacionResumen({ inicio, fin });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error en /api/liquidacion:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
