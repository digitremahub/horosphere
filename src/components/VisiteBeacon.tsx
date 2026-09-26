'use client';

// Compteur de fréquentation maison — signale chaque changement de page à
// /api/track-visit (voir lib/kpi.ts), pour alimenter le KPI "visites" du
// backoffice (demande explicite de l'utilisateur, restée en attente). Ne
// suit jamais le backoffice lui-même (ses propres visites fausseraient les
// chiffres) ni les routes API.

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

export default function VisiteBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/app/admin') || pathname.startsWith('/api')) return;

    // Lu directement sur window plutôt que via useSearchParams (Next exige
    // sinon un Suspense autour de VisiteBeacon, monté tel quel dans le layout
    // racine) — présent seulement sur la page d'atterrissage d'un lien marqué
    // (voir app/r/[code]/route.ts), absent sur les navigations internes qui
    // suivent : c'est le comportement attendu, pas un bug.
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');

    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        ...(utmSource ? { utmSource } : {}),
        ...(utmMedium ? { utmMedium } : {}),
        ...(utmCampaign ? { utmCampaign } : {}),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
