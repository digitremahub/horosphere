import BrandMark from '@/components/BrandMark';
import { Field, SignCircle } from '@/components/CardParts';
import type { CompatibilityReading } from '@/lib/anthropic';

type SignInfo = { nom: string; symbole: string; dates: string };
type AutreSigne = { key: string; nom: string; symbole: string; prenom?: string };

// Carte de compatibilité amoureuse — la seule lecture qui compare le signe
// de l'utilisateur (issu du profil) à celui d'une seconde personne, entrée
// par son prénom et sa date de naissance (le signe est toujours recalculé
// côté serveur). Réutilisée pour le résultat frais (Dashboard) et
// l'historique.
export default function CompatibilityCard({
  reading,
  signInfo,
  autreSigne,
  dateLabel,
  creditsSpent,
  cornerArc = true,
}: {
  reading: CompatibilityReading;
  signInfo: SignInfo | null;
  autreSigne: AutreSigne | null;
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
          {dateLabel && (
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--sourdine)' }}>
              {dateLabel}
            </span>
          )}
          {creditsSpent !== undefined && (
            <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--lever-profond)', whiteSpace: 'nowrap' }}>
              -{creditsSpent} cr.
            </span>
          )}
        </div>
      )}

      {reading.mode === 'demo' && (
        <div className="pill" style={{ marginBottom: 14, borderColor: 'var(--ambre)', color: 'var(--ambre)' }}>
          Mode démo{dateLabel ? '' : ' — clé IA non configurée'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--trait)' }}>
        <div style={{ textAlign: 'center' }}>
          <SignCircle symbole={signInfo?.symbole ?? '?'} />
          <div style={{ fontSize: '0.76rem', marginTop: 6 }}>{signInfo?.nom ?? 'Vous'}</div>
        </div>
        <div className="display" style={{ fontStyle: 'italic', fontSize: '1.6rem', color: 'var(--lever-profond)' }}>+</div>
        <div style={{ textAlign: 'center' }}>
          <SignCircle symbole={autreSigne?.symbole ?? '?'} />
          <div style={{ fontSize: '0.76rem', marginTop: 6 }}>{autreSigne?.prenom || autreSigne?.nom || '—'}</div>
          {autreSigne?.prenom && (
            <div className="mono" style={{ fontSize: '0.64rem', color: 'var(--sourdine)' }}>{autreSigne.nom}</div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="mono" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--lever-profond)' }}>{reading.scoreGlobal}%</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--sourdine)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Compatibilité</div>
      </div>

      <p className="display" style={{ fontStyle: 'italic', fontSize: '1.1rem', marginBottom: 16, textAlign: 'center' }}>{reading.resume}</p>

      <Field label="Points forts" color="var(--sauge)" text={reading.pointsForts} />
      <Field label="Point de friction" color="var(--lever)" text={reading.pointsFriction} />
      <Field label="Amour" color="var(--prune)" text={reading.amour} />
      <Field label="Communication" color="var(--ambre)" text={reading.communication} />

      <div style={{ background: 'var(--brume)', border: '1px dashed var(--trait)', borderRadius: 14, padding: '13px 16px' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--lever-profond)', marginBottom: 4 }}>Conseil pour ce duo</div>
        <p style={{ margin: 0, fontSize: '0.92rem' }}>{reading.conseil}</p>
      </div>
    </div>
  );
}
