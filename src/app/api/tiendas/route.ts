import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { inicializarTiendaConPlantilla } from '@/lib/tiendas';
import { logAuditoria } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Si es SuperAdmin, puede ver todas las tiendas
    // Si es usuario de tienda, solo ve su tienda asignada
    const whereClause = user.esMaestro
      ? {}
      : { id: user.tiendaId || 'tienda-principal' };

    const tiendas = await prisma.tienda.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            personal: true,
            usuarios: true,
            registros: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(tiendas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.esMaestro) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado: Solo el Usuario Maestro Corporativo puede crear nuevas tiendas.' },
        { status: 403 }
      );
    }

    const { nombre, slug, direccion, telefono } = await request.json();

    const nombreLimpio = String(nombre || '').trim();
    if (!nombreLimpio) {
      return NextResponse.json(
        { success: false, message: 'Debe ingresar el nombre comercial del restaurante/tienda.' },
        { status: 400 }
      );
    }

    const slugLimpio = String(slug || nombreLimpio)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Verificar si ya existe
    const existe = await prisma.tienda.findFirst({
      where: {
        OR: [{ nombre: nombreLimpio }, { slug: slugLimpio }],
      },
    });

    if (existe) {
      return NextResponse.json(
        { success: false, message: 'Ya existe una tienda registrada con ese nombre o slug.' },
        { status: 400 }
      );
    }

    // 1. Crear tienda
    const nuevaTienda = await prisma.tienda.create({
      data: {
        nombre: nombreLimpio,
        slug: slugLimpio,
        direccion: direccion ? String(direccion).trim() : null,
        telefono: telefono ? String(telefono).trim() : null,
        estado: 'Activo',
      },
    });

    // 2. Inicializar con la plantilla base oficial clonada (catálogo, sanciones especiales, ciclo y modo)
    await inicializarTiendaConPlantilla(nuevaTienda.id, user.nombre);

    await logAuditoria(
      'Creación de Tienda',
      `Nueva tienda/sucursal creada: "${nuevaTienda.nombre}" (${nuevaTienda.slug}) con plantilla base estandarizada`,
      user.nombre
    );

    return NextResponse.json({
      success: true,
      message: `Restaurante/Tienda "${nuevaTienda.nombre}" creado exitosamente con la plantilla base estandarizada.`,
      tienda: nuevaTienda,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
