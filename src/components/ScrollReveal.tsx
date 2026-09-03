'use client';

// Révèle son contenu (fondu + léger glissement) au moment où il entre dans
// le viewport, plutôt qu'au chargement de la page — utile pour les sections
// sous la ligne de flottaison (bandeau photo, grilles de tarifs, étapes du
// parcours). Respecte prefers-reduced-motion via la règle globale de
// globals.css (`transition: none !important`), qui fait retomber l'élément
// instantanément sur son état final visible, sans jamais rester bloqué en
// opacité 0.

import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function ScrollReveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Si l'IntersectionObserver n'est pas disponible, ou si le contenu est
    // déjà dans le viewport au montage, on affiche tout de suite plutôt que
    // de risquer un élément bloqué invisible.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);

    // Filet de sécurité : si pour une raison ou une autre l'observer ne se
    // déclenche jamais, on révèle quand même après un délai raisonnable.
    const fallback = setTimeout(() => setVisible(true), 2500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${visible ? ' reveal-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}
