import MoonPhase, { moonPhaseInfo } from './MoonPhase';

export default function MoonOfTheDay() {
  const info = moonPhaseInfo();

  return (
    <div
      className="card moon-of-day"
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 32,
        alignItems: 'center',
        padding: '32px 36px',
        overflow: 'visible',
      }}
    >
      <div className="moon-of-day-icon" style={{ display: 'flex', justifyContent: 'center' }} aria-hidden="true">
        <MoonPhase size={140} />
      </div>
      <div>
        <div className="pill" style={{ marginBottom: 12, textTransform: 'capitalize' }}>{info.dateLabel}</div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: 10 }}>{info.label}</h3>
        <p style={{ color: 'var(--ombre)', fontSize: '0.98rem', marginBottom: 10 }}>{info.influence}</p>
        <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--sourdine)' }}>
          {info.illumination}% de la lune est visible cette nuit
        </div>
      </div>
      <style>{`
        @media (max-width: 560px){
          .moon-of-day{ grid-template-columns: 1fr !important; text-align: center; }
        }
      `}</style>
    </div>
  );
}
