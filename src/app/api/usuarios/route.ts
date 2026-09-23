import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logAuditoria } from '@/lib/auditoria';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { id: 'asc' },
    });

    const lista = usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      estado: u.estado,
      esMaestro: u.esMaestro || u.id === 'USR-MASTER',
    }));

    return NextResponse.json(lista);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const usuarioActual = user?.nombre || 'Sistema';

    const payload = await request.json();

    if (payload.id === 'USR-MASTER' && user?.id !== 'USR-MASTER') {
      return NextResponse.json(
        {
          success: false,
          message:
            'La Cuenta Maestra (USR-MASTER) está protegida y es inmutable por política de seguridad.',
        },
        { status: 403 }
      );
    }

    const { id, nombre, email, password, rol, estado } = payload;
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanNombre = String(nombre || '').trim();
    const cleanRol = String(rol || 'Moderador').trim();
    const cleanEstado = String(estado || 'Activo').trim();

    if (!cleanNombre || !cleanEmail) {
      return NextResponse.json(
        { success: false, message: 'Nombre y correo electrónico son requeridos.' },
        { status: 400 }
      );
    }

    // Si ya existe por ID
    let usuarioExistente = id ? await prisma.usuario.findUnique({ where: { id } }) : null;
    if (!usuarioExistente) {
      usuarioExistente = await prisma.usuario.findUnique({ where: { email: cleanEmail } });
    }

    if (usuarioExistente) {
      const updateData: any = {
        nombre: cleanNombre,
        email: cleanEmail,
        rol: cleanRol,
        estado: cleanEstado,
      };

      if (password && String(password).trim() !== '') {
        updateData.passwordHash = await hashPassword(String(password).trim());
      }

      await prisma.usuario.update({
        where: { id: usuarioExistente.id },
        data: updateData,
      });

      await logAuditoria(
        'Modificación de Usuario',
        `Usuario actualizado: ${cleanEmail} (Rol: ${cleanRol})`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: 'Usuario actualizado exitosamente.',
      });
    } else {
      const total = await prisma.usuario.count();
      const nextNum = total < 10 ? `00${total}` : `0${total}`;
      const nuevoId = id && id.startsWith('USR-') ? id : `USR-${nextNum}`;
      const passwordHash = await hashPassword(password ? String(password).trim() : '1234');

      const nuevoUsuario = await prisma.usuario.create({
        data: {
          id: nuevoId,
          nombre: cleanNombre,
          email: cleanEmail,
          passwordHash,
          rol: cleanRol,
          estado: cleanEstado,
          esMaestro: false,
        },
      });

      await logAuditoria(
        'Alta de Usuario',
        `Nuevo usuario creado: ${cleanEmail} (Rol: ${cleanRol})`,
        usuarioActual
      );

      return NextResponse.json({
        success: true,
        message: `Usuario creado exitosamente con ID: ${nuevoUsuario.id}`,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
