'use client';

import { useState } from 'react';

// Bandeau de partage volontairement visuel — retour utilisateur sur la
// première version (un simple lien texte "btn-ghost" perdu au milieu de la
// carte) : "on ne lit rien, ça fait croire à un lien de partage
// supplémentaire que l'on va zapper". Fond de couleur, titre + sous-titre
// explicites, bouton à fort contraste — pensé pour être vu, pas juste
// techniquement présent. Réutilisé tel quel sur une lecture fraîche
// (Dashboard) et sur une entrée de l'historique.
export default function ShareButton({
  shareText,
  shareUrl,
  title,
  subtitle,
  label,
  copiedLabel,
  imageUrl,
}: {
  shareText: string;
  shareUrl: string;
  title: string;
  subtitle: string;
  label: string;
  copiedLabel: string;
  // Carte visuelle de la lecture (voir /api/og/partage-lecture) — décision
  // stratégique explicite : le bouche-à-oreille d'une vraie personne qui
  // partage SON résultat compte plus que le compte Horosphère qui poste
  // dans le vide. Sans image (paramètre absent, ou navigateur incapable de
  // partager un fichier), on retombe sur le partage texte historique.
  imageUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function partager() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      if (imageUrl && navigator.canShare) {
        try {
          const reponse = await fetch(imageUrl);
          const blob = await reponse.blob();
          const fichier = new File([blob], 'horosphere.jpg', { type: 'image/jpeg' });
          if (navigator.canShare({ files: [fichier] })) {
            // L'URL de parrainage reste dans le texte (le champ `url` du
            // partage n'est pas fiable une fois des fichiers attachés,
            // certaines applications cibles l'ignorent).
            await navigator.share({ title: 'Horosphère', text: `${shareText} ${shareUrl}`, files: [fichier] });
            return;
          }
        } catch {
          // Récupération de l'image ou partage refusé — on retombe sur le
          // partage texte simple ci-dessous plutôt que de bloquer la personne.
        }
      }
      try {
        await navigator.share({ title: 'Horosphère', text: shareText, url: shareUrl });
      } catch {
        // Partage annulé par la personne (ou refusé par l'OS) — rien à faire.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission
      // refusée) — pas de repli supplémentaire au-delà de l'échec silencieux.
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: '16px 18px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, var(--lever) 0%, var(--lever-profond) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ color: '#fff' }}>
        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{title}</div>
        <div style={{ fontSize: '0.78rem', opacity: 0.92 }}>{subtitle}</div>
      </div>
      <button
        type="button"
        onClick={partager}
        style={{
          padding: '10px 20px',
          borderRadius: 10,
          border: 'none',
          background: '#fff',
          color: 'var(--lever-profond)',
          fontWeight: 700,
          fontSize: '0.86rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {copied ? copiedLabel : label}
      </button>
    </div>
  );
}
