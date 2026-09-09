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
}: {
  shareText: string;
  shareUrl: string;
  title: string;
  subtitle: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function partager() {
    if (typeof navigator !== 'undefined' && navigator.share) {
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
