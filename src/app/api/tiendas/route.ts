import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
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

    // 3. Generar credenciales de acceso seguras (Admin, Supervisor, Moderador)
    const genPin = () => crypto.randomBytes(3).toString('hex').toUpperCase();
    const adminPin = genPin();
    const superPin = genPin();
    const modPin = genPin();

    const adminEmail = `admin.${nuevaTienda.slug}@propinas.pe`;
    const superEmail = `super.${nuevaTienda.slug}@propinas.pe`;
    const modEmail = `mod.${nuevaTienda.slug}@propinas.pe`;

    const adminHash = await hashPassword(adminPin);
    const superHash = await hashPassword(superPin);
    const modHash = await hashPassword(modPin);

    const slugUpper = nuevaTienda.slug.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    await prisma.usuario.createMany({
      data: [
        {
          id: `USR-ADM-${slugUpper}`,
          nombre: `Admin ${nuevaTienda.nombre}`,
          email: adminEmail,
          passwordHash: adminHash,
          rol: 'Administrador',
          estado: 'Activo',
          tiendaId: nuevaTienda.id,
        },
        {
          id: `USR-SUP-${slugUpper}`,
          nombre: `Supervisor ${nuevaTienda.nombre}`,
          email: superEmail,
          passwordHash: superHash,
          rol: 'Supervisor',
          estado: 'Activo',
          tiendaId: nuevaTienda.id,
        },
        {
          id: `USR-MOD-${slugUpper}`,
          nombre: `Moderador ${nuevaTienda.nombre}`,
          email: modEmail,
          passwordHash: modHash,
          rol: 'Moderador',
          estado: 'Activo',
          tiendaId: nuevaTienda.id,
        },
      ],
    });

    const credsTienda = {
      tienda: nuevaTienda.nombre,
      slug: nuevaTienda.slug,
      modalidad: 'CLASICO',
      adminLogin: adminEmail,
      adminPin: adminPin,
      superLogin: superEmail,
      superPin: superPin,
      modLogin: modEmail,
      modPin: modPin,
    };

    // Guardar credenciales en ConfiguracionSistema
    await prisma.configuracionSistema.upsert({
      where: {
        clave_tiendaId: {
          clave: 'CREDENCIALES_TIENDA',
          tiendaId: nuevaTienda.id,
        },
      },
      update: { valor: JSON.stringify(credsTienda) },
      create: {
        clave: 'CREDENCIALES_TIENDA',
        valor: JSON.stringify(credsTienda),
        tiendaId: nuevaTienda.id,
      },
    });

    // Intentar actualizar CREDENCIALES_TIENDAS.json si el filesystem lo permite
    try {
      const jsonPath = path.join(process.cwd(), 'CREDENCIALES_TIENDAS.json');
      if (fs.existsSync(jsonPath)) {
        const fileContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const idx = fileContent.findIndex((c: any) => c.slug === nuevaTienda.slug);
        if (idx >= 0) {
          fileContent[idx] = credsTienda;
        } else {
          fileContent.push(credsTienda);
        }
        fs.writeFileSync(jsonPath, JSON.stringify(fileContent, null, 2), 'utf8');
      }
    } catch (fsErr) {
      console.warn('No se pudo escribir en CREDENCIALES_TIENDAS.json (ambiente solo lectura):', fsErr);
    }

    await logAuditoria(
      'Creación de Tienda',
      `Nueva tienda/sucursal creada: "${nuevaTienda.nombre}" (${nuevaTienda.slug}) con usuarios y plantilla base estandarizada`,
      user.nombre
    );

    return NextResponse.json({
      success: true,
      message: `Restaurante/Tienda "${nuevaTienda.nombre}" creado exitosamente con usuarios y credenciales configuradas.`,
      tienda: nuevaTienda,
      credenciales: credsTienda,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
