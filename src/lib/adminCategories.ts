// Catégories spéciales assignables depuis le backoffice — influenceur et
// bêta testeur, avec un bonus de crédits à l'attribution (comme demandé :
// "qui ont plus de crédits"). Stockée sur users.categorie (colonne
// auto-créée, voir lib/admin.ts) plutôt qu'une table à part : une seule
// catégorie à la fois par personne, pas d'historique à conserver.

import { requireDb } from './db';
import { grantCredits } from './credits';
import { CREDIT_EXPIRY_DAYS } from './pricing';

export type Categorie = 'influenceur' | 'beta_testeur';

export const CATEGORIE_LABEL: Record<Categorie, string> = {
  influenceur: 'Influenceur',
  beta_testeur: 'Bêta testeur',
};

// Bonus accordé une seule fois, au moment où la catégorie est assignée (pas
// à chaque nouvel enregistrement du formulaire — voir la vérification de
// changement ci-dessous). Ajustable librement, ce ne sont pas des valeurs
// figées ailleurs dans le code.
const CATEGORIE_BONUS: Record<Categorie, number> = {
  influenceur: 100,
  beta_testeur: 50,
};

export type DefinirCategorieResult = { ok: boolean; message: string };

export async function definirCategorieUtilisateur(userId: number, categorie: Categorie | null): Promise<DefinirCategorieResult> {
  const sql = requireDb();
  await sql.unsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS categorie TEXT`);

  const [row] = await sql<{ categorie: string | null }[]>`SELECT categorie FROM users WHERE id = ${userId}`;
  if (!row) {
    return { ok: false, message: 'Utilisateur introuvable.' };
  }
  if (row.categorie === categorie) {
    return { ok: true, message: 'Aucun changement (déjà cette catégorie).' };
  }

  await sql`UPDATE users SET categorie = ${categorie} WHERE id = ${userId}`;

  if (!categorie) {
    return { ok: true, message: 'Catégorie retirée.' };
  }

  const bonus = CATEGORIE_BONUS[categorie];
  await grantCredits(userId, bonus, `admin:categorie-${categorie}`, CREDIT_EXPIRY_DAYS);
  return { ok: true, message: `Catégorie "${CATEGORIE_LABEL[categorie]}" assignée — ${bonus} crédits offerts.` };
}
