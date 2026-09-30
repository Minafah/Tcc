// Petits composants d'interface réutilisés par les écrans.
import type { ReactNode } from 'react';

export function Entete(props: { titre?: string; onRetour?: () => void; onSos: () => void; droite?: ReactNode }) {
  return (
    <header className="entete">
      {props.onRetour ? (
        <button className="icone" onClick={props.onRetour} aria-label="Retour">
          ‹
        </button>
      ) : null}
      <h1>{props.titre}</h1>
      {props.droite}
      <button className="bouton-sos" onClick={props.onSos} aria-label="SOS, ressources d'urgence">
        SOS
      </button>
    </header>
  );
}

export function Curseur(props: {
  libelle: string;
  valeur: number;
  onChange: (v: number) => void;
  unite?: string;
  aide?: string;
  /** Petit visage qui suit la valeur (ex. intensité de l'émotion). */
  emoji?: string;
}) {
  return (
    <div className="curseur">
      <div className="curseur-entete">
        <span>{props.libelle}</span>
        <span className="curseur-valeur">
          {props.emoji ? <span aria-hidden="true">{props.emoji} </span> : null}
          {props.valeur}
          {props.unite ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={props.valeur}
        onChange={(e) => props.onChange(Number(e.target.value))}
        aria-label={props.libelle}
      />
      {props.aide ? <span className="doux petit">{props.aide}</span> : null}
    </div>
  );
}

export function Puces<T extends string>(props: {
  options: { valeur: T; libelle: string; desactive?: boolean }[];
  valeur: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="puces" role="group">
      {props.options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          className="puce"
          aria-pressed={props.valeur === o.valeur}
          disabled={o.desactive}
          onClick={() => props.onChange(o.valeur)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}

export function Progression(props: { valeur: number; max: number }) {
  const pct = props.max === 0 ? 0 : Math.round((props.valeur / props.max) * 100);
  return (
    <div className="progression" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Deux barres « avant / après » sur 0-100. */
export function AvantApres(props: { titre?: string; avant: number; apres: number | null; unite?: string }) {
  const u = props.unite ?? '';
  return (
    <div className="comparaison">
      {props.titre ? <h3>{props.titre}</h3> : null}
      <div className="barre">
        <span className="doux">Avant</span>
        <div className="barre-fond">
          <div style={{ width: `${props.avant}%`, background: 'var(--avant)' }} />
        </div>
        <span>
          {props.avant}
          {u}
        </span>
      </div>
      {props.apres !== null ? (
        <div className="barre">
          <span className="doux">Après</span>
          <div className="barre-fond">
            <div style={{ width: `${props.apres}%`, background: 'var(--accent)' }} />
          </div>
          <span>
            {props.apres}
            {u}
          </span>
        </div>
      ) : null}
    </div>
  );
}
