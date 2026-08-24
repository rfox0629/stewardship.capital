import type { CSSProperties } from "react";

const delay = (value: string) => ({ "--sc-delay": value }) as CSSProperties;

/**
 * The Entrusted System.
 *
 * Three strands enter separately, converge into one path, and open outward
 * into impact. Every other diagram on the site is a view of this drawing.
 */
export function StrandField() {
  return (
    <svg
      className="sc-strand-field"
      viewBox="0 0 1200 620"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Three strands labelled time, talent, and treasure converge into a single path that opens outward into impact."
    >
      <defs>
        <radialGradient id="sc-field-glow" cx="59%" cy="50%" r="46%">
          <stop offset="0%" stopColor="#b98a34" stopOpacity="0.16" />
          <stop offset="70%" stopColor="#b98a34" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sc-trunk" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#2a6b53" />
          <stop offset="55%" stopColor="#6b7c53" />
          <stop offset="100%" stopColor="#b98a34" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="1200" height="620" fill="url(#sc-field-glow)" />

      <g className="sc-field-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <line
            key={index}
            x1={0}
            x2={1200}
            y1={40 + index * 90}
            y2={40 + index * 90}
          />
        ))}
      </g>

      <g className="sc-field-strands" fill="none" strokeLinecap="round">
        <path
          className="sc-draw" pathLength={1}
          data-strand="time"
          style={delay("0.05s")}
          stroke="var(--sc-time)"
          strokeWidth="2.4"
          d="M -20 96 C 200 96, 420 128, 560 240 C 632 296, 660 310, 704 310"
        />
        <path
          className="sc-draw" pathLength={1}
          data-strand="talent"
          style={delay("0.2s")}
          stroke="var(--sc-talent)"
          strokeWidth="2.4"
          d="M -20 310 C 190 310, 400 306, 704 310"
        />
        <path
          className="sc-draw" pathLength={1}
          data-strand="treasure"
          style={delay("0.35s")}
          stroke="var(--sc-treasure)"
          strokeWidth="2.4"
          d="M -20 524 C 200 524, 420 492, 560 380 C 632 324, 660 310, 704 310"
        />

        <path
          className="sc-draw sc-trunk" pathLength={1}
          style={delay("0.75s")}
          stroke="url(#sc-trunk)"
          strokeWidth="4.2"
          d="M 704 310 H 892"
        />

        <g className="sc-field-impact" stroke="var(--sc-treasure)" strokeWidth="1.5">
          <path
            className="sc-draw" pathLength={1}
            style={delay("0.95s")}
            d="M 892 310 C 970 310, 1010 246, 1220 202"
          />
          <path
            className="sc-draw" pathLength={1}
            style={delay("1.02s")}
            d="M 892 310 C 970 310, 1020 288, 1220 278"
          />
          <path
            className="sc-draw" pathLength={1}
            style={delay("1.09s")}
            d="M 892 310 C 970 310, 1020 334, 1220 358"
          />
          <path
            className="sc-draw" pathLength={1}
            style={delay("1.16s")}
            d="M 892 310 C 970 310, 1010 378, 1220 438"
          />
        </g>
      </g>

      <g className="sc-field-nodes" aria-hidden="true">
        <circle className="sc-node" style={delay("0.5s")} cx="182" cy="96" r="4" fill="var(--sc-time)" />
        <circle className="sc-node" style={delay("0.6s")} cx="182" cy="310" r="4" fill="var(--sc-talent)" />
        <circle className="sc-node" style={delay("0.7s")} cx="182" cy="524" r="4" fill="var(--sc-treasure)" />
        <circle className="sc-node sc-node-hub" style={delay("0.8s")} cx="704" cy="310" r="9" />
        <circle className="sc-node" style={delay("1.25s")} cx="892" cy="310" r="5" fill="var(--sc-treasure)" />
      </g>

      <g className="sc-field-labels" aria-hidden="true">
        <text className="sc-node-label" style={delay("0.9s")} x="182" y="72" textAnchor="middle">
          Time
        </text>
        <text className="sc-node-label" style={delay("0.98s")} x="182" y="286" textAnchor="middle">
          Talent
        </text>
        <text className="sc-node-label" style={delay("1.06s")} x="182" y="562" textAnchor="middle">
          Treasure
        </text>
        <text className="sc-node-label sc-node-label-hub" style={delay("1.3s")} x="704" y="272" textAnchor="middle">
          One trust
        </text>
      </g>
    </svg>
  );
}
