/**
 * The three drinks, each finished in a 12 ounce paper cup.
 *
 * Drawn rather than photographed so the set is cohesive, sharp on any screen
 * and a few kilobytes in total. Same cup, same light, same angle; what changes
 * is what sits on top and the sleeve that says which drink it is. A real
 * photograph of each can replace these one for one later without the menu
 * changing shape.
 */

type Art = "shine" | "honeycomb" | "northwoods";

const TOPS: Record<Art, { foam: string; foamShade: string; sleeve: string; sleeveInk: string }> = {
  shine: { foam: "#f6eddc", foamShade: "#e7d7b8", sleeve: "#f1e4c8", sleeveInk: "#b8892e" },
  honeycomb: { foam: "#f1dfb9", foamShade: "#dcc08a", sleeve: "#e9b949", sleeveInk: "#8a5a12" },
  northwoods: { foam: "#fbf8f2", foamShade: "#e6ded0", sleeve: "#4a533e", sleeveInk: "#e9dfc9" },
};

export function CoffeeArt({ art, label }: { art: string; label: string }) {
  const kind: Art = art === "honeycomb" || art === "northwoods" ? art : "shine";
  const t = TOPS[kind];
  const id = `cup-${kind}`;

  return (
    <svg className="gd-cup" viewBox="0 0 160 200" role="img" aria-label={`${label}, in a 12 ounce paper cup`}>
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.62" stopColor="#f7f4ee" />
          <stop offset="1" stopColor="#e4ded3" />
        </linearGradient>
        <linearGradient id={`${id}-sleeve`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={t.sleeve} />
          <stop offset="0.7" stopColor={t.sleeve} />
          <stop offset="1" stopColor={t.sleeve} stopOpacity="0.78" />
        </linearGradient>
        <radialGradient id={`${id}-foam`} cx="0.42" cy="0.35" r="0.75">
          <stop offset="0" stopColor={t.foam} />
          <stop offset="1" stopColor={t.foamShade} />
        </radialGradient>
        <clipPath id={`${id}-body`}>
          <path d="M31 44 L129 44 L115 188 Q114 192 110 192 L50 192 Q46 192 45 188 Z" />
        </clipPath>
      </defs>

      {/* shadow */}
      <ellipse cx="80" cy="193" rx="44" ry="5" fill="#2f3528" opacity="0.12" />

      {/* cup */}
      <path d="M31 44 L129 44 L115 188 Q114 192 110 192 L50 192 Q46 192 45 188 Z" fill={`url(#${id}-paper)`} />

      {/* sleeve */}
      <g clipPath={`url(#${id}-body)`}>
        <rect x="20" y="96" width="120" height="52" fill={`url(#${id}-sleeve)`} />
        {kind === "honeycomb" ? (
          <g fill="none" stroke={t.sleeveInk} strokeOpacity="0.35" strokeWidth="1.3">
            {[0, 1, 2, 3, 4, 5].map((col) =>
              [0, 1, 2].map((row) => {
                const x = 38 + col * 17 + (row % 2) * 8.5;
                const y = 104 + row * 15;
                return (
                  <path
                    key={`${col}-${row}`}
                    d={`M${x} ${y - 7} l6 3.5 v7 l-6 3.5 l-6 -3.5 v-7 z`}
                  />
                );
              }),
            )}
          </g>
        ) : null}
        {kind === "northwoods" ? (
          <g fill={t.sleeveInk} opacity="0.9">
            <path d="M80 104 L90 122 L85 122 L94 136 L66 136 L75 122 L70 122 Z" />
            <rect x="78" y="136" width="4" height="6" />
            <path d="M58 116 L64 128 L61 128 L66 138 L50 138 L55 128 L52 128 Z" opacity="0.7" />
            <path d="M102 116 L108 128 L105 128 L110 138 L94 138 L99 128 L96 128 Z" opacity="0.7" />
          </g>
        ) : null}
        {kind === "shine" ? (
          <g>
            <rect x="20" y="103" width="120" height="2" fill={t.sleeveInk} opacity="0.7" />
            <rect x="20" y="139" width="120" height="2" fill={t.sleeveInk} opacity="0.7" />
            <g fill={t.sleeveInk}>
              <path d="M80 111 L83 119 L91 122 L83 125 L80 133 L77 125 L69 122 L77 119 Z" />
            </g>
          </g>
        ) : null}
        {/* the right side falls into shade */}
        <path d="M112 44 L129 44 L115 192 L104 192 Z" fill="#2f3528" opacity="0.06" />
      </g>

      {/* rim */}
      <rect x="26" y="37" width="108" height="10" rx="5" fill="#fbfaf7" stroke="#e1dbcf" strokeWidth="1" />

      {/* what sits on top */}
      {kind === "northwoods" ? (
        <g>
          <ellipse cx="80" cy="40" rx="50" ry="8" fill={t.foamShade} />
          <path d="M40 40 Q40 22 58 22 Q60 10 80 10 Q100 10 102 22 Q120 22 120 40 Z" fill={`url(#${id}-foam)`} />
          <path d="M48 36 Q60 28 80 30 Q100 28 112 36" fill="none" stroke={t.foamShade} strokeWidth="1.5" />
          <path d="M58 24 Q70 18 80 20 Q92 18 102 24" fill="none" stroke={t.foamShade} strokeWidth="1.5" />
          <path
            d="M46 34 L56 24 L62 32 L70 18 L78 28 L86 14 L92 26 L100 18 L106 30 L114 26"
            fill="none"
            stroke="#b8742a"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : (
        <g>
          <ellipse cx="80" cy="40" rx="51" ry="9" fill={t.foamShade} />
          <path d="M31 41 Q34 25 80 24 Q126 25 129 41 Q110 47 80 47 Q50 47 31 41 Z" fill={`url(#${id}-foam)`} />
          {kind === "shine" ? (
            <g>
              {[
                [56, 34, 1.6], [64, 30, 1.1], [72, 36, 1.4], [84, 29, 1.8], [92, 35, 1.2],
                [100, 31, 1.5], [108, 37, 1.1], [76, 32, 0.9], [60, 38, 1.0], [96, 39, 0.9],
              ].map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#d4a53c" />
              ))}
              <path d="M88 16 L90 22 L96 24 L90 26 L88 32 L86 26 L80 24 L86 22 Z" fill="#e8bf55" />
              <path d="M66 18 L67 21 L70 22 L67 23 L66 26 L65 23 L62 22 L65 21 Z" fill="#e8bf55" />
            </g>
          ) : (
            <path
              d="M44 36 Q54 28 62 36 T80 34 T98 36 T116 34"
              fill="none"
              stroke="#d99a1e"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          )}
        </g>
      )}
    </svg>
  );
}
