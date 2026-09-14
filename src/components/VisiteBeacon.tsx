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
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
