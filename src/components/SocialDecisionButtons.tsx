'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SocialDecisionButtons({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: 'approve' | 'reject') {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/social/${id}/decision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        setLoading(null);
        return;
      }
      router.refresh();
    } catch {
      setError('Erreur réseau, réessaie.');
      setLoading(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => decide('approve')}
          disabled={loading !== null}
          className="btn btn-primary"
          style={{ padding: '9px 18px', fontSize: '0.84rem' }}
        >
          {loading === 'approve' ? 'Un instant…' : '✓ Approuver'}
        </button>
        <button
          onClick={() => decide('reject')}
          disabled={loading !== null}
          className="btn btn-ghost"
          style={{ padding: '9px 18px', fontSize: '0.84rem' }}
        >
          {loading === 'reject' ? 'Un instant…' : '✕ Rejeter'}
        </button>
      </div>
      {error && <p style={{ fontSize: '0.78rem', color: 'var(--lever-profond)', marginTop: 8 }}>{error}</p>}
    </div>
  );
}
