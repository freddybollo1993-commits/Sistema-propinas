import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.esMaestro) {
      return NextResponse.json(
        {
          success: false,
          message: 'Acceso denegado: Solo el Usuario Maestro Corporativo puede consultar las credenciales de tiendas.',
        },
        { status: 403 }
      );
    }

    // 1. Obtener todas las tiendas
    const tiendas = await prisma.tienda.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: {
            personal: true,
            usuarios: true,
            registros: true,
          },
        },
      },
    });

    // 2. Obtener configuraciones de credenciales guardadas en DB
    const configs = await prisma.configuracionSistema.findMany({
      where: {
        clave: 'CREDENCIALES_TIENDA',
      },
    });

    const configMap = new Map<string, any>();
    configs.forEach((c) => {
      try {
        if (c.tiendaId && c.valor) {
          configMap.set(c.tiendaId, JSON.parse(c.valor));
        }
      } catch {}
    });

    // 3. Cargar archivo JSON como respaldo si existe
    let fallbackJsonList: any[] = [];
    try {
      const jsonPath = path.join(process.cwd(), 'CREDENCIALES_TIENDAS.json');
      if (fs.existsSync(jsonPath)) {
        fallbackJsonList = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      }
    } catch (e) {
      console.warn('No se pudo leer CREDENCIALES_TIENDAS.json en GET:', e);
    }

    // 4. Mapear cada tienda con sus credenciales consolidadas
    const tiendasCredenciales = tiendas.map((tienda) => {
      // Prioridad 1: Configuración en DB
      let creds = configMap.get(tienda.id);

      // Prioridad 2: Buscar en JSON por slug o nombre
      if (!creds && fallbackJsonList.length > 0) {
        creds = fallbackJsonList.find(
          (item: any) =>
            item.slug === tienda.slug ||
            item.tienda.toLowerCase().trim() === tienda.nombre.toLowerCase().trim() ||
            (tienda.id === 'tienda-principal' && item.slug === 'sede-principal-beta')
        );
      }

      const adminUser = creds?.adminLogin || `admin.${tienda.slug}@propinas.pe`;
      const superUser = creds?.superLogin || `super.${tienda.slug}@propinas.pe`;
      const modUser = creds?.modLogin || `mod.${tienda.slug}@propinas.pe`;

      return {
        id: tienda.id,
        nombre: tienda.nombre,
        slug: tienda.slug,
        direccion: tienda.direccion || 'Sin dirección registrada',
        telefono: tienda.telefono || 'Sin teléfono',
        estado: tienda.estado,
        modalidad: creds?.modalidad || 'CLASICO',
        stats: {
          personal: tienda._count.personal,
          usuarios: tienda._count.usuarios,
          registros: tienda._count.registros,
        },
        admin: {
          usuario: adminUser,
          usuarioCorto: adminUser.split('@')[0],
          pin: creds?.adminPin || '—',
          rol: 'Administrador',
        },
        supervisor: {
          usuario: superUser,
          usuarioCorto: superUser.split('@')[0],
          pin: creds?.superPin || '—',
          rol: 'Supervisor',
        },
        moderador: {
          usuario: modUser,
          usuarioCorto: modUser.split('@')[0],
          pin: creds?.modPin || '—',
          rol: 'Moderador',
        },
      };
    });

    return NextResponse.json({
      success: true,
      total: tiendasCredenciales.length,
      data: tiendasCredenciales,
    });
  } catch (error: any) {
    console.error('Error al obtener credenciales de tiendas:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno: ' + error.message },
      { status: 500 }
    );
  }
}
