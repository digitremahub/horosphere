export function SignCircle({ symbole, size = 48, fontSize = '1.4rem' }: { symbole: string; size?: number; fontSize?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--brume)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize, color: 'var(--lever-profond)' }}>
      {symbole}
    </div>
  );
}

export function Field({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sourdine)', marginBottom: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        {label}
      </div>
      <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--ombre)' }}>{text}</p>
    </div>
  );
}

export function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
        <span style={{ color: 'var(--ombre)' }}>{label}</span>
        <span className="mono">{value}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--brume)', overflow: 'hidden' }}>
        <div className="meter-fill" style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function Lucky({ label, value, mono, divider }: { label: string; value: string; mono?: boolean; divider?: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 8px', borderLeft: divider ? '1px solid var(--trait)' : 'none' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sourdine)', marginBottom: 5 }}>{label}</div>
      <div className={mono ? 'mono' : undefined} style={{ fontSize: '0.86rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
