import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sistema-propinas-secret-key-default-change-me'
);

export interface SessionUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  esMaestro: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Soporte directo para hash bcrypt o texto plano en migración inicial si aplica
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    return await bcrypt.compare(password, hash);
  }
  return password === hash;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch (e) {
    return null;
  }
}
