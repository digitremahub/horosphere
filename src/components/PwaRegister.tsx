'use client';

import { useEffect } from 'react';

// Enregistre le service worker (voir /public/sw.js) — condition
// d'installabilité de la PWA sur la plupart des navigateurs. Composant
// séparé sans rendu visuel : le enregistrement doit se faire côté client,
// après hydratation, sans bloquer l'affichage de la page.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Échec silencieux (navigateur sans support, contexte non sécurisé en
      // dev derrière http) — l'appli reste utilisable sans le mode PWA.
    });
  }, []);

  return null;
}
