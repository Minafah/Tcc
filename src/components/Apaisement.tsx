// Exercices d'apaisement : respiration guidée et ancrage 5-4-3-2-1.
import { useEffect, useState } from 'react';

const INSPIRE_MS = 4000;
const EXPIRE_MS = 6000;

export function Respiration() {
  const [phase, setPhase] = useState<'inspire' | 'expire'>('expire');
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    const t = setTimeout(
      () => {
        setPhase((p) => (p === 'inspire' ? 'expire' : 'inspire'));
        if (phase === 'expire') setCycles((c) => c + 1);
      },
      phase === 'inspire' ? INSPIRE_MS : cycles === 0 ? 600 : EXPIRE_MS,
    );
    return () => clearTimeout(t);
  }, [phase, cycles]);

  return (
    <div className="respiration" aria-live="polite">
      <div
        className={`bulle ${phase === 'inspire' ? 'inspire' : ''}`}
        style={{ transitionDuration: `${phase === 'inspire' ? INSPIRE_MS : EXPIRE_MS}ms` }}
      />
      <p className="question">{phase === 'inspire' ? 'Inspire doucement…' : 'Expire lentement…'}</p>
      <p className="doux petit">Suis la bulle. Quelques cycles suffisent.</p>
    </div>
  );
}

export function Ancrage() {
  return (
    <details className="carte">
      <summary>Ancrage 5-4-3-2-1</summary>
      <p className="doux">Prends ton temps pour chaque étape, sans chercher à bien faire.</p>
      <ul>
        <li>
          <strong>5</strong> choses que tu vois autour de toi
        </li>
        <li>
          <strong>4</strong> choses que tu peux toucher
        </li>
        <li>
          <strong>3</strong> sons que tu entends
        </li>
        <li>
          <strong>2</strong> odeurs que tu sens
        </li>
        <li>
          <strong>1</strong> goût dans ta bouche, ou une chose que tu apprécies chez toi
        </li>
      </ul>
    </details>
  );
}
