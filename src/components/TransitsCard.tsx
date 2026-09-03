import BrandMark from '@/components/BrandMark';
import { SignCircle } from '@/components/CardParts';
import type { TransitsReading } from '@/lib/anthropic';

type SignInfo = { nom: string; symbole: string; dates: string };

// Carte "transits planétaires" — met en avant les planètes réellement
// pertinentes du jour (Soleil, Lune, planète maîtresse du signe), calculées
// via lib/planets.ts et persistées avec la lecture pour un rejeu fidèle.
export default function TransitsCard({
  reading,
  signInfo,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: TransitsReading;
  signInfo: SignInfo | null;
  dateLabel?: string;
  creditsSpent?: number;
  cornerArc?: boolean;
}) {
  return (
    <div className="card card-enter" style={{ padding: '26px 24px', overflow: 'visible' }}>
      {cornerArc && (
        <div style={{ position: 'absolute', top: -13, right: -13, pointerEvents: 'none' }} aria-hidden="true">
          <BrandMark size={60} />
        </div>
      )}

      {(dateLabel || creditsSpent !== undefined) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          {dateLabel && <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{dateLabel}</span>}
          {creditsSpent !== undefined && (
            <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>-{creditsSpent} cr.</span>
          )}
        </div>
      )}

      {reading.mode === 'demo' && (
        <div className="pill" style={{ marginBottom: 14, borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
          Mode démo{dateLabel ? '' : ' — clé IA non configurée'}
        </div>
      )}

      {signInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--trait)' }}>
          <SignCircle symbole={signInfo.symbole} />
          <div>
            <div style={{ fontWeight: 700 }}>Transits planétaires</div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{signInfo.nom}</div>
          </div>
        </div>
      )}

      <div className="lucky-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${reading.planetesEnFocus.length}, 1fr)`, gap: 10, marginBottom: 18 }}>
        {reading.planetesEnFocus.map((p) => (
          <div key={p.nom} style={{ background: 'var(--brume)', border: '1px solid var(--trait)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', color: 'var(--lever-profond)', marginBottom: 4 }}>{p.glyphe}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{p.nom}</div>
            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--sourdine)' }}>{p.signe}</div>
          </div>
        ))}
      </div>

      <p className="display" style={{ fontStyle: 'italic', fontSize: '1.2rem', marginBottom: 16 }}>{reading.titre}</p>

      <p style={{ margin: '0 0 18px', fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--encre)' }}>{reading.interpretation}</p>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseil}</p>
      </div>
    </div>
  );
}
