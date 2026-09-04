import { requireDb } from './db';

export type Profile = {
  user_id: number;
  prenom: string;
  nom: string;
  date_naissance: string; // 'YYYY-MM-DD'
  heure_naissance: string | null; // 'HH:MM:SS' ou null
  lieu_naissance: string;
  telephone: string | null;
  newsletter_opt_in: boolean;
};

/** Profil de naissance de l'utilisateur — obligatoire dès l'inscription
 * (voir /app/profil). Alimente le thème astral et la personnalisation des
 * lectures. `date_naissance`/`heure_naissance` sont castés en texte pour
 * revenir dans un format directement réutilisable par les <input type="date">
 * et par le calcul du signe (signFromBirthdate). */
export async function getProfile(userId: number): Promise<Profile | null> {
  const sql = requireDb();
  const rows = await sql<Profile[]>`
    SELECT
      user_id,
      prenom,
      nom,
      date_naissance::text AS date_naissance,
      heure_naissance::text AS heure_naissance,
      lieu_naissance,
      telephone,
      newsletter_opt_in
    FROM profiles
    WHERE user_id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function saveProfile(
  userId: number,
  data: {
    prenom: string;
    nom: string;
    dateNaissance: string;
    heureNaissance?: string | null;
    lieuNaissance: string;
    telephone?: string | null;
    newsletterOptIn?: boolean;
  }
) {
  const sql = requireDb();
  const newsletterOptIn = data.newsletterOptIn ?? true;
  await sql`
    INSERT INTO profiles (user_id, prenom, nom, date_naissance, heure_naissance, lieu_naissance, telephone, newsletter_opt_in)
    VALUES (
      ${userId},
      ${data.prenom},
      ${data.nom},
      ${data.dateNaissance},
      ${data.heureNaissance || null},
      ${data.lieuNaissance},
      ${data.telephone || null},
      ${newsletterOptIn}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      prenom = EXCLUDED.prenom,
      nom = EXCLUDED.nom,
      date_naissance = EXCLUDED.date_naissance,
      heure_naissance = EXCLUDED.heure_naissance,
      lieu_naissance = EXCLUDED.lieu_naissance,
      telephone = EXCLUDED.telephone,
      newsletter_opt_in = ${newsletterOptIn},
      updated_at = now()
  `;
}
