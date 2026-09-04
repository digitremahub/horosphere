// Géocodage du lieu de naissance (texte libre saisi dans le profil) en
// coordonnées réelles — nécessaire pour calculer un ascendant ou des
// maisons, ce que la seule date/heure ne permet pas (voir lib/natal.ts).
//
// Nominatim (OpenStreetMap) : gratuit, sans clé API. Sa politique d'usage
// impose un User-Agent identifiable et ~1 requête/seconde maximum — ce
// qui correspond largement à notre volume (un appel par sauvegarde de
// profil, pas un usage en masse).

export type GeoPoint = { lat: number; lon: number; displayName: string };

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Horosphere/1.0 (contact@horosphere.fr)';

export async function geocodeLieu(lieu: string): Promise<GeoPoint | null> {
  const query = lieu.trim();
  if (!query) return null;

  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr' },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const first = rows[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lon: parseFloat(first.lon), displayName: first.display_name };
  } catch (err) {
    console.error('geocodeLieu failed', err);
    return null;
  }
}
