// Changement d'adresse e-mail depuis /app/profil — l'e-mail sert
// d'identifiant de connexion (lien magique ET mot de passe), d'où la
// vérification d'unicité avant d'écrire (users.email est UNIQUE, mais un
// message clair vaut mieux qu'une erreur de contrainte brute).

import { requireDb } from './db';

export class EmailDejaUtiliseError extends Error {
  constructor() {
    super('Cette adresse e-mail est déjà utilisée par un autre compte.');
  }
}

export async function changerAdresseEmail(userId: number, nouvelEmail: string): Promise<void> {
  const sql = requireDb();
  const existant = await sql<{ id: number }[]>`SELECT id FROM users WHERE email = ${nouvelEmail} AND id != ${userId}`;
  if (existant.length > 0) throw new EmailDejaUtiliseError();
  await sql`UPDATE users SET email = ${nouvelEmail} WHERE id = ${userId}`;
}
