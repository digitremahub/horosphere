import { requireDb } from './db';
import { geocodeLieu } from './geocode';
import tzLookup from 'tz-lookup';

export type Profile = {
  user_id: number;
  prenom: string;
  nom: string;
  date_naissance: string; // 'YYYY-MM-DD'
  heure_naissance: string | null; // 'HH:MM:SS' ou null
  lieu_naissance: string;
  lieu_latitude: number | null;
  lieu_longitude: number | null;
  lieu_timezone: string | null;
  telephone: string | null;
  newsletter_opt_in: boolean;
};

/** Profil de naissance de l'utilisateur — obligatoire dès l'inscription
 * (voir /app/profil). Alimente le thème astral et la personnalisation des
 * lectures. `date_naissance`/`heure_naissance` sont castés en texte pour
 * revenir dans un format directement réutilisable par les <input type="date">
 * et par le calcul du signe (signFromBirthdate). `lieu_latitude/longitude/
 * timezone` alimentent le thème natal réel (ascendant, maisons — voir
 * lib/natal.ts) quand le géocodage a réussi ; `null` sinon, jamais
 * approximés. */
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
      lieu_latitude,
      lieu_longitude,
      lieu_timezone,
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

  // Ne re-géocode que si le lieu a réellement changé (ou n'a jamais été
  // résolu) — évite un appel Nominatim à chaque simple mise à jour du
  // téléphone ou de la newsletter, et reste dans les clous de sa politique
  // d'usage (limitée en volume).
  const existant = await getProfile(userId);
  let latitude = existant?.lieu_latitude ?? null;
  let longitude = existant?.lieu_longitude ?? null;
  let timezone = existant?.lieu_timezone ?? null;

  const lieuChange = !existant || existant.lieu_naissance.trim() !== data.lieuNaissance.trim();
  const jamaisResolu = !latitude || !longitude || !timezone;

  if (lieuChange || jamaisResolu) {
    const point = await geocodeLieu(data.lieuNaissance);
    if (point) {
      latitude = point.lat;
      longitude = point.lon;
      try {
        timezone = tzLookup(point.lat, point.lon);
      } catch {
        timezone = null; // coordonnées valides mais hors zone connue (très rare) — pas de fuseau inventé
      }
    } else {
      latitude = null;
      longitude = null;
      timezone = null;
    }
  }

  await sql`
    INSERT INTO profiles (
      user_id, prenom, nom, date_naissance, heure_naissance, lieu_naissance,
      lieu_latitude, lieu_longitude, lieu_timezone, telephone, newsletter_opt_in
    )
    VALUES (
      ${userId},
      ${data.prenom},
      ${data.nom},
      ${data.dateNaissance},
      ${data.heureNaissance || null},
      ${data.lieuNaissance},
      ${latitude},
      ${longitude},
      ${timezone},
      ${data.telephone || null},
      ${newsletterOptIn}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      prenom = EXCLUDED.prenom,
      nom = EXCLUDED.nom,
      date_naissance = EXCLUDED.date_naissance,
      heure_naissance = EXCLUDED.heure_naissance,
      lieu_naissance = EXCLUDED.lieu_naissance,
      lieu_latitude = EXCLUDED.lieu_latitude,
      lieu_longitude = EXCLUDED.lieu_longitude,
      lieu_timezone = EXCLUDED.lieu_timezone,
      telephone = EXCLUDED.telephone,
      newsletter_opt_in = ${newsletterOptIn},
      updated_at = now()
  `;
}
