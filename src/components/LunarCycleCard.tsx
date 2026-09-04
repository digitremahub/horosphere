import BrandMark from '@/components/BrandMark';
import MoonPhase from '@/components/MoonPhase';
import { SignCircle } from '@/components/CardParts';
import type { LunarCycleReading } from '@/lib/anthropic';

type SignInfo = { nom: string; symbole: string; dates: string };

// Carte "cycle lunaire" — calée sur la phase lunaire réelle du jour
// (persistée avec la lecture pour un rejeu fidèle dans l'historique).
export default function LunarCycleCard({
  reading,
  signInfo,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: LunarCycleReading;
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--trait)' }}>
        <MoonPhase size={44} phase={reading.phase} />
        <div>
          <div style={{ fontWeight: 700 }}>{reading.phaseLabel}</div>
          <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>{reading.illumination}% illuminée</div>
        </div>
        {signInfo && (
          <div style={{ marginLeft: 'auto' }}>
            <SignCircle symbole={signInfo.symbole} size={36} fontSize="1.1rem" />
          </div>
        )}
      </div>

      {(reading.ascendantSigne || reading.luneSigne) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          {reading.ascendantSigne && (
            <div className="pill" style={{ borderColor: 'var(--lever)', color: 'var(--lever-profond)' }}>
              {reading.ascendantSigne.symbole} Ascendant {reading.ascendantSigne.nom}
            </div>
          )}
          {reading.luneSigne && (
            <div className="pill" style={{ borderColor: 'var(--sauge)', color: 'var(--sauge)' }}>
              {reading.luneSigne.symbole} Lune natale en {reading.luneSigne.nom}
            </div>
          )}
        </div>
      )}

      <p className="display" style={{ fontStyle: 'italic', fontSize: '1.2rem', marginBottom: 16 }}>{reading.titre}</p>

      <p style={{ margin: '0 0 18px', fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--encre)' }}>{reading.interpretation}</p>

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseil}</p>
      </div>
    </div>
  );
}
