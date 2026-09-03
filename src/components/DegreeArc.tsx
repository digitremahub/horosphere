'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

type DegreeArcProps = {
  /** Angle de départ en degrés, 0 = haut (12h), sens horaire. */
  startAngle?: number;
  /** Angle de fin en degrés. Doit être différent de startAngle : l'arc est toujours partiel. */
  endAngle?: number;
  /** Taille du SVG en pixels (carré). */
  size?: number;
  /** Couleur du trait. */
  strokeColor?: string;
  /** Nombre de graduations perpendiculaires le long de l'arc (3 à 5). */
  ticks?: number;
  /** Étiquette numérique optionnelle affichée près de l'extrémité de l'arc (ex. "14°32′"). */
  showTick?: string | boolean;
  /** Épaisseur du trait. */
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
};

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const diff = endAngle - startAngle;
  const largeArcFlag = Math.abs(diff) <= 180 ? '0' : '1';
  const sweepFlag = diff >= 0 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, sweepFlag, end.x, end.y].join(' ');
}

export default function DegreeArc({
  startAngle = -70,
  endAngle = 70,
  size = 160,
  strokeColor = 'var(--ambre)',
  ticks = 4,
  showTick,
  strokeWidth = 1.75,
  className,
  style,
}: DegreeArcProps) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [length, setLength] = useState(0);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - Math.max(10, strokeWidth * 6);

  const start = Math.min(startAngle, endAngle);
  const end = Math.max(startAngle, endAngle);
  const d = describeArc(cx, cy, r, start, end);

  useEffect(() => {
    if (pathRef.current) {
      setLength(pathRef.current.getTotalLength());
    }
  }, [d]);

  useEffect(() => {
    if (!length) return;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (reduceMotion) {
      setDrawn(true);
      return;
    }

    const raf = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf);
  }, [length]);

  const tickMarks = [];
  const tickCount = Math.max(3, Math.min(5, ticks));
  for (let i = 0; i < tickCount; i++) {
    const t = tickCount === 1 ? 0.5 : i / (tickCount - 1);
    const angle = start + (end - start) * t;
    const inner = polarToCartesian(cx, cy, r - 4, angle);
    const outer = polarToCartesian(cx, cy, r + 4, angle);
    tickMarks.push(
      <line
        key={i}
        x1={inner.x}
        y1={inner.y}
        x2={outer.x}
        y2={outer.y}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={drawn ? 0.85 : 0}
        style={{ transition: 'opacity 300ms ease-out', transitionDelay: '350ms' }}
      />
    );
  }

  const labelPos = polarToCartesian(cx, cy, r + 16, end);
  const labelText = typeof showTick === 'string' ? showTick : showTick ? `${Math.round(end)}°` : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{
          strokeDasharray: length || 1,
          strokeDashoffset: drawn ? 0 : length || 1,
          transition: 'stroke-dashoffset 550ms ease-out',
        }}
      />
      {tickMarks}
      {labelText && (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fontFamily="var(--font-data)"
          fontSize={size * 0.075}
          fill="var(--ambre)"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity={drawn ? 1 : 0}
          style={{ transition: 'opacity 300ms ease-out', transitionDelay: '450ms' }}
        >
          {labelText}
        </text>
      )}
    </svg>
  );
}
