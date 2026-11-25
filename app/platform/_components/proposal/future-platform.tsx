"use client";

import { useState } from "react";

import type { FutureModule } from "@lib/platform/proposals";

/**
 * The architecture as a picture you can touch: the foundation, and the
 * modules it could one day carry. Choosing a module says what it would be.
 * None of them is in the current investment, and the picture says so.
 */
export function FuturePlatform({
  foundation,
  modules,
  exclusion,
}: {
  foundation: { name: string; summary: string };
  modules: FutureModule[];
  exclusion: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = modules.find((module) => module.key === selected) ?? null;

  return (
    <div className="pd-arch">
      <div className="pd-arch-foundation" aria-label="Foundation">
        <span className="pd-arch-tag">Included · the foundation</span>
        <h2>{foundation.name}</h2>
        <p>{foundation.summary}</p>
      </div>

      <div className="pd-arch-rail" aria-hidden="true" />

      <ul className="pd-arch-modules" aria-label="Potential future modules">
        {modules.map((module) => (
          <li key={module.key}>
            <button
              type="button"
              className="pd-arch-module"
              aria-pressed={selected === module.key}
              onClick={() => setSelected(selected === module.key ? null : module.key)}
            >
              <span className="pd-arch-stem" aria-hidden="true" />
              <span className="pd-arch-module-name">{module.name}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="pd-arch-detail" aria-live="polite">
        {current ? (
          <>
            <span className="pd-arch-tag pd-arch-tag-future">Future module · not included</span>
            <h3>{current.name}</h3>
            <p>{current.summary}</p>
          </>
        ) : (
          <p className="pd-arch-hint">
            Choose a module to see what it would add. {exclusion}
          </p>
        )}
      </div>
    </div>
  );
}
