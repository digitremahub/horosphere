'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';

export default function PricingButton({
  kind,
  slug,
  loggedIn,
  configured,
  label = 'Choisir',
}: {
  kind: 'pack' | 'sub';
  slug: string;
  loggedIn: boolean;
  configured: boolean;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    if (!loggedIn) {
      router.push('/connexion');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Impossible de démarrer le paiement.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Erreur réseau, réessaie.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || !configured}
        className="btn btn-primary"
        style={{ width: '100%', opacity: configured ? 1 : 0.55 }}
      >
        {!configured ? 'Bientôt disponible' : loading ? 'Un instant…' : label}
      </button>
      {error && <p style={{ fontSize: '0.76rem', color: 'var(--lever-profond)', marginTop: 8 }}>{error}</p>}
    </div>
  );
}
