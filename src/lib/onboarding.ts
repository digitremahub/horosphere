// Vidéo d'onboarding — affichée une seule fois, juste après l'inscription
// (voir profiles.a_vu_onboarding, components/OnboardingVideoModal.tsx).

import { requireDb } from './db';

export async function markOnboardingSeen(userId: number): Promise<void> {
  const sql = requireDb();
  await sql`UPDATE profiles SET a_vu_onboarding = true WHERE user_id = ${userId}`;
}
