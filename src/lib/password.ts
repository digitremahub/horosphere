// Connexion par mot de passe, en plus du lien magique par e-mail — voir
// lib/auth.ts (provider Credentials) et /app/profil (définir/changer son
// mot de passe une fois connecté). Pas d'auto-inscription par mot de passe
// sans passer par le lien magique au moins une fois : ça évite qu'un tiers
// pose un mot de passe sur le compte de quelqu'un d'autre en devinant
// seulement son e-mail.

import bcrypt from 'bcryptjs';
import { requireDb } from './db';

const MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`;
  }
  return null;
}

export async function setUserPassword(userId: number, password: string): Promise<void> {
  const sql = requireDb();
  const hash = await bcrypt.hash(password, 10);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
}

export async function userHasPassword(userId: number): Promise<boolean> {
  const sql = requireDb();
  const rows = await sql<{ password_hash: string | null }[]>`
    SELECT password_hash FROM users WHERE id = ${userId}
  `;
  return Boolean(rows[0]?.password_hash);
}
